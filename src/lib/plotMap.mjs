// Pure helpers behind the image-based plot map (contract "plotmap/1", addendum
// section 12). Plain .mjs so `node --test` covers them without React or a DOM.
//
// WHY a second normalisePlotNumber: layoutTools.mjs already has one, but the
// legacy tests pin its behaviour (it deletes stray characters, so "12.5"
// becomes "125" and collides with plot 125). The new contract returns null for
// any character outside A-Z 0-9 / - and distinguishes "absent" ('') from
// "invalid" (null). Plot-map code imports only this copy; the backend and
// mobile each keep their own copy and all three run the shared fixture.
import { safeHttpUrl } from './vcard.mjs';

// ── Plot numbers ────────────────────────────────────────────────────────────

/**
 * null = invalid, '' = absent, any other string = the normalised number.
 * @param {unknown} raw @returns {string | null}
 */
export function normalisePlotNumber(raw) {
  if (raw === null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (trimmed === '') return '';
  const s = trimmed.toUpperCase().replace(/\s+/g, '');
  // Errata 6: reject instead of deleting, so "12.5" never merges with "125".
  if (/[^A-Z0-9/-]/.test(s)) return null;
  if (s.length > 20) return null;
  return s;
}

/** Natural order: 2 before 10, 12 before 12A. @param {string} a @param {string} b */
export function naturalCompare(a, b) {
  const re = /(\d+|\D+)/g;
  const pa = String(a).match(re) || [];
  const pb = String(b).match(re) || [];
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === y) continue;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return Number(x) - Number(y) || x.length - y.length;
    return x < y ? -1 : 1;
  }
  return pa.length - pb.length;
}

/**
 * Exact matches first, then prefix matches; plots only; natural order.
 * Generic over the element type so a caller with `PlotMapPlot[]` gets
 * `PlotMapPlot[]` back (not the narrow inferred `{ number, kind }` shape).
 * @template {{ id: string; number?: string | null; kind?: string }} T
 * @param {T[]} plots @param {string} query
 * @returns {T[]}
 */
export function searchPlots(plots, query) {
  const q = normalisePlotNumber(query);
  if (!q) return [];
  const exact = [];
  const prefix = [];
  for (const p of plots) {
    if (p.kind !== 'plot') continue;
    const n = normalisePlotNumber(p.number);
    if (!n) continue;
    if (n === q) exact.push({ p, n });
    else if (n.startsWith(q)) prefix.push({ p, n });
  }
  const byNumber = (a, b) => naturalCompare(a.n, b.n);
  return [...exact.sort(byNumber), ...prefix.sort(byNumber)].map((x) => x.p);
}

// ── Sheets (multi-sheet layouts, fixtureVersion 5) ──────────────────────────
// Previous behaviour: a layout was one image with every plot drawn on it. Now a
// layout has 1..N sheets and each plot carries `sheet` (its idx). A payload
// fetched without `?sheets=1`, or a legacy layout, has no `sheets` array: it is
// read as one virtual sheet 0 so single-sheet screens look exactly as before.

/**
 * Sheets of a payload, ordered by idx. Always at least one.
 * @param {{ sheets?: any[]; image?: any; counts?: any } | null | undefined} payload
 * @returns {{ idx: number; name: string; image: any; counts?: any }[]}
 */
export function sheetsOf(payload) {
  if (Array.isArray(payload?.sheets) && payload.sheets.length > 0) {
    return [...payload.sheets].sort((a, b) => a.idx - b.idx);
  }
  return [{ idx: 0, name: 'Sheet 1', image: payload?.image, counts: payload?.counts }];
}

/** Plots drawn on one sheet; a plot without `sheet` is on sheet 0. @template {{ sheet?: number }} T @param {T[]} plots @param {number} idx @returns {T[]} */
export function plotsForSheet(plots, idx) {
  return (plots || []).filter((p) => (p.sheet ?? 0) === idx);
}

/** Sheet idx of a plot id, or null when unknown. @param {{ id: string; sheet?: number }[]} plots @param {string} plotId */
export function sheetOfPlot(plots, plotId) {
  const p = (plots || []).find((x) => x.id === plotId);
  return p ? (p.sheet ?? 0) : null;
}

/**
 * Search across ALL sheets: exact number matches first, then prefix matches,
 * plots only; each group ordered by (sheet, natural number). A hit carries the
 * sheet so the viewer switches tab before focusing the plot.
 * @param {{ id: string; kind?: string; number?: string | null; sheet?: number }[]} plots
 * @param {string} query
 * @returns {{ plotId: string; sheet: number }[]}
 */
export function searchAcrossSheets(plots, query) {
  const q = normalisePlotNumber(query);
  if (!q) return [];
  const exact = [];
  const prefix = [];
  for (const p of plots) {
    if (p.kind !== 'plot') continue;
    const n = normalisePlotNumber(p.number);
    if (!n) continue;
    const hit = { plotId: p.id, sheet: p.sheet ?? 0, n };
    if (n === q) exact.push(hit);
    else if (n.startsWith(q)) prefix.push(hit);
  }
  const order = (a, b) => a.sheet - b.sheet || naturalCompare(a.n, b.n);
  return [...exact.sort(order), ...prefix.sort(order)].map(({ plotId, sheet }) => ({ plotId, sheet }));
}

const SHEET_COPY = {
  duplicate: 'Plot {n} do sheet mein hai ({sheetA}, {sheetB}). Ek ka number badlo.',
  failedBlocker: '{count} sheet nahi ban payi. Dobara try karo ya us sheet ko hata do.',
  tooMany: 'Ek project mein {max} se zyada sheets nahi ho sakti.',
  state: { queued: 'Line mein hai', generating: 'Ban rahi hai', done: 'Taiyaar', failed: 'Nahi ban payi' },
};
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k]));

/** @param {string} n @param {string} sheetA @param {string} sheetB */
export function duplicateMessage(n, sheetA, sheetB) { return fill(SHEET_COPY.duplicate, { n, sheetA, sheetB }); }
/** @param {number} count */
export function failedSheetsText(count) { return fill(SHEET_COPY.failedBlocker, { count }); }
/** @param {number} max */
export function tooManySheetsText(max) { return fill(SHEET_COPY.tooMany, { max }); }
/** @param {string} state */
export function sheetStateText(state) { return SHEET_COPY.state[/** @type {keyof typeof SHEET_COPY.state} */ (state)] || String(state); }

/**
 * For each plot flagged dup_number, the sheet that holds the same number, so
 * the owner sees "Plot 12 do sheet mein hai (Sheet 1, Phase 2)" and can rename.
 * Only a cross-sheet clash is returned: an in-sheet clash keeps the existing
 * "Number do baar aaya" flag text.
 * @param {{ id: string; kind?: string; number?: string | null; sheet?: number; flags?: string[] }[]} plots
 * @param {{ idx: number; name: string }[]} sheets
 * @returns {{ plotId: string; number: string; sheet: number; otherSheet: number; text: string }[]}
 */
export function crossSheetDuplicates(plots, sheets) {
  const nameOf = (idx) => (sheets || []).find((s) => s.idx === idx)?.name ?? `Sheet ${idx + 1}`;
  const holders = new Map();
  for (const p of plots) {
    if (p.kind !== 'plot' || (p.flags || []).includes('dup_number')) continue;
    const n = normalisePlotNumber(p.number);
    if (n && !holders.has(n)) holders.set(n, p.sheet ?? 0);
  }
  const out = [];
  for (const p of plots) {
    if (p.kind !== 'plot' || !(p.flags || []).includes('dup_number')) continue;
    const n = normalisePlotNumber(p.number);
    if (!n || !holders.has(n)) continue;
    const mine = p.sheet ?? 0;
    const other = holders.get(n);
    if (other === mine) continue;
    out.push({ plotId: p.id, number: n, sheet: mine, otherSheet: other, text: duplicateMessage(n, nameOf(other), nameOf(mine)) });
  }
  return out;
}

// ── Status text and colour ──────────────────────────────────────────────────

/** Public/broker see two values, the owner side sees four. @param {string} status @param {string} [role] */
export function statusLabel(status, role) {
  if (role === 'owner_side') {
    if (status === 'available') return 'Available';
    if (status === 'booked') return 'Booked';
    if (status === 'sold') return 'Sold';
    if (status === 'on-hold') return 'On hold';
    return String(status);
  }
  return status === 'available' ? 'Available' : 'Booked / Sold';
}

// Status is never colour alone: every status also has a text badge (statusLabel)
// and `pattern`, which the SVG draws as hatch (booked/sold) or dots (on-hold).
export const STATUS_STYLE = {
  available: { fill: '#16a34a', stroke: '#166534', pattern: 'none' },
  booked: { fill: '#dc2626', stroke: '#991b1b', pattern: 'hatch' },
  sold: { fill: '#7f1d1d', stroke: '#450a0a', pattern: 'hatch' },
  'on-hold': { fill: '#d97706', stroke: '#92400e', pattern: 'dots' },
};
export const NON_PLOT_STYLE = { fill: '#9ca3af', stroke: '#6b7280', pattern: 'none' };

/** @param {string | undefined} status */
export function styleForStatus(status) {
  return STATUS_STYLE[/** @type {keyof typeof STATUS_STYLE} */ (status)] || STATUS_STYLE.booked;
}

/**
 * Legend counts from the plots actually on screen (a poll can change them
 * between full payloads, so the payload's own `counts` would go stale).
 * @param {{ kind?: string; status?: string }[]} plots
 */
export function countStatuses(plots) {
  const c = { plots: 0, available: 0, booked: 0, sold: 0, onHold: 0 };
  for (const p of plots) {
    if (p.kind !== 'plot') continue;
    c.plots += 1;
    if (p.status === 'available') c.available += 1;
    else if (p.status === 'sold') c.sold += 1;
    else if (p.status === 'on-hold') c.onHold += 1;
    else c.booked += 1;
  }
  return c;
}

// ── Geometry ────────────────────────────────────────────────────────────────

/** Shoelace area, absolute. @param {[number, number][]} poly */
export function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** @param {[number, number][]} poly @param {number} x @param {number} y */
export function pointInPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance in rendered pixels from a point to the nearest polygon edge. */
function edgeDistancePx(poly, x, y, w, h) {
  let best = Infinity;
  const px = x * w;
  const py = y * h;
  for (let i = 0; i < poly.length; i++) {
    const ax = poly[i][0] * w;
    const ay = poly[i][1] * h;
    const bx = poly[(i + 1) % poly.length][0] * w;
    const by = poly[(i + 1) % poly.length][1] * h;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return best;
}

/**
 * A point inside a polygon wins (smallest area when several); otherwise the
 * polygon with the smallest edge distance in RENDERED pixels if <= slopPx; else
 * null. Returns the plot id of any kind; the UI decides what a tap on a road does.
 * @param {{ id: string; poly: [number, number][] }[]} plots
 * @param {number} x @param {number} y normalised 0..1
 * @param {{ widthPx: number; heightPx: number; slopPx?: number }} o
 */
export function hitTest(plots, x, y, o) {
  const slop = o.slopPx ?? 12;
  let inside = null;
  let insideArea = Infinity;
  for (const p of plots) {
    if (!pointInPoly(p.poly, x, y)) continue;
    const a = polyArea(p.poly);
    if (a < insideArea) { inside = p; insideArea = a; }
  }
  if (inside) return inside.id;
  let near = null;
  let nearD = Infinity;
  for (const p of plots) {
    const d = edgeDistancePx(p.poly, x, y, o.widthPx, o.heightPx);
    if (d <= slop && d < nearD) { near = p; nearD = d; }
  }
  return near ? near.id : null;
}

// ── Zoom / pan ──────────────────────────────────────────────────────────────
// The stage fills the viewport and CSS applies translate(tx,ty) scale(s) with
// origin 0 0. Inside it the image is letter-boxed (object-fit: contain), so a
// normalised point (u,v) sits at (ox + u*cw, oy + v*ch) before the transform.

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

/** Image rect letter-boxed into the viewport. @param {{w:number;h:number}} view @param {{w:number;h:number}} img */
export function fitRect(view, img) {
  if (!(view.w > 0 && view.h > 0 && img.w > 0 && img.h > 0)) return { ox: 0, oy: 0, cw: view.w, ch: view.h };
  const s = Math.min(view.w / img.w, view.h / img.h);
  const cw = img.w * s;
  const ch = img.h * s;
  return { ox: (view.w - cw) / 2, oy: (view.h - ch) / 2, cw, ch };
}

/**
 * Keep scale in 1..8 and keep at least 20 % of the image inside the viewport.
 * At scale 1 the image is always centred.
 * @param {{scale:number;tx:number;ty:number}} t
 * @param {{w:number;h:number}} view @param {{ox:number;oy:number;cw:number;ch:number}} fit
 */
export function clampTransform(t, view, fit) {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.isFinite(t.scale) ? t.scale : 1));
  if (scale <= MIN_SCALE) return { scale: MIN_SCALE, tx: 0, ty: 0 };
  const clampAxis = (v, offset, size, viewSize) => {
    const margin = 0.2 * Math.min(size * scale, viewSize);
    const lo = margin - (offset + size) * scale;      // right edge of the image at `margin`
    const hi = viewSize - margin - offset * scale;    // left edge of the image at `viewSize - margin`
    return Math.min(hi, Math.max(lo, v));
  };
  return {
    scale,
    tx: clampAxis(t.tx, fit.ox, fit.cw, view.w),
    ty: clampAxis(t.ty, fit.oy, fit.ch, view.h),
  };
}

/** Zoom so that the stage point under `anchor` stays under the pointer. */
export function zoomAround(t, nextScale, anchor, view, fit) {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  const k = scale / t.scale;
  return clampTransform({ scale, tx: anchor.x - (anchor.x - t.tx) * k, ty: anchor.y - (anchor.y - t.ty) * k }, view, fit);
}

/** Viewport pixel -> normalised image coordinates (may fall outside 0..1). */
export function screenToNorm(t, fit, p) {
  const sx = (p.x - t.tx) / t.scale;
  const sy = (p.y - t.ty) / t.scale;
  return { x: (sx - fit.ox) / fit.cw, y: (sy - fit.oy) / fit.ch };
}

/** Transform that puts normalised (u,v) in the middle of the viewport at `scale`. */
export function centerOn(point, scale, view, fit) {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  return clampTransform({
    scale: s,
    tx: view.w / 2 - (fit.ox + point.x * fit.cw) * s,
    ty: view.h / 2 - (fit.oy + point.y * fit.ch) * s,
  }, view, fit);
}

// ── Book button / owner actions ─────────────────────────────────────────────

/**
 * What the plot sheet shows for this viewer. A payload without `viewer` is an
 * anonymous visitor. Rules are evaluated in this order (addendum 12).
 * @param {any} payload @param {string} plotId
 * @returns {{ action: string; enabled: boolean; label: string; ownerActions?: string[] }}
 */
export function bookButtonState(payload, plotId) {
  const plot = (payload?.plots || []).find((p) => p.id === plotId);
  if (!plot) return { action: 'none', enabled: false, label: '' };
  if (plot.kind !== 'plot') return { action: 'none', enabled: false, label: plot.label || '' };
  const viewer = payload.viewer;
  if (viewer?.role === 'owner_side') {
    const owner = (label, ownerActions) => ({ action: 'owner_actions', enabled: true, label, ownerActions });
    if (plot.status === 'available') {
      const n = plot.pendingCount || 0;
      return n > 0
        ? owner(`${n} request pending`, ['review_requests', 'mark_sold'])
        : owner('Sold mark karo', ['mark_sold']);
    }
    if (plot.status === 'booked') return owner('Booked', ['release', 'mark_sold']);
    if (plot.status === 'sold') return owner('Sold', ['release']);
    return owner('On hold', ['release', 'mark_sold']);
  }
  if (viewer?.role === 'broker') {
    const mine = (payload.myRequests || []).filter((r) => r.plotId === plotId);
    if (mine.some((r) => r.status === 'pending')) return { action: 'cancel_request', enabled: true, label: 'Request bhej di · Cancel' };
    if (mine.some((r) => r.status === 'approved')) return { action: 'approved', enabled: false, label: 'Approved ho gaya' };
    if (plot.status !== 'available') return { action: 'unavailable', enabled: false, label: 'Booked / Sold' };
    if (viewer.canRequest === false) return { action: 'not_eligible', enabled: false, label: 'Sirf verified agent request bhej sakte hain' };
    return { action: 'request', enabled: true, label: 'Book request bhejo' };
  }
  if (plot.status === 'available') return { action: 'login_to_book', enabled: true, label: 'Login karo' };
  return { action: 'unavailable', enabled: false, label: 'Booked / Sold' };
}

// ── Check & fix ─────────────────────────────────────────────────────────────

/**
 * Publish blockers of a draft, same shape and order as the server's `blockers`
 * (NO_PLOTS, NO_NUMBER, DUP_NUMBER), so the editor can re-evaluate after each
 * local edit without a round trip.
 * @param {{ id: string; kind?: string; number?: string | null; flags?: string[] }[]} plots
 */
export function publishBlockers(plots, sheets = []) {
  const real = plots.filter((p) => p.kind === 'plot');
  // A failed sheet has no plots, so without SHEET_FAILED a layout with part of
  // the site missing would look publishable (previous single-sheet code had no
  // such state). Order matches the server: plot blockers, then SHEET_FAILED.
  const failed = (sheets || []).filter((s) => s.state === 'failed').map((s) => s.idx).sort((a, b) => a - b);
  const sheetBlock = failed.length ? [{ code: 'SHEET_FAILED', plotIds: [], count: failed.length, sheets: failed }] : [];
  if (real.length === 0) return [{ code: 'NO_PLOTS', plotIds: [], count: 0 }, ...sheetBlock];
  const noNumber = real.filter((p) => !p.number || (p.flags || []).includes('no_number')).map((p) => p.id);
  const dup = real.filter((p) => (p.flags || []).includes('dup_number')).map((p) => p.id);
  const out = [];
  if (noNumber.length) out.push({ code: 'NO_NUMBER', plotIds: noNumber, count: noNumber.length });
  if (dup.length) out.push({ code: 'DUP_NUMBER', plotIds: dup, count: dup.length });
  return [...out, ...sheetBlock];
}

/** LayoutStats from the non-deleted plots of a draft. @param {{ kind?: string; flags?: string[] }[]} plots */
export function draftStats(plots) {
  let cp = 0; let roads = 0; let n = 0; let flagged = 0;
  for (const p of plots) {
    if (p.kind === 'plot') n += 1;
    else if (p.kind === 'cp') cp += 1;
    else if (p.kind === 'road') roads += 1;
    if ((p.flags || []).length) flagged += 1;
  }
  return { plots: n, cp, roads, flagged };
}

/** Flagged plots first, then the rest, each in natural number order. */
export function orderForReview(plots) {
  const key = (p) => normalisePlotNumber(p.number) || p.key || '';
  return plots
    .filter((p) => p.kind === 'plot')
    .sort((a, b) => {
      const fa = (a.flags || []).length > 0 ? 0 : 1;
      const fb = (b.flags || []).length > 0 ? 0 : 1;
      return fa - fb || naturalCompare(key(a), key(b));
    });
}

const FLAG_TEXT = {
  no_number: 'Number nahi mila',
  dup_number: 'Number do baar aaya',
  low_conf: 'Number shayad galat hai',
  tiny: 'Box bahut chhota hai',
  area_outlier: 'Area baaki plots se alag hai',
  approx_geometry: 'Box andaaze se bana hai',
  ocr_vlm_mismatch: 'Number do tareeke se alag aaya',
};
/** @param {string} flag */
export function flagText(flag) { return FLAG_TEXT[/** @type {keyof typeof FLAG_TEXT} */ (flag)] || flag; }

// ── Live updates ────────────────────────────────────────────────────────────

/**
 * Client rules of addendum 8.1 for one poll answer.
 *  - 'none'   : nothing changed
 *  - 'full'   : layout/version differ (publish or regenerate) -> discard and fetch the full payload
 *  - 'repaint': same layout, new statuses -> repaint; `thenFull` asks for one full fetch
 *               (owner side: who booked is not in the poll; broker with an own pending request).
 * @param {{ layoutId: string; version: number; seq: number }} have
 * @param {any} resp @param {{ fullOnChange?: boolean }} [o]
 */
export function decidePoll(have, resp, o = {}) {
  if (!resp || typeof resp !== 'object') return { action: 'none' };
  if (resp.layoutId !== have.layoutId || resp.version !== have.version) return { action: 'full' };
  if (!resp.changed) return { action: 'none' };
  return { action: 'repaint', statuses: resp.statuses || {}, pending: resp.pending, seq: resp.seq, thenFull: !!o.fullOnChange };
}

/**
 * Repaint every plot from a poll's `statuses` map (not a delta). Plots missing
 * from the map keep their status; non-plots are never touched.
 */
export function applyStatuses(plots, statuses, pending) {
  return plots.map((p) => {
    if (p.kind !== 'plot') return p;
    const next = statuses[p.id];
    const out = next && next !== p.status ? { ...p, status: next } : p;
    if (pending !== undefined && 'pendingCount' in out) {
      const n = pending[p.id] || 0;
      return n === (out.pendingCount || 0) ? out : { ...out, pendingCount: n };
    }
    return out;
  });
}

/** Socket `plotmap_status` changes: [{ id, status }]. */
export function applyChanges(plots, changes) {
  const byId = new Map((changes || []).map((c) => [c.id, c.status]));
  return plots.map((p) => (p.kind === 'plot' && byId.has(p.id) && byId.get(p.id) !== p.status ? { ...p, status: byId.get(p.id) } : p));
}

// ── Page metadata and project field ────────────────────────────────────────

/**
 * <title>/Open Graph text for /plots/<slug> from the public payload alone.
 * Description is the city only: the old buildPlotMeta showed "City · Location",
 * but this payload carries no location (errata E-13).
 * @param {{ project?: { name?: string; city?: string }; image?: { url?: string } } | null} payload
 */
export function buildPlotMapMeta(payload, slug = '') {
  void slug;
  const name = String(payload?.project?.name ?? '').trim() || 'Plot layout';
  const city = String(payload?.project?.city ?? '').trim();
  const image = safeHttpUrl(payload?.image?.url) || null;
  return {
    title: `${name} plot layout | HomeInTown`,
    description: city || `Plot layout of ${name} on HomeInTown`,
    image,
    noindex: false,
    twitterCard: /** @type {'summary_large_image' | 'summary'} */ (image ? 'summary_large_image' : 'summary'),
  };
}

/**
 * Project.plotMap as the list needs it. transformBackendToFrontend names every
 * field it keeps, so without this the "Plot Map" action could never see it.
 * @param {any} raw
 */
export function mapPlotMapField(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    enabled: raw.enabled === true,
    // Admin opt-out (E20 {enabled:false}). `enabled` alone cannot say it:
    // false and "never set" looked identical.
    optedOut: raw.enabled === false,
    layoutId: raw.layoutId ? String(raw.layoutId) : null,
  };
}

/**
 * Show the dashboard "Plot Map" action? Previous behaviour: only when
 * plotMap.enabled === true, which the backend never set for new projects, so
 * the button was hidden. Now mirrors the backend: any plot/land project unless
 * an admin opted it out. The backend stays the real gate (it answers 404 if
 * this guess is wrong); this only decides whether the button is drawn.
 * @param {{ type?: string; propertyType?: string; plotMap?: { enabled?: boolean; optedOut?: boolean } } | null | undefined} project
 */
export function showPlotMapAction(project) {
  if (!project) return false;
  if (project.plotMap?.optedOut === true) return false;
  if (project.plotMap?.enabled === true) return true;
  if (String(project.type ?? '').toLowerCase() === 'plot') return true;
  const label = String(project.propertyType ?? '').trim().toLowerCase();
  return /farm\s*land|agricultur|\bplots?\b|\bland\b/.test(label);
}

// ── Error text (Hinglish) ──────────────────────────────────────────────────

const ERROR_TEXT = {
  PLOT_NOT_AVAILABLE: 'Ye plot abhi kisi aur ko allot ho gaya',
  NOT_PENDING: 'Ye request ab pending nahi hai',
  REQUEST_EXPIRED: 'Ye request expire ho chuki hai',
  LAYOUT_PUBLISHING: 'Layout update ho raha hai, thodi der baad dobara try karein',
  LAYOUT_VERSION: 'Layout update ho gaya, refresh karo',
  STATUS_CONFLICT: 'Plot ka status badal chuka hai, refresh karo',
  PUBLISH_BLOCKED: 'Publish se pehle plot numbers theek karein',
  BOOKED_PLOTS_UNMATCHED: 'Booked plots naye layout mein nahi mil rahe',
  DUP_NUMBER: 'Ye number kisi aur plot par pehle se hai',
  INVALID_NUMBER: 'Plot number sahi nahi hai (sirf A-Z, 0-9, / aur -; max 20)',
  ALREADY_RUNNING: 'Is project ka ek layout pehle se ban raha hai ya check hona baaki hai',
  QUOTA: 'Aaj ki layout limit poori ho gayi, kal try karein',
  IMAGE_TOO_SMALL: 'Image bahut chhoti hai (kam se kam 600 px)',
  IMAGE_UNREADABLE: 'Image padhi nahi ja saki, PNG ya JPG mein dobara save karke dein',
  TOO_LARGE: 'File bahut badi hai (max 25 MB)',
  FORBIDDEN: 'Aapko is kaam ka adhikar nahi hai',
  UNAUTHENTICATED: 'Session khatam ho gaya, dobara login karein',
  PLOTMAP_NOT_AVAILABLE: 'Plot map abhi is project ke liye enabled nahi hai',
  NOT_DRAFT: 'Ye layout ab draft nahi hai',
  GENERATOR_NOT_CONFIGURED: 'Layout generator abhi ready nahi hai',
  JOB_START_FAILED: 'Layout shuru nahi ho paya, dobara try karein',
  NOT_PLOT_PROJECT: 'Ye project plot type ka nahi hai',
  FAMILY_CHANGE_BLOCKED: 'Is project ka plot map live hai aur bookings hain, isliye plot se doosri category mein nahi badal sakte.',
  // Callers that know the limit use tooManySheetsText(max) instead.
  TOO_MANY_SHEETS: 'Ek project mein itni zyada sheets nahi ho sakti',
  SHEET_NOT_FOUND: 'Ye sheet ab nahi mili, page refresh karo',
};

/** @param {string | null | undefined} code @param {string} [fallback] */
export function plotmapErrorText(code, fallback = 'Kuch gadbad hui, dobara try karein') {
  return (code && ERROR_TEXT[/** @type {keyof typeof ERROR_TEXT} */ (code)]) || fallback;
}

/** Failure code of a generation run -> Hinglish line for the editor. @param {string | null | undefined} code @param {string} [message] */
export function generationFailureText(code, message) {
  if (code === 'NOT_A_PLOT_LAYOUT' || code === 'NO_PLOTS_FOUND') return 'AI ko is image se plots nahi mile. Image saaf aur seedha hai?';
  if (code === 'TOO_MANY_PLOTS') return message || 'Plots bahut zyada hain. Phase-wise alag layout banao.';
  if (code === 'TIMEOUT') return 'Layout banne mein bahut time lag gaya. Dobara try karein.';
  if (code === 'CANCELLED') return 'Layout banana rok diya gaya.';
  return message || 'Layout nahi ban paya. Dobara try karein.';
}

// ── Notifications ───────────────────────────────────────────────────────────

/**
 * Where tapping a plot-booking notification goes (addendum 11.3); null for any
 * other type or one without a project id.
 * @param {{ type?: string; data?: { projectId?: string; plotId?: string; bookingId?: string } | null }} n
 */
export function plotNotificationHref(n) {
  if (!String(n?.type ?? '').startsWith('plot_booking_') || !n?.data?.projectId) return null;
  const q = [];
  if (n.data.plotId) q.push('plot=' + encodeURIComponent(n.data.plotId));
  if (n.data.bookingId) q.push('booking=' + encodeURIComponent(n.data.bookingId));
  return '/dashboard/projects/' + encodeURIComponent(n.data.projectId) + '/plot-map' + (q.length ? '?' + q.join('&') : '');
}