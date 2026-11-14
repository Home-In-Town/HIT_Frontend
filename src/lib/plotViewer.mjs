// Pure helpers behind the homeintown.in Public_Plot_Page (/plots/<slug>,
// design 3.2, R9, R21.3, R21.7). Plain .mjs so `node --test` covers them in
// bare Node. The overlay maths is NOT here: PublicOverlayLayer imports the one
// shared transform from layoutTools.mjs.
//
// Ported from the homeintown.ai plot viewer (read only, D16): centroid,
// bounds and the status palette. Its login, session and status-edit helpers
// are deliberately not ported (D11): this page is read-only.
//
// Phase 2 (R19.4–19.16): area formatting, price line, WhatsApp text and
// searchPlots are added here. normalisePlotNumber is imported from layoutTools.mjs
// (design §3.4: one normalisation function, no duplicate implementation).

import { safeHttpUrl } from './vcard.mjs';
import { normalisePlotNumber } from './layoutTools.mjs';

export const PLOTS_ORIGIN = 'https://homeintown.in';

/**
 * Decode and check a route slug (design 3.2): non-empty, at most 200
 * characters, no `/`, `\` or control characters. null = invalid (the page
 * answers 404 before it calls the API).
 * @param {unknown} raw @returns {string | null}
 */
export function parsePlotSlug(raw) {
  let s;
  try {
    s = decodeURIComponent(String(raw ?? ''));
  } catch {
    return null; // malformed %-escape
  }
  if (!s || s.length > 200) return null;
  if (/[\\/\u0000-\u001f\u007f]/.test(s)) return null;
  return s;
}

/** @param {string} slug */
export function plotPageUrl(slug) {
  return `${PLOTS_ORIGIN}/plots/${encodeURIComponent(slug)}`;
}

/**
 * Which overlay image to show (R21.3, R21.7). Start from the Preview_Copy and
 * switch to the sharper image once one preview pixel covers more than one
 * device pixel (`zoomRatio > 1`). The web sharper image is the full
 * `image.url`, or the Detail_Copy on low-memory browsers (`deviceMemory < 4`).
 * The mobile platform never takes the full image unless both copies are null.
 *
 * Fallbacks: preview fails -> the sharper image; sharper fails -> keep the
 * preview; both fail -> unavailable. A legacy overlay (both copies null) has
 * only `image.url`.
 *
 * @param {{
 *   platform?: 'web' | 'mobile';
 *   deviceMemory?: number | null;
 *   zoomRatio?: number;
 *   urls: { image: string | null; preview: string | null; detail: string | null };
 *   failures?: { preview?: boolean; detail?: boolean; image?: boolean };
 * }} a
 * @returns {{ url: string | null; kind: 'preview' | 'detail' | 'image' | null; unavailable: boolean }}
 */
export function chooseOverlayImage(a) {
  const { urls } = a;
  const f = a.failures || {};
  const platform = a.platform || 'web';
  const lowMem = typeof a.deviceMemory === 'number' && a.deviceMemory < 4;
  const zoomedIn = Number(a.zoomRatio) > 1;

  /** @type {{ url: string; kind: 'preview' | 'detail' | 'image' }[]} */
  const pool = [];
  const add = (kind, url, failed) => { if (url && !failed) pool.push({ kind, url }); };

  // Legacy: no copies, the full image is the only image (today's behaviour).
  if (!urls.preview && !urls.detail) {
    add('image', urls.image, f.image);
    return pool.length ? { ...pool[0], unavailable: false } : { url: null, kind: null, unavailable: true };
  }

  // The sharper candidates in preference order.
  /** @type {['detail' | 'image', string | null, boolean | undefined][]} */
  const sharper = platform === 'mobile'
    ? [['detail', urls.detail, f.detail]]
    : lowMem
      ? [['detail', urls.detail, f.detail], ['image', urls.image, f.image]]
      : [['image', urls.image, f.image], ['detail', urls.detail, f.detail]];
  const firstSharper = () => {
    for (const [kind, url, failed] of sharper) if (url && !failed) return { kind, url };
    return null;
  };

  const previewOk = !!urls.preview && !f.preview;
  if (zoomedIn) {
    const s = firstSharper();
    if (s) return { ...s, unavailable: false };          // sharper wins when zoomed in
    if (previewOk) return { url: urls.preview, kind: 'preview', unavailable: false }; // sharper failed: keep preview
    return { url: null, kind: null, unavailable: true };
  }
  if (previewOk) return { url: urls.preview, kind: 'preview', unavailable: false };
  const s = firstSharper();                               // preview failed: go straight to the sharper image
  return s ? { ...s, unavailable: false } : { url: null, kind: null, unavailable: true };
}

/**
 * Page metadata for /plots/<slug> (R9.20, R9.21). `layout` is the public
 * layout or null (unknown / unpublished slug).
 * @param {any} layout @param {string} [slug]
 * @returns {{
 *   title: string; description: string; canonical: string | null; image: string | null;
 *   noindex: boolean; twitterCard: 'summary_large_image' | 'summary';
 * }}
 */
export function buildPlotMeta(layout, slug = '') {
  const unavailable = {
    title: 'Layout not available | HomeInTown',
    description: 'This plot layout is not available.',
    canonical: null,
    image: null,
    noindex: true,
    twitterCard: /** @type {const} */ ('summary'),
  };
  if (!layout || !layout.overlay) return unavailable;

  const name = String(layout.projectName ?? '').trim() || 'Plot layout';
  const place = [layout.city, layout.location].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ');
  const image = safeHttpUrl(layout.overlay.previewUrl) || safeHttpUrl(layout.media?.coverImage) || null;
  const s = String(layout.slug || slug || '');
  return {
    title: `${name} plot layout | HomeInTown`,
    description: place || `Plot layout of ${name} on HomeInTown`,
    canonical: s ? plotPageUrl(s) : null,
    image,
    noindex: false,
    twitterCard: image ? 'summary_large_image' : 'summary',
  };
}

// ── Plot geometry used by the viewer (ported from plotGeometry.mjs) ───────

/** @param {any} p */
const isPoint = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/**
 * Area-weighted polygon centroid; vertex mean for degenerate rings. null for an empty path.
 * @param {{ lat: number; lng: number }[] | null | undefined} path
 */
export function centroid(path) {
  let pts = (path || []).filter(isPoint);
  if (pts.length > 1 && pts[0].lat === pts[pts.length - 1].lat && pts[0].lng === pts[pts.length - 1].lng) pts = pts.slice(0, -1);
  if (!pts.length) return null;
  const mean = { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
  if (pts.length < 3) return mean;
  let a = 0; let cx = 0; let cy = 0;
  const lat0 = pts[0].lat; const lng0 = pts[0].lng;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i]; const q = pts[(i + 1) % pts.length];
    const x1 = p.lng - lng0; const y1 = p.lat - lat0; const x2 = q.lng - lng0; const y2 = q.lat - lat0;
    const cross = x1 * y2 - x2 * y1;
    a += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < 1e-18) return mean;
  return { lat: lat0 + cy / (3 * a), lng: lng0 + cx / (3 * a) };
}

/**
 * Bounds that contain the overlay corners and every plot, for the first fit.
 * @param {{ overlay?: { corners?: { lat: number; lng: number }[] } | null; plots?: { path: { lat: number; lng: number }[] }[] }} layout
 * @returns {{ south: number; west: number; north: number; east: number } | null}
 */
export function boundsForLayout(layout) {
  /** @type {{ lat: number; lng: number }[]} */
  const pts = [];
  for (const c of layout.overlay?.corners || []) if (isPoint(c)) pts.push(c);
  if (!pts.length) for (const p of layout.plots || []) for (const q of p.path || []) if (isPoint(q)) pts.push(q);
  if (!pts.length) return null;
  let south = Infinity; let north = -Infinity; let west = Infinity; let east = -Infinity;
  for (const p of pts) {
    south = Math.min(south, p.lat); north = Math.max(north, p.lat);
    west = Math.min(west, p.lng); east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}

/**
 * Client refetch of the public layout through the same-origin `/api` rewrite
 * (R9.10, R9.11). 404 -> notfound (no retry offered); a network error, a 5xx or
 * no answer in `timeoutMs` (15 s) -> error (Retry offered). Never throws.
 * @param {string} slug
 * @param {{ timeoutMs?: number; fetchImpl?: typeof fetch; base?: string }} [o]
 * @returns {Promise<{ kind: 'ok'; layout: any } | { kind: 'notfound' } | { kind: 'error'; status?: number }>}
 */
export async function fetchPublicLayout(slug, o = {}) {
  const { timeoutMs = 15000, fetchImpl = globalThis.fetch, base = '/api' } = o;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${base}/public/projects/${encodeURIComponent(slug)}/layout`, { signal: ctrl.signal });
    if (res.status === 404) return { kind: 'notfound' };
    if (!res.ok) return { kind: 'error', status: res.status };
    return { kind: 'ok', layout: await res.json() };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

// ── Phase 2: Area, price, WhatsApp text and search (R19.4–19.16) ─────────
//
// WHY these are here and not in layoutTools.mjs: they depend on the PUBLIC
// layout shape (plot.areaSqm, layout.priceMode, layout.cta) which is specific to
// the viewer, whereas layoutTools.mjs is shared with the editor and mobile.
//
// Finding 9 (design-review MEDIUM): the backend `toPublicPlot` function in
// PlotLayoutService.js (line 548) renames the internal `e.area` field to
// `areaSqm` in the public response:
//   `areaSqm: isFiniteNumber(e.area) && e.area > 0 ? e.area : null`
// So the public API returns `plot.areaSqm`, not `plot.area`. All helpers read
// `plot.areaSqm` throughout. Any reference to `plot.area` in an older comment
// or draft was wrong and has been corrected here.

export const SQFT_PER_SQM = 10.7639;

/**
 * Area in sq ft from m², 2 decimal places.
 * Returns null for ≤0, null, undefined or non-finite input (R19.5: missing
 * lines must not render at all, never as "0 sq ft" or "NaN sq ft").
 * Also returns null when the computed value rounds to 0.00 (very small area).
 * @param {number | null | undefined} areaSqm
 * @returns {string | null}
 */
export function formatAreaSqFt(areaSqm) {
  const v = Number(areaSqm);
  if (!Number.isFinite(v) || v <= 0) return null;
  const sqft = v * SQFT_PER_SQM;
  if (sqft < 0.005) return null; // rounds to 0.00 sq ft → hide
  return sqft.toFixed(2) + ' sq ft';
}

/**
 * Area in m², 2 decimal places.
 * Returns null for ≤0, null, undefined or non-finite (same reasoning as above).
 * Also returns null when the value rounds to 0.00.
 * @param {number | null | undefined} areaSqm
 * @returns {string | null}
 */
export function formatAreaSqM(areaSqm) {
  const v = Number(areaSqm);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v < 0.005) return null; // rounds to 0.00 m² → hide
  return v.toFixed(2) + ' m²';
}

/**
 * Price line for a plot (R19.11, R19.12, R19.14, R19.16).
 *   per-plot:  plot.price > 0 → '₹ X' (Indian locale, no "indicative").
 *   per-sqft:  layout.pricePerSqFt > 0 AND areaSqft > 0 → '₹ X (indicative)'.
 *   hidden:    null.
 *   any other missing value: null.
 * Never returns a string containing 'undefined', 'null', 'NaN' or '0 sq ft'.
 *
 * Finding HIGH-4 (design-review): areaSqft is derived here from plot.areaSqm
 * (the backend public field name, confirmed in PlotLayoutService.toPublicPlot).
 * Formula: areaSqft = (plot.areaSqm ?? 0) * 10.7639.
 *
 * B8/B9 do NOT update layoutVersion — price updates do not go through the
 * Layout_Version CAS, so we never update the editor's layoutVersion after them.
 *
 * @param {{ areaSqm?: number | null; price?: number | null; [k: string]: any }} plot
 * @param {{ priceMode?: string | null; pricePerSqFt?: number | null; [k: string]: any }} layout
 * @returns {string | null}
 */
export function formatPriceLine(plot, layout) {
  const priceMode = layout && layout.priceMode;
  if (priceMode === 'per-plot') {
    const price = Number(plot && plot.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return '₹ ' + price.toLocaleString('en-IN');
  }
  if (priceMode === 'per-sqft') {
    const ppsf = Number(layout && layout.pricePerSqFt);
    const areaSqft = (Number(plot && plot.areaSqm) || 0) * SQFT_PER_SQM;
    if (!Number.isFinite(ppsf) || ppsf <= 0) return null;
    if (!Number.isFinite(areaSqft) || areaSqft <= 0) return null;
    const total = ppsf * areaSqft;
    return '₹ ' + Math.round(total).toLocaleString('en-IN') + ' (indicative)';
  }
  return null; // 'hidden' or unknown
}

/**
 * Hinglish WhatsApp enquiry text (R19.8). The EXACT format per the spec:
 * 'Namaste, mujhe <Project> ka Plot <No> ke baare me jaankari chahiye.'
 * @param {string} projectName
 * @param {string} plotNumber
 * @returns {string}
 */
export function formatWhatsAppText(projectName, plotNumber) {
  return `Namaste, mujhe ${projectName} ka Plot ${plotNumber} ke baare me jaankari chahiye.`;
}

/**
 * All panel lines for a plot (R19.4, R19.5). Missing fields are `null`,
 * never `undefined`, never 'undefined' / 'null' / 'NaN' / '0 sq ft'.
 *
 * WHY this function: the component renders nothing for null lines (R19.5).
 * Returning null instead of a formatted zero or missing value means the UI
 * never shows a meaningless line, without the component having to do extra
 * null checks for each field.
 *
 * @param {{ id: string; plotNumber?: string | null; status?: string | null; facing?: string | null; areaSqm?: number | null; price?: number | null; unit?: any; [k: string]: any }} plot
 * @param {{ projectName?: string | null; priceMode?: string | null; pricePerSqFt?: number | null; cta?: { whatsappNumber?: string | null; callNumber?: string | null } | null; [k: string]: any }} layout
 * @returns {{ number: string | null; status: string | null; facing: string | null; areaSqFt: string | null; areaSqM: string | null; priceLine: string | null; unitCorner: string | null; unitDimensions: string | null; whatsapp: string | null }}
 */
export function formatPanelLines(plot, layout) {
  const plotNumber = String(plot.plotNumber ?? '').trim() || null;
  const statusRaw = String(plot.status ?? '').trim();
  const status = statusRaw || null;
  const facing = plot.facing ? String(plot.facing).trim() || null : null;
  const areaSqFt = formatAreaSqFt(plot.areaSqm);
  const areaSqM = formatAreaSqM(plot.areaSqm);
  const priceLine = formatPriceLine(plot, layout);

  let unitCorner = null;
  let unitDimensions = null;
  if (plot.unit) {
    const corner = plot.unit.corner ? String(plot.unit.corner).trim() : null;
    unitCorner = corner || null;
    const dim = plot.unit.dimensions ? String(plot.unit.dimensions).trim() : null;
    unitDimensions = dim || null;
  }

  const projectName = String(layout && layout.projectName ? layout.projectName : '').trim();
  const whatsapp = plotNumber && projectName
    ? formatWhatsAppText(projectName, plotNumber)
    : null;

  return { number: plotNumber, status, facing, areaSqFt, areaSqM, priceLine, unitCorner, unitDimensions, whatsapp };
}

/**
 * Search plots by normalised plot number prefix (R19.12, R19.14).
 * Finding MEDIUM-7 (design-review): whitespace-only query returns [] via
 * normalisePlotNumber(query.trim()) guard — if the result is empty or null,
 * the function returns [] immediately without iterating plots.
 * @param {{ plotNumber?: string | null; [k: string]: any }[]} plots
 * @param {string} query
 * @returns {typeof plots}
 */
export function searchPlots(plots, query) {
  const q = normalisePlotNumber((query ?? '').trim());
  if (!q) return []; // empty string or null (all-stripped input) → no results
  return plots.filter((p) => {
    const n = normalisePlotNumber(String(p.plotNumber ?? ''));
    return n && n.startsWith(q);
  });
}
