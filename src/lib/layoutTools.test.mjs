// node --test src/lib/layoutTools.test.mjs
//
// The overlayGeometry / palette cases mirror homeintown.ai
// src/lib/plotGeometry.test.mjs so the editor places the overlay where the
// viewers draw it. The rest covers editor-only logic (drag/scale/keyboard
// maths, save payload, unit range prefill, feedback text).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlotColor, PLOT_STATUS_COLORS, normalizePlotStatus, OPEN_SPACE_CATEGORIES, cleanOpenSpaceLabel,
  overlayGeometry, normalizeBearing, offsetCenter, screenToLocal, moveOverlay, resizeOverlay, nudgeOverlay,
  pathExtentM, initialOverlayDraft, clampOpacity, overlaySavePayload, overlayResetRestoreBody,
  unitRangePrefill, validateUnitRange, plotStatusFeedback, PLOT_NO_PERMISSION, layoutSaveErrorMessage,
} from './layoutTools.mjs';

const M_PER_DEG_LAT = (Math.PI / 180) * 6371008.8;
const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) < tol, `${msg || ''} expected ${expected} ±${tol}, got ${actual}`);

// Shared fixture (spec contract): 16 m E-W x 9 m N-S in Nagpur.
const RECT_16x9 = [
  { lat: 21.1458, lng: 79.0882 },
  { lat: 21.1458, lng: 79.08835428 },
  { lat: 21.14588094, lng: 79.08835428 },
  { lat: 21.14588094, lng: 79.0882 },
];
const PID = '6720a1b2c3d4e5f601234567';
const draft = (over = {}) => ({
  image: { url: 'https://x/o.png', key: `projects/${PID}/overlay/o.png` },
  center: { lat: 21.14584, lng: 79.08828 },
  widthM: 120, heightM: 80, rotationDeg: 0, opacity: 0.85,
  ...over,
});

describe('palette', () => {
  test('available green, booked + sold red, on-hold yellow (was available blue, sold green)', () => {
    assert.equal(getPlotColor('available'), '#22c55e');
    assert.equal(getPlotColor('booked'), '#ef4444');
    assert.equal(getPlotColor('sold'), '#ef4444');
    assert.equal(getPlotColor('on-hold'), '#eab308');
    assert.notEqual(getPlotColor('available'), '#3b82f6');
  });
  test('missing / unknown status reads as available', () => {
    assert.equal(getPlotColor(undefined), PLOT_STATUS_COLORS.available);
    assert.equal(getPlotColor(''), PLOT_STATUS_COLORS.available);
    assert.equal(normalizePlotStatus('weird'), 'available');
  });
});

describe('open space', () => {
  test('categories match the backend enum', () => {
    assert.deepEqual(OPEN_SPACE_CATEGORIES.map((c) => c.value), ['park', 'clubhouse', 'temple', 'amenity', 'open-space', 'other']);
  });
  test('label capped at 80 chars (server limit)', () => {
    assert.equal(cleanOpenSpaceLabel('x'.repeat(100)).length, 80);
    assert.equal(cleanOpenSpaceLabel(null), '');
  });
});

describe('overlayGeometry (same as viewers)', () => {
  const center = { lat: 21.14584, lng: 79.08828 };
  const spanM = (pts) => {
    const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
    const k = M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
    return { ns: (Math.max(...lats) - Math.min(...lats)) * M_PER_DEG_LAT, ew: (Math.max(...lngs) - Math.min(...lngs)) * k };
  };
  test('0°: corners NW,NE,SE,SW on the bounds, 120 x 80 m', () => {
    const g = overlayGeometry({ center, widthM: 120, heightM: 80, rotationDeg: 0 });
    near(g.corners[0].lat, g.bounds.north, 1e-10);
    near(g.corners[0].lng, g.bounds.west, 1e-10);
    near(g.corners[2].lat, g.bounds.south, 1e-10);
    const s = spanM(g.corners);
    near(s.ew, 120, 1e-3);
    near(s.ns, 80, 1e-3);
  });
  test('90°: corners swap, bounds stay UNROTATED, clockwise', () => {
    const g = overlayGeometry({ center, widthM: 120, heightM: 80, rotationDeg: 90 });
    const s = spanM(g.corners);
    near(s.ew, 80, 1e-3);
    near(s.ns, 120, 1e-3);
    const b = spanM([{ lat: g.bounds.south, lng: g.bounds.west }, { lat: g.bounds.north, lng: g.bounds.east }]);
    near(b.ew, 120, 1e-3);
    assert.ok(g.corners[0].lng > center.lng && g.corners[0].lat > center.lat);
  });
  test('bearing normalised to [0, 360)', () => {
    near(overlayGeometry({ center, widthM: 1, heightM: 1, rotationDeg: 370 }).bearing, 10, 1e-9);
    assert.equal(normalizeBearing(-90), 270);
    assert.equal(normalizeBearing(NaN), 0);
  });
});

describe('drag / scale maths', () => {
  test('offsetCenter moves by metres', () => {
    const c = { lat: 21.1458, lng: 79.0882 };
    const o = offsetCenter(c, 16, 9);
    near((o.lat - c.lat) * M_PER_DEG_LAT, 9, 1e-6);
    near((o.lng - c.lng) * M_PER_DEG_LAT * Math.cos((c.lat * Math.PI) / 180), 16, 1e-6);
  });
  test('screenToLocal undoes the CSS rotation', () => {
    const l = screenToLocal(10, 0, 90); // screen right on a 90° image = image "up" (-y)
    near(l.x, 0, 1e-9);
    near(l.y, -10, 1e-9);
    const z = screenToLocal(3, 4, 0);
    assert.deepEqual(z, { x: 3, y: 4 });
  });
  test('moveOverlay: drag down 100 px at 0.5 m/px = 50 m SOUTH', () => {
    const d = draft();
    const m = moveOverlay(d, 0, 100, 0.5);
    near((d.center.lat - m.center.lat) * M_PER_DEG_LAT, 50, 1e-6);
    near(m.center.lng, d.center.lng, 1e-12);
    assert.equal(m.widthM, 120);
  });
  test('resizeOverlay unlocked grows each side by 2x the handle move', () => {
    const r = resizeOverlay(draft(), 10, 5, 1, false);
    near(r.widthM, 140, 1e-9);
    near(r.heightM, 90, 1e-9);
  });
  test('resizeOverlay locked keeps the aspect ratio', () => {
    const r = resizeOverlay(draft(), 30, 0, 1, true);
    near(r.widthM / r.heightM, 1.5, 1e-9);
    assert.ok(r.widthM > 120);
  });
  test('resizeOverlay respects rotation and clamps to [1, 5000]', () => {
    // 90° clockwise: the image's +x (its width) points screen-DOWN, so a
    // downward handle drag grows the width and leaves the height alone.
    const r = resizeOverlay(draft({ rotationDeg: 90 }), 0, 10, 1, false);
    near(r.widthM, 140, 1e-9);
    near(r.heightM, 80, 1e-9);
    assert.equal(resizeOverlay(draft(), -1000, -1000, 1, false).widthM, 1);
    const big = resizeOverlay(draft(), 1e6, 1e6, 1, true);
    assert.ok(big.widthM <= 5000 && big.heightM <= 5000);
    near(big.widthM / big.heightM, 1.5, 1e-9);
  });
  test('nudgeOverlay: arrows, scale, rotate, unknown key', () => {
    const d = draft();
    near((nudgeOverlay(d, 'ArrowUp', false).center.lat - d.center.lat) * M_PER_DEG_LAT, 1, 1e-6);
    near((d.center.lat - nudgeOverlay(d, 'ArrowDown', true).center.lat) * M_PER_DEG_LAT, 10, 1e-6);
    near(nudgeOverlay(d, '+', false).widthM, 121.2, 1e-9); // R4.7: +/- is 1 %
    near(nudgeOverlay(d, '-', false).heightM, 79.2, 1e-9);
    assert.equal(nudgeOverlay(d, '[', false).rotationDeg, 359.9); // R4.7: [ ] are 0.1 deg
    assert.equal(nudgeOverlay(d, ']', true).rotationDeg, 1);
    assert.equal(nudgeOverlay(d, '{', false).rotationDeg, 359); // { } are 1 deg
    assert.equal(nudgeOverlay(d, '}', false).rotationDeg, 1);
    assert.equal(nudgeOverlay(d, '}', true).rotationDeg, 10);
    assert.equal(nudgeOverlay(d, 'a', false), null);
  });
});

describe('initialOverlayDraft', () => {
  const image = { url: 'u', key: `projects/${PID}/overlay/n.png` };
  test('keeps a saved overlay position when only the picture changes', () => {
    const d = initialOverlayDraft({ existing: { center: { lat: 1, lng: 2 }, widthM: 50, heightM: 30, rotationDeg: 370, opacity: 0.5 }, image });
    assert.deepEqual(d.center, { lat: 1, lng: 2 });
    assert.equal(d.widthM, 50);
    near(d.rotationDeg, 10, 1e-9);
    assert.equal(d.opacity, 0.5);
    assert.equal(d.image, image);
  });
  test('fresh: centred on the boundary, boundary width, image aspect', () => {
    const d = initialOverlayDraft({ image, boundaryPath: RECT_16x9, aspect: 0.5 });
    near(d.center.lat, 21.14584047, 5e-8);
    near(d.widthM, 16, 0.05);
    near(d.heightM, 8, 0.05);
    assert.equal(d.opacity, 0.85);
    assert.equal(d.rotationDeg, 0);
  });
  test('no boundary: project pin, 200 m on the longest side (R5.5); nothing: null', () => {
    const d = initialOverlayDraft({ image, fallbackCenter: { lat: 21, lng: 79 }, aspect: 2 });
    assert.equal(d.widthM, 100);
    assert.equal(d.heightM, 200);
    assert.equal(initialOverlayDraft({ image }), null);
  });
  test('pathExtentM measures the fixture', () => {
    const e = pathExtentM(RECT_16x9);
    near(e.widthM, 16, 0.05);
    near(e.heightM, 9, 0.05);
    assert.equal(pathExtentM([]), null);
  });
  test('clampOpacity', () => {
    assert.equal(clampOpacity(undefined), 0.85);
    assert.equal(clampOpacity(2), 1);
    assert.equal(clampOpacity(-1), 0);
    assert.equal(clampOpacity('0.3'), 0.3);
  });
});

describe('overlaySavePayload', () => {
  test('sends key only (no url), rounded, rotation normalised', () => {
    const r = overlaySavePayload(draft({ widthM: 120.123456, rotationDeg: -10 }), PID);
    assert.equal(r.ok, true);
    assert.deepEqual(r.body.image, { key: `projects/${PID}/overlay/o.png` });
    assert.equal(r.body.widthM, 120.12);
    assert.equal(r.body.rotationDeg, 350);
    assert.equal('url' in r.body.image, false);
  });
  test('rejects missing image, foreign key, .., bad size / opacity / centre', () => {
    assert.equal(overlaySavePayload(null, PID).ok, false);
    assert.equal(overlaySavePayload(draft({ image: { url: 'u', key: 'projects/OTHER/overlay/o.png' } }), PID).ok, false);
    assert.equal(overlaySavePayload(draft({ image: { url: 'u', key: `projects/${PID}/../x.png` } }), PID).ok, false);
    assert.equal(overlaySavePayload(draft({ widthM: 0.5 }), PID).ok, false);
    assert.equal(overlaySavePayload(draft({ heightM: 6000 }), PID).ok, false);
    assert.equal(overlaySavePayload(draft({ opacity: 1.5 }), PID).ok, false);
    assert.equal(overlaySavePayload(draft({ center: { lat: NaN, lng: 1 } }), PID).ok, false);
  });
});

describe('overlayResetRestoreBody', () => {
  const saved = draft({ rotationDeg: 12 });
  test('replacement image: PUT the saved key + saved placement back', () => {
    const replaced = draft({ image: { url: 'https://x/new.png', key: `projects/${PID}/overlay/new.png` }, heightM: 60 });
    const body = overlayResetRestoreBody(replaced, saved, PID);
    assert.deepEqual(body, overlaySavePayload(saved, PID).body);
    assert.equal(body.image.key, `projects/${PID}/overlay/o.png`);
    assert.equal(body.rotationDeg, 12);
  });
  test('same image, only placement moved: nothing to undo on the server', () => {
    assert.equal(overlayResetRestoreBody(draft({ widthM: 300 }), saved, PID), null);
  });
  test('no saved overlay or no draft: nothing to restore', () => {
    assert.equal(overlayResetRestoreBody(draft(), null, PID), null);
    assert.equal(overlayResetRestoreBody(null, saved, PID), null);
  });
});

describe('unitRangePrefill', () => {
  const plot = (n, extra = {}) => ({ type: 'subplot', plotNumber: n, saved: true, ...extra });
  test('min..max of saved, non-deleted numeric plots; gaps counted', () => {
    const r = unitRangePrefill([plot('12'), plot('16'), plot('14'), plot('13'), plot('99', { deleted: true }), plot('50', { saved: false }), { type: 'road', plotNumber: '1', saved: true }]);
    assert.equal(r.from, 12);
    assert.equal(r.to, 16);
    assert.equal(r.plotCount, 4);
    assert.equal(r.numericCount, 4);
    assert.equal(r.missing, 1); // 15
  });
  test('non-numeric and leading-zero numbers are reported, duplicates found', () => {
    const r = unitRangePrefill([plot('A-1'), plot('07'), plot(' 3 '), plot('3'), plot('')]);
    assert.deepEqual(r.nonNumeric, ['A-1', '07']);
    assert.deepEqual(r.duplicates, ['3']);
    assert.equal(r.from, 3);
    assert.equal(r.to, 3);
  });
  test('no numeric plots → null range', () => {
    const r = unitRangePrefill([plot('A')]);
    assert.equal(r.from, null);
    assert.equal(r.to, null);
  });
  test('validateUnitRange follows generatePlotUnits rules', () => {
    assert.equal(validateUnitRange(1, 120), null);
    assert.ok(validateUnitRange(0, 5));
    assert.ok(validateUnitRange(5, 4));
    assert.ok(validateUnitRange(1.5, 4));
    assert.ok(validateUnitRange(1, 10000));
    assert.ok(validateUnitRange(1, 2001));
    assert.equal(validateUnitRange(1, 2000), null);
  });
});

describe('feedback', () => {
  test('plotStatusFeedback success / no-op', () => {
    assert.deepEqual(plotStatusFeedback({ ok: true, changed: true, plotNumber: '12', status: 'sold' }),
      { kind: 'success', message: 'Plot 12: Sold save ho gaya', reload: false });
    assert.equal(plotStatusFeedback({ ok: true, changed: false, plotNumber: '12', status: 'sold' }).kind, 'info');
  });
  test('403 fixed text, 409/404 reload, other server message', () => {
    assert.equal(plotStatusFeedback({ ok: false, httpStatus: 403, serverMessage: 'You do not have permission' }).message, PLOT_NO_PERMISSION);
    const c = plotStatusFeedback({ ok: false, httpStatus: 409, serverMessage: 'Plot changed while saving, reload and try again' });
    assert.equal(c.reload, true);
    assert.equal(c.message, 'Plot changed while saving, reload and try again');
    assert.equal(plotStatusFeedback({ ok: false, httpStatus: 404, plotNumber: '3' }).reload, true);
    assert.equal(plotStatusFeedback({ ok: false, httpStatus: 500, serverMessage: 'boom' }).message, 'boom');
    assert.equal(plotStatusFeedback({ ok: false, httpStatus: 0 }).reload, false);
  });
  test('layoutSaveErrorMessage: 409 says reload, 400 shows the shape index', () => {
    assert.match(layoutSaveErrorMessage(409, 'Layout changed while saving, reload and try again'), /reload/);
    assert.match(layoutSaveErrorMessage(400, 'path needs 3 points', 4), /shape #5/);
    assert.match(layoutSaveErrorMessage(500, null), /server/);
  });
});
