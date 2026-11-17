// node --test src/lib/plotMap.test.mjs
// Runs the shared contract fixture (addendum 12) against the web copy of the
// pure plot-map helpers, plus the zoom/pan, poll and editor helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  normalisePlotNumber, searchPlots, hitTest, bookButtonState, statusLabel, publishBlockers, draftStats,
  orderForReview, countStatuses, buildPlotMapMeta, mapPlotMapField, showPlotMapAction, decidePoll, applyStatuses, applyChanges,
  fitRect, clampTransform, zoomAround, screenToNorm, centerOn, naturalCompare, plotmapErrorText,
  generationFailureText, flagText, styleForStatus, plotNotificationHref,
  sheetsOf, plotsForSheet, sheetOfPlot, searchAcrossSheets, duplicateMessage, failedSheetsText, tooManySheetsText,
  sheetStateText, crossSheetDuplicates,
} from './plotMap.mjs';

// The master fixture is kept byte-identical across repos (sha256 pinned below).
// The BOM strip is only a guard for a copy saved by a Windows editor. JSON import needs import
// attributes, which this repo's node does not need to depend on.
const fx = JSON.parse(readFileSync(new URL('./__fixtures__/plot-map-fixture.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const P = fx.payloads;
const payloadFor = (viewer) => (viewer === 'anonymous' || viewer === 'public' ? P.public : P[viewer]);

// ── fixture: normalise ──
test('normalisePlotNumber follows the fixture cases', () => {
  for (const c of fx.normalise.cases) {
    const input = c.inputRepeat ? c.inputRepeat.char.repeat(c.inputRepeat.count) : c.input;
    const expected = c.expectedRepeat ? c.expectedRepeat.char.repeat(c.expectedRepeat.count) : c.expected;
    assert.equal(normalisePlotNumber(input), expected, `input ${JSON.stringify(input)}`);
  }
});

test('normalisePlotNumber: undefined is absent, numbers are stringified', () => {
  assert.equal(normalisePlotNumber(undefined), '');
  assert.equal(normalisePlotNumber(12), '12');
});

// ── fixture: search / hitTest / bookButtonState ──
test('searchPlots follows the fixture cases', () => {
  const plots = P.public.plots;
  for (const c of fx.search.cases) {
    assert.deepEqual(searchPlots(plots, c.query).map((p) => p.id), c.expected, `query ${JSON.stringify(c.query)}`);
  }
});

test('searchPlots ignores non-plots and orders naturally', () => {
  const plots = [
    { id: 'a', kind: 'plot', number: '10' },
    { id: 'b', kind: 'plot', number: '2' },
    { id: 'c', kind: 'plot', number: '1' },
    { id: 'd', kind: 'cp', number: '1' },
    { id: 'e', kind: 'plot', number: '12A' },
  ];
  assert.deepEqual(searchPlots(plots, '1').map((p) => p.id), ['c', 'a', 'e']);
  assert.deepEqual(naturalCompare('2', '10') < 0, true);
});

test('hitTest follows the fixture cases', () => {
  const o = { widthPx: fx.hitTest.renderedWidthPx, heightPx: fx.hitTest.renderedHeightPx, slopPx: fx.hitTest.slopPx };
  for (const c of fx.hitTest.cases) {
    assert.equal(hitTest(P.public.plots, c.x, c.y, o), c.expected, `(${c.x}, ${c.y})`);
  }
});

test('hitTest: the smallest polygon wins when several contain the point', () => {
  const plots = [
    { id: 'big', poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    { id: 'small', poly: [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]] },
  ];
  assert.equal(hitTest(plots, 0.5, 0.5, { widthPx: 100, heightPx: 100 }), 'small');
});

// KNOWN FIXTURE DEFECT: the master fixture stores the middle dot of "Request
// bhej di · Cancel" twice-mojibaked (U+00C3 U+201A U+00C2 U+00B7). The label the
// contract means has the plain dot, so undo that one corruption before comparing.
// Remove this when the master is fixed and re-copied.
const unmojibake = (s) => (typeof s === 'string' ? s.replace(/\u00c3\u201a\u00c2\u00b7/g, '\u00b7') : s);
test('bookButtonState follows the fixture cases', () => {
  for (const c of fx.bookButtonCases) {
    const expected = { ...c.expected, label: unmojibake(c.expected.label) };
    assert.deepEqual(bookButtonState(payloadFor(c.viewer), c.plot), expected, `${c.viewer} / ${c.plot}`);
  }
});

test('bookButtonState: unknown plot is a disabled no-op', () => {
  assert.deepEqual(bookButtonState(P.public, 'nope'), { action: 'none', enabled: false, label: '' });
});

test('statusLabel: two words for everyone but the owner side', () => {
  assert.equal(statusLabel('sold', 'broker'), 'Booked / Sold');
  assert.equal(statusLabel('booked'), 'Booked / Sold');
  assert.equal(statusLabel('available'), 'Available');
  assert.equal(statusLabel('sold', 'owner_side'), 'Sold');
  assert.equal(statusLabel('on-hold', 'owner_side'), 'On hold');
});

test('every wire status has a style and the two public statuses differ in pattern', () => {
  for (const s of fx.wireStatus.ownerSide) assert.ok(styleForStatus(s).fill);
  assert.notEqual(styleForStatus('available').pattern, styleForStatus('booked').pattern);
});

test('countStatuses counts plots only and matches the fixture counts', () => {
  const c = countStatuses(P.public.plots);
  assert.equal(c.plots, P.public.counts.plots);
  assert.equal(c.available, P.public.counts.available);
  assert.equal(c.booked, P.public.counts.booked);
  const o = countStatuses(P.ownerSide.plots);
  assert.equal(o.sold, P.ownerSide.counts.sold);
  assert.equal(o.onHold, P.ownerSide.counts.onHold);
});

// ── public allowlist: the web page must never be handed a forbidden key ──
test('the public payload carries no forbidden key anywhere', () => {
  const forbidden = new Set(fx.publicAllowlist.forbiddenKeysAnywhere);
  const seen = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (forbidden.has(k)) seen.push(`${path}.${k}`);
        walk(x, `${path}.${k}`);
      }
    }
  };
  walk(P.public, 'public');
  assert.deepEqual(seen, []);
});

// ── draft review ──
test('publishBlockers reproduces the server blockers of the draft fixture', () => {
  const { response } = fx.ownerDraftReview;
  assert.deepEqual(publishBlockers(response.plots), response.blockers);
});

test('publishBlockers: NO_PLOTS for an empty draft, nothing for a clean one', () => {
  assert.deepEqual(publishBlockers([]), [{ code: 'NO_PLOTS', plotIds: [], count: 0 }]);
  assert.deepEqual(publishBlockers([{ id: '1', kind: 'plot', number: '1', flags: ['low_conf'] }]), []);
  assert.deepEqual(publishBlockers([{ id: '1', kind: 'cp', number: null, flags: [] }]), [{ code: 'NO_PLOTS', plotIds: [], count: 0 }]);
});

test('draftStats equals the live layout.stats of the draft fixture', () => {
  const { response } = fx.ownerDraftReview;
  assert.deepEqual(draftStats(response.plots), response.layout.stats);
});

test('orderForReview puts flagged plots first', () => {
  const ids = orderForReview(fx.ownerDraftReview.response.plots).map((p) => p.key);
  assert.deepEqual(ids, ['p2', 'p4', 'p3', 'p1']);
});

test('flagText has Hinglish text for every flag', () => {
  for (const f of ['no_number', 'dup_number', 'low_conf', 'tiny', 'area_outlier', 'approx_geometry', 'ocr_vlm_mismatch']) {
    assert.notEqual(flagText(f), f);
  }
  assert.equal(flagText('weird'), 'weird');
});

// ── poll contract (8.1) ──
test('decidePoll: unchanged', () => {
  const r = fx.statusPoll.unchanged.response;
  assert.deepEqual(decidePoll({ layoutId: r.layoutId, version: r.version, seq: 7 }, r), { action: 'none' });
});

test('decidePoll: changed public repaints without a full fetch', () => {
  const r = fx.statusPoll.changedPublic.response;
  const d = decidePoll({ layoutId: r.layoutId, version: r.version, seq: 5 }, r);
  assert.equal(d.action, 'repaint');
  assert.equal(d.thenFull, false);
  assert.equal(d.seq, 7);
});

test('decidePoll: owner side asks for one full fetch after a repaint', () => {
  const r = fx.statusPoll.changedOwner.response;
  const d = decidePoll({ layoutId: r.layoutId, version: r.version, seq: 5 }, r, { fullOnChange: true });
  assert.equal(d.action, 'repaint');
  assert.equal(d.thenFull, true);
  assert.deepEqual(d.pending, { '64f000000000000000001002': 2 });
});

test('decidePoll: a new layoutId or version discards local state and ignores statuses', () => {
  const r = fx.statusPoll.versionBump.response;
  assert.deepEqual(decidePoll({ layoutId: '64f0000000000000000000a1', version: 3, seq: 7 }, r), { action: 'full' });
  assert.deepEqual(decidePoll({ layoutId: r.layoutId, version: 3, seq: 7 }, r), { action: 'full' });
});

test('applyStatuses repaints from the poll statuses and equals the fixture payloads', () => {
  const pub = fx.statusPoll.changedPublic.response.statuses;
  const stale = P.public.plots.map((p) => (p.kind === 'plot' ? { ...p, status: 'available' } : p));
  const painted = applyStatuses(stale, pub);
  for (const p of painted.filter((x) => x.kind === 'plot')) assert.equal(p.status, pub[p.id]);
  // the fixture statuses must equal the payload they describe
  for (const p of P.public.plots.filter((x) => x.kind === 'plot')) assert.equal(pub[p.id], p.status);
  const own = fx.statusPoll.changedOwner.response;
  const ownPainted = applyStatuses(P.ownerSide.plots, own.statuses, own.pending);
  for (const p of ownPainted.filter((x) => x.kind === 'plot')) assert.equal(own.statuses[p.id], p.status);
  assert.equal(ownPainted.find((p) => p.id === '64f000000000000000001002').pendingCount, 2);
});

test('applyStatuses leaves non-plots and unknown ids alone', () => {
  const plots = [{ id: 'a', kind: 'road', label: 'x' }, { id: 'b', kind: 'plot', status: 'available' }];
  assert.deepEqual(applyStatuses(plots, { a: 'booked' }), plots);
});

test('applyChanges applies a socket delta', () => {
  const ev = fx.socketEvents.plotmap_status.payload;
  const out = applyChanges(P.public.plots, ev.changes);
  assert.equal(out.find((p) => p.id === ev.changes[0].id).status, 'booked');
  assert.equal(applyChanges(P.public.plots, []).length, P.public.plots.length);
});

// ── zoom / pan ──
const VIEW = { w: 1000, h: 700 };
const FIT = fitRect(VIEW, { w: 2000, h: 1400 });

test('fitRect letter-boxes the image', () => {
  const r = fitRect({ w: 1000, h: 1000 }, { w: 2000, h: 1000 });
  assert.deepEqual(r, { ox: 0, oy: 250, cw: 1000, ch: 500 });
  assert.deepEqual(FIT, { ox: 0, oy: 0, cw: 1000, ch: 700 });
});

test('clampTransform: scale 1..8 and centred at scale 1', () => {
  assert.deepEqual(clampTransform({ scale: 0.2, tx: 50, ty: 50 }, VIEW, FIT), { scale: 1, tx: 0, ty: 0 });
  assert.equal(clampTransform({ scale: 99, tx: 0, ty: 0 }, VIEW, FIT).scale, 8);
  assert.equal(clampTransform({ scale: Number.NaN, tx: 0, ty: 0 }, VIEW, FIT).scale, 1);
});

test('clampTransform keeps at least part of the image on screen', () => {
  const far = clampTransform({ scale: 4, tx: 100000, ty: -100000 }, VIEW, FIT);
  assert.ok(far.tx <= VIEW.w - 0.2 * VIEW.w);
  assert.ok(far.ty + 4 * (FIT.oy + FIT.ch) >= 0.2 * Math.min(4 * FIT.ch, VIEW.h) - 1e-9);
});

test('zoomAround keeps the anchor point fixed', () => {
  const t0 = { scale: 1, tx: 0, ty: 0 };
  const anchor = { x: 300, y: 200 };
  const before = screenToNorm(t0, FIT, anchor);
  const t1 = zoomAround(t0, 3, anchor, VIEW, FIT);
  const after = screenToNorm(t1, FIT, anchor);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
  assert.equal(t1.scale, 3);
});

test('screenToNorm maps the viewport corners at scale 1', () => {
  const t = { scale: 1, tx: 0, ty: 0 };
  assert.deepEqual(screenToNorm(t, FIT, { x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(screenToNorm(t, FIT, { x: 1000, y: 700 }), { x: 1, y: 1 });
});

test('centerOn puts the point in the middle of the viewport', () => {
  const t = centerOn({ x: 0.5, y: 0.5 }, 4, VIEW, FIT);
  const mid = screenToNorm(t, FIT, { x: VIEW.w / 2, y: VIEW.h / 2 });
  assert.ok(Math.abs(mid.x - 0.5) < 1e-9 && Math.abs(mid.y - 0.5) < 1e-9);
});

// ── meta / project field ──
test('buildPlotMapMeta follows the fixture cases', () => {
  for (const c of fx.publicMeta.cases) {
    const payload = { ...P[c.input.payload], ...(c.input.projectOverride ? { project: c.input.projectOverride } : {}) };
    assert.deepEqual(buildPlotMapMeta(payload, c.input.slug), c.expected);
  }
});

test('buildPlotMapMeta: unsafe image URL gives a summary card', () => {
  const m = buildPlotMapMeta({ project: { name: 'X', city: '' }, image: { url: 'javascript:alert(1)' } });
  assert.equal(m.image, null);
  assert.equal(m.twitterCard, 'summary');
});

test('mapPlotMapField keeps enabled/layoutId and nothing else', () => {
  assert.deepEqual(mapPlotMapField({ enabled: true, layoutId: 'abc', publishLockAt: 'x' }), { enabled: true, optedOut: false, layoutId: 'abc' });
  assert.equal(mapPlotMapField(undefined), undefined);
  assert.equal(mapPlotMapField(null), undefined);
  assert.deepEqual(mapPlotMapField({ enabled: 'yes', layoutId: null }), { enabled: false, optedOut: false, layoutId: null });
  assert.equal(mapPlotMapField({ enabled: false }).optedOut, true);
});

test('showPlotMapAction: plot projects on by default, opt-out hides, flats hidden', () => {
  assert.equal(showPlotMapAction({ type: 'plot', propertyType: 'Farm Land' }), true);
  assert.equal(showPlotMapAction({ type: 'flat', propertyType: 'Farm Land' }), true);
  assert.equal(showPlotMapAction({ type: 'plot', propertyType: '' }), true);
  assert.equal(showPlotMapAction({ type: 'flat', propertyType: 'Residential Plot', plotMap: { enabled: true, optedOut: false, layoutId: null } }), true);
  assert.equal(showPlotMapAction({ type: 'plot', plotMap: { enabled: false, optedOut: true, layoutId: null } }), false);
  assert.equal(showPlotMapAction({ type: 'flat', propertyType: 'Apartment / Flat' }), false);
  assert.equal(showPlotMapAction({ type: 'flat', propertyType: 'Farm House' }), false);
  assert.equal(showPlotMapAction(undefined), false);
});

// ── copy ──
test('every error code of the contract that a screen can hit has Hinglish text', () => {
  for (const code of ['PLOT_NOT_AVAILABLE', 'NOT_PENDING', 'REQUEST_EXPIRED', 'LAYOUT_PUBLISHING', 'LAYOUT_VERSION', 'STATUS_CONFLICT',
    'PUBLISH_BLOCKED', 'BOOKED_PLOTS_UNMATCHED', 'ALREADY_RUNNING', 'QUOTA', 'IMAGE_TOO_SMALL', 'IMAGE_UNREADABLE', 'TOO_LARGE',
    'PLOTMAP_NOT_AVAILABLE', 'FORBIDDEN', 'UNAUTHENTICATED']) {
    assert.ok(plotmapErrorText(code) !== plotmapErrorText('SOMETHING_ELSE'), code);
    assert.ok(Object.values(fx.errorCodes).flat().includes(code), `${code} is in the contract`);
  }
  assert.equal(plotmapErrorText(undefined, 'x'), 'x');
});

test('generationFailureText', () => {
  assert.match(generationFailureText('NO_PLOTS_FOUND'), /plots nahi mile/);
  assert.equal(generationFailureText('TOO_MANY_PLOTS', 'Phase-wise alag layout banao'), 'Phase-wise alag layout banao');
  assert.match(generationFailureText('SOMETHING', undefined), /Dobara try/);
});

// ── notifications ──
test('plotNotificationHref deep-links every fixture notification to the plot map', () => {
  for (const n of fx.notifications) {
    const href = plotNotificationHref({ type: n.type, data: n.data });
    assert.equal(href, '/dashboard/projects/' + n.data.projectId + '/plot-map?plot=' + n.data.plotId + '&booking=' + n.data.bookingId, n.event);
  }
});

test('plotNotificationHref: other types and missing project have no link', () => {
  assert.equal(plotNotificationHref({ type: 'system', data: { projectId: 'x' } }), null);
  assert.equal(plotNotificationHref({ type: 'plot_booking_request', data: {} }), null);
  assert.equal(plotNotificationHref({ type: 'plot_booking_request', data: null }), null);
});

// ── sheets (fixtureVersion 5) ──
const SP = fx.sheetPayloads;

test('sheetsOf reads the sheets array, orders by idx, and falls back to one virtual sheet', () => {
  assert.deepEqual(sheetsOf(SP.public).map((s) => [s.idx, s.name]), [[0, 'Sheet 1'], [1, 'Phase 2'], [2, 'Phase 3']]);
  assert.equal(sheetsOf({ ...SP.public, sheets: [{ idx: 2, name: 'b' }, { idx: 0, name: 'a' }] })[0].name, 'a');
  // legacy layout / old payload without ?sheets=1: exactly one sheet with the top-level image
  const legacy = sheetsOf(P.public);
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].idx, 0);
  assert.deepEqual(legacy[0].image, P.public.image);
  assert.equal(sheetsOf(null).length, 1);
});

test('plotsForSheet / sheetOfPlot split the multi-sheet fixture', () => {
  const plots = SP.public.plots;
  assert.equal(plotsForSheet(plots, 0).length, 8);
  assert.equal(plotsForSheet(plots, 1).length, 3);
  assert.equal(plotsForSheet(plots, 2).length, 1);
  // a legacy plot without `sheet` is on sheet 0
  assert.equal(plotsForSheet([{ id: 'x' }], 0).length, 1);
  assert.equal(sheetOfPlot(plots, '64f000000000000000001111'), 2);
  assert.equal(sheetOfPlot(plots, 'nope'), null);
  // per-sheet plot counts equal the fixture sheet counts
  for (const s of SP.public.sheets) assert.equal(countStatuses(plotsForSheet(plots, s.idx)).plots, s.counts.plots);
});

test('searchAcrossSheets follows the fixture sheetSearch cases', () => {
  for (const c of fx.sheetSearch.cases) {
    const got = searchAcrossSheets(SP.public.plots, c.query).map((h) => ({ plotId: h.plotId, sheet: h.sheet }));
    assert.deepEqual(got, c.expected, `query ${JSON.stringify(c.query)}`);
  }
});

test('Hinglish sheet copy equals the fixture', () => {
  const c = fx.sheetCopy;
  for (const k of c.duplicateCases) assert.equal(duplicateMessage(k.n, k.sheetA, k.sheetB), k.text);
  for (const k of c.failedBlockerCases) assert.equal(failedSheetsText(k.count), k.text);
  for (const k of c.tooManyCases) assert.equal(tooManySheetsText(k.max), k.text);
  for (const [state, text] of Object.entries(c.state)) assert.equal(sheetStateText(state), text);
});

test('publishBlockers with sheets reproduces the fixture sheetBlockers', () => {
  for (const c of fx.sheetBlockers.cases) assert.deepEqual(publishBlockers(c.plots.map((p) => ({ ...p, number: '1' })), c.sheets), c.expected, c.name);
});

test('publishBlockers: a failed sheet blocks even when the other sheets are clean', () => {
  const out = publishBlockers([{ id: 'a', kind: 'plot', number: '1', flags: [] }], [{ idx: 0, state: 'done' }, { idx: 3, state: 'failed' }]);
  assert.deepEqual(out, [{ code: 'SHEET_FAILED', plotIds: [], count: 1, sheets: [3] }]);
});

test('crossSheetDuplicates names both sheets; an in-sheet clash is not reported', () => {
  const sheets = [{ idx: 0, name: 'Sheet 1' }, { idx: 1, name: 'Phase 2' }];
  const plots = [
    { id: 'a', kind: 'plot', number: '12', sheet: 0, flags: [] },
    { id: 'b', kind: 'plot', number: '12', sheet: 1, flags: ['dup_number'] },
    { id: 'c', kind: 'plot', number: '7', sheet: 1, flags: [] },
    { id: 'd', kind: 'plot', number: '7', sheet: 1, flags: ['dup_number'] },
  ];
  const out = crossSheetDuplicates(plots, sheets);
  assert.deepEqual(out.map((o) => o.plotId), ['b']);
  assert.equal(out[0].text, fx.sheetCopy.duplicateCases[0].text);
  assert.equal(out[0].otherSheet, 0);
});

test('new error codes have Hinglish text', () => {
  assert.notEqual(plotmapErrorText('TOO_MANY_SHEETS'), plotmapErrorText('X'));
  assert.notEqual(plotmapErrorText('SHEET_NOT_FOUND'), plotmapErrorText('X'));
});

test('the multi-sheet public payload carries no forbidden key anywhere and only allowlisted sheet keys', () => {
  const forbidden = new Set(fx.publicAllowlist.forbiddenKeysAnywhere);
  const bad = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (forbidden.has(k)) bad.push(`${path}.${k}`); walk(x, `${path}.${k}`); }
  };
  walk(SP.public, 'public');
  assert.deepEqual(bad, []);
  for (const s of SP.public.sheets) assert.deepEqual(Object.keys(s).sort(), [...fx.publicAllowlist.sheetsMode.sheet].sort());
});

// Cross-repo drift guard: backend, web and mobile pin the same sha256. Edit the
// master fixture, copy it to all three repos and update the three hashes together.
test('shared fixture is the byte-identical master copy', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('./__fixtures__/plot-map-fixture.json', import.meta.url))).digest('hex'), '8c8699a54b553c9b440ad14c28d29f095ee7c77aa504358ab05faee1d563a4ff');
});
// Rendering side of the leak check: the anonymous page never reads a private field.
test('public viewer sources do not reference private booking fields', () => {
  for (const f of ['../components/plotmap/PublicPlotMapViewer.tsx', '../lib/plotmapPublic.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b(bookedBy|requesterSnapshot|requester|phone|email|companyName)\b\s*[:?.]/, f);
  }
});