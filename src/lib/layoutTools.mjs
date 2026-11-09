// Pure helpers behind the Layout Editor tools (open space, overlay align,
// plot status, link/generate units) in
// src/app/dashboard/projects/[id]/layout-editor/page.tsx,
// src/components/public/ProjectMap.tsx and src/components/layout-editor/*.
//
// WHY a plain .mjs: HIT_Frontend has no test framework, and `node --test` runs
// an ES module directly with zero new dependencies. TS callers get types from
// the JSDoc below (tsconfig has allowJs). Keep this file free of React, DOM,
// google.maps and npm imports so the tests run in bare Node.
//
// overlayGeometry / normalizeBearing / the palette are the SAME maths as the
// homeintown.ai viewer (src/lib/plotGeometry.mjs) and HIT_Mobile
// (src/lib/plotLayout.ts). The editor places the image exactly where the
// viewers will draw it, so if a number changes here it must change there too.

/** @typedef {{ lat: number; lng: number }} LatLngLit */
/** @typedef {'available' | 'booked' | 'sold' | 'on-hold'} PlotStatus */
/** @typedef {'park' | 'clubhouse' | 'temple' | 'amenity' | 'open-space' | 'other'} OpenSpaceCategory */
/**
 * Editor-side overlay draft. `image.key` is what the server stores; `url` is
 * only for drawing the <img> (the server rebuilds it from the key on save).
 * @typedef {{
 *   image: { url: string; key: string };
 *   center: LatLngLit;
 *   widthM: number;
 *   heightM: number;
 *   rotationDeg: number;
 *   opacity: number;
 *   preview?: { key: string; url?: string } | null;
 *   detail?: { key: string; url?: string } | null;
 *   imageSize?: { width: number; height: number } | null;
 *   controlPoints?: { u: number; v: number; lat: number; lng: number; role: 'align' | 'check' }[] | null;
 *   sourcePdf?: { key: string; page: number; extraRotationDeg: number } | null;
 * }} OverlayDraft
 */

/** @type {PlotStatus[]} */
export const PLOT_STATUSES = ['available', 'booked', 'sold', 'on-hold'];

/** @type {Record<PlotStatus, string>} */
export const PLOT_STATUS_LABELS = {
  available: 'Available',
  booked: 'Booked',
  sold: 'Sold',
  'on-hold': 'On hold',
};

// Before: available was BLUE #3b82f6 and sold was GREEN #22c55e, so the
// editor showed a sold plot in the colour every viewer (and the boss's
// spacer.land reference) uses for "free to buy". Now one palette everywhere:
// available green, booked + sold red, on-hold yellow.
/** @type {Record<PlotStatus, string>} */
export const PLOT_STATUS_COLORS = {
  available: '#22c55e',
  booked: '#ef4444',
  sold: '#ef4444',
  'on-hold': '#eab308',
};

/** Unknown / missing status reads as available, same as the public API default. @param {unknown} s @returns {PlotStatus} */
export function normalizePlotStatus(s) {
  return /** @type {string[]} */ (PLOT_STATUSES).includes(String(s)) ? /** @type {PlotStatus} */ (s) : 'available';
}

/** @param {unknown} status @returns {string} */
export function getPlotColor(status) {
  return PLOT_STATUS_COLORS[normalizePlotStatus(status)];
}

// ── Open spaces ───────────────────────────────────────────────────────────
// Same enum as the backend schema (models/Project.js layoutEntities.category).

/** @type {{ value: OpenSpaceCategory; label: string }[]} */
export const OPEN_SPACE_CATEGORIES = [
  { value: 'park', label: 'Park / Garden' },
  { value: 'clubhouse', label: 'Clubhouse' },
  { value: 'temple', label: 'Temple' },
  { value: 'amenity', label: 'Amenity' },
  { value: 'open-space', label: 'Open space' },
  { value: 'other', label: 'Other' },
];

// Green tint, lighter than "available" so an open space never reads as a plot for sale.
export const OPEN_SPACE_STYLE = { fill: '#86efac', fillOpacity: 0.45, stroke: '#15803d' };

/** Backend caps label at 80 chars (validateLayoutEntities). @param {unknown} v @returns {string} */
export function cleanOpenSpaceLabel(v) {
  return String(v ?? '').slice(0, 80);
}

// ── Overlay geometry (identical to homeintown.ai plotGeometry.mjs) ────────

const EARTH_RADIUS_M = 6371008.8;
const M_PER_DEG_LAT = (Math.PI / 180) * EARTH_RADIUS_M;
const toRad = (/** @type {number} */ d) => (d * Math.PI) / 180;
const toDeg = (/** @type {number} */ r) => (r * 180) / Math.PI;

export const OVERLAY_MIN_M = 1;
export const OVERLAY_MAX_M = 5000;
export const OVERLAY_DEFAULT_OPACITY = 0.85;

/** [0, 360). NaN/Infinity → 0, same as the server's rotation normalisation. @param {number} deg @returns {number} */
export function normalizeBearing(deg) {
  if (!Number.isFinite(deg)) return 0;
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Rotated layout-image rectangle. `bounds` is the UNROTATED footprint (the
 * OverlayView is sized to it and the <img> is then CSS-rotated about its
 * centre by `bearing`); `corners` are the rotated NW, NE, SE, SW.
 * @param {{ center: LatLngLit; widthM: number; heightM: number; rotationDeg?: number | null }} o
 * @returns {{ corners: LatLngLit[]; bounds: { south: number; west: number; north: number; east: number }; bearing: number }}
 */
export function overlayGeometry(o) {
  const bearing = normalizeBearing(Number(o.rotationDeg) || 0);
  const halfW = Math.max(0, Number(o.widthM) || 0) / 2;
  const halfH = Math.max(0, Number(o.heightM) || 0) / 2;
  const lat = o.center.lat;
  const lng = o.center.lng;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos(toRad(lat));
  const dLat = (/** @type {number} */ m) => m / M_PER_DEG_LAT;
  const dLng = (/** @type {number} */ m) => (mPerDegLng ? m / mPerDegLng : 0);
  const t = toRad(bearing);
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  // (dx east, dy north) turned CLOCKWISE by the bearing.
  const at = (/** @type {number} */ dx, /** @type {number} */ dy) => {
    const x = dx * cos + dy * sin;
    const y = -dx * sin + dy * cos;
    return { lat: lat + dLat(y), lng: lng + dLng(x) };
  };
  return {
    corners: [at(-halfW, halfH), at(halfW, halfH), at(halfW, -halfH), at(-halfW, -halfH)],
    bounds: {
      south: lat - dLat(halfH),
      north: lat + dLat(halfH),
      west: lng - dLng(halfW),
      east: lng + dLng(halfW),
    },
    bearing,
  };
}

// ── Overlay_Transform (identical maths to HIT_Backend services/overlayTransform.js) ──
//
// The web editor, the Public_Plot_Page and the mobile viewer all need the same
// image↔geo↔corner maths (design 7.3, R23.9). overlayGeometry above already
// draws the image; these four exports add the pixel-exact Image_Space mapping
// and the two-point solver. Every operation below is written in the same order
// as overlayTransform.js so the doubles are bit-identical and the shared golden
// fixture (src/lib/overlayGolden.test.mjs) agrees to ~1e-9 deg across all three
// repos. Keep this block free of DOM / npm / google.maps, like the rest of the
// file, so `node --test` runs it in bare Node.

// R6.3 refusal limits for solveTwoPoint — same as overlayTransform.js.
export const MIN_IMAGE_SEPARATION_PX = 20;
export const MIN_GEO_SEPARATION_M = 2;
// Re-centring passes: each pass shrinks the centre offset by orders of
// magnitude; 5 is a hard stop, never a loop.
const MAX_RECENTRE_PASSES = 5;
const RECENTRE_TOLERANCE_M = 1e-6;

const isFiniteNumber = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isFinite(v);

/** Metres per degree of longitude at `lat`. @param {number} lat @returns {number} */
function mPerDegLng(lat) {
  return M_PER_DEG_LAT * Math.cos(toRad(lat));
}

/**
 * Geo point → plane metres around centre `c` (x east, y north).
 * @param {LatLngLit} c @param {LatLngLit} p @returns {{ x: number; y: number }}
 */
function toPlane(c, p) {
  return {
    x: (p.lng - c.lng) * mPerDegLng(c.lat),
    y: (p.lat - c.lat) * M_PER_DEG_LAT,
  };
}

/**
 * Plane metres around centre `c` → geo point. Inverse of toPlane. The
 * `mPerDeg ? ... : 0` guard mirrors overlayGeometry: at a pole cos(lat) is ~0.
 * @param {LatLngLit} c @param {{ x: number; y: number }} q @returns {LatLngLit}
 */
function fromPlane(c, q) {
  const mLng = mPerDegLng(c.lat);
  return {
    lat: c.lat + q.y / M_PER_DEG_LAT,
    lng: c.lng + (mLng ? q.x / mLng : 0),
  };
}

/**
 * Overlay-local metres (a right of centre, b up of centre, before rotation)
 * → geo. Shared by imageToGeo and corners so both use one rotation, in the
 * same clockwise sense and operand order as overlayGeometry's `at()`.
 * @param {{ center: LatLngLit; rotationDeg?: number | null }} transform @param {number} a @param {number} b @returns {LatLngLit}
 */
function localToGeo(transform, a, b) {
  const t = toRad(normalizeBearing(Number(transform.rotationDeg) || 0));
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const x = a * cos + b * sin;
  const y = -a * sin + b * cos;
  return fromPlane(transform.center, { x, y });
}

/**
 * Image_Space pixel → geo point.
 * @param {{ center: LatLngLit; widthM: number; heightM: number; rotationDeg?: number | null }} transform
 * @param {{ width: number; height: number }} imageSize
 * @param {{ x: number; y: number }} pt pixels, origin top-left, y down
 * @returns {LatLngLit}
 */
export function imageToGeo(transform, imageSize, pt) {
  const a = (pt.x / imageSize.width - 0.5) * transform.widthM;
  // Image y grows down, plane y grows north, hence (0.5 - v/H).
  const b = (0.5 - pt.y / imageSize.height) * transform.heightM;
  return localToGeo(transform, a, b);
}

/**
 * Geo point → Image_Space pixel. The exact algebraic inverse of imageToGeo.
 * @param {{ center: LatLngLit; widthM: number; heightM: number; rotationDeg?: number | null }} transform
 * @param {{ width: number; height: number }} imageSize
 * @param {LatLngLit} p
 * @returns {{ x: number; y: number }}
 */
export function geoToImage(transform, imageSize, p) {
  const { x, y } = toPlane(transform.center, p);
  const t = toRad(normalizeBearing(Number(transform.rotationDeg) || 0));
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const a = x * cos - y * sin;
  const b = x * sin + y * cos;
  return {
    x: (a / transform.widthM + 0.5) * imageSize.width,
    y: (0.5 - b / transform.heightM) * imageSize.height,
  };
}

/**
 * The 4 corners in the order NW, NE, SE, SW (the image's TL, TR, BR, BL). Same
 * result as overlayGeometry().corners — kept as a named export because the
 * public API and the golden fixture refer to it as `corners`. Depends only on
 * widthM/heightM, so a legacy overlay with no imageSize still gets corners.
 * @param {{ center: LatLngLit; widthM: number; heightM: number; rotationDeg?: number | null }} transform
 * @returns {LatLngLit[]}
 */
export function corners(transform) {
  const halfW = Math.max(0, Number(transform.widthM) || 0) / 2;
  const halfH = Math.max(0, Number(transform.heightM) || 0) / 2;
  return [
    localToGeo(transform, -halfW, halfH),
    localToGeo(transform, halfW, halfH),
    localToGeo(transform, halfW, -halfH),
    localToGeo(transform, -halfW, -halfH),
  ];
}

/** Great-circle distance in metres, same earth radius as the plane. @param {LatLngLit} g1 @param {LatLngLit} g2 @returns {number} */
function haversineM(g1, g2) {
  const dLat = toRad(g2.lat - g1.lat);
  const dLng = toRad(g2.lng - g1.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(g1.lat)) * Math.cos(toRad(g2.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Minimal complex arithmetic on { re, im }, same as overlayTransform.js.
const cSub = (/** @type {{re:number,im:number}} */ p, /** @type {{re:number,im:number}} */ q) => ({ re: p.re - q.re, im: p.im - q.im });
const cAdd = (/** @type {{re:number,im:number}} */ p, /** @type {{re:number,im:number}} */ q) => ({ re: p.re + q.re, im: p.im + q.im });
const cMul = (/** @type {{re:number,im:number}} */ p, /** @type {{re:number,im:number}} */ q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
const cDiv = (/** @type {{re:number,im:number}} */ p, /** @type {{re:number,im:number}} */ q) => {
  const d = q.re * q.re + q.im * q.im;
  return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d };
};

const refuse = (/** @type {string} */ check, /** @type {string} */ message) => ({ ok: /** @type {const} */ (false), check, message });
const isPoint = (/** @type {any} */ p) => p && isFiniteNumber(p.x) && isFiniteNumber(p.y);
const isGeo = (/** @type {any} */ g) => g && isFiniteNumber(g.lat) && isFiniteNumber(g.lng) && g.lat >= -90 && g.lat <= 90;

/**
 * Two-point alignment (R6.2): the similarity transform without reflection that
 * maps both image points onto both geo points. Identical algorithm to
 * overlayTransform.js solveTwoPoint. Returns a result (never throws): R6.3 says
 * a refusal names the failed check and the tool keeps the current transform.
 * @param {{ width: number; height: number }} imageSize
 * @param {{ image: { x: number; y: number }; geo: LatLngLit }} p1
 * @param {{ image: { x: number; y: number }; geo: LatLngLit }} p2
 * @returns {{ ok: true; transform: { center: LatLngLit; widthM: number; heightM: number; rotationDeg: number } }
 *   | { ok: false; check: 'INVALID_INPUT' | 'IMAGE_POINTS_TOO_CLOSE' | 'GEO_POINTS_TOO_CLOSE' | 'SIZE_OUT_OF_RANGE'; message: string }}
 */
export function solveTwoPoint(imageSize, p1, p2) {
  if (!imageSize || !(imageSize.width > 0) || !(imageSize.height > 0)
    || !isFiniteNumber(imageSize.width) || !isFiniteNumber(imageSize.height)
    || !p1 || !p2 || !isPoint(p1.image) || !isPoint(p2.image) || !isGeo(p1.geo) || !isGeo(p2.geo)) {
    return refuse('INVALID_INPUT', 'Image size and both control points must be finite numbers');
  }

  const W = imageSize.width;
  const H = imageSize.height;
  const g1 = p1.geo;
  const g2 = p2.geo;

  const imageSep = Math.hypot(p2.image.x - p1.image.x, p2.image.y - p1.image.y);
  if (imageSep < MIN_IMAGE_SEPARATION_PX) {
    return refuse('IMAGE_POINTS_TOO_CLOSE',
      `The two image points must be at least ${MIN_IMAGE_SEPARATION_PX} px apart`);
  }
  if (haversineM(g1, g2) < MIN_GEO_SEPARATION_M) {
    return refuse('GEO_POINTS_TOO_CLOSE',
      `The two map points must be at least ${MIN_GEO_SEPARATION_M} m apart`);
  }

  const P1 = { re: p1.image.x, im: -p1.image.y };
  const P2 = { re: p2.image.x, im: -p2.image.y };
  const C = { re: W / 2, im: -H / 2 };
  const dP = cSub(P2, P1);

  let c = { lat: (g1.lat + g2.lat) / 2, lng: (g1.lng + g2.lng) / 2 };
  let z = /** @type {{re:number,im:number}} */ ({ re: 1, im: 0 });
  for (let pass = 0; pass < MAX_RECENTRE_PASSES; pass += 1) {
    const q1 = toPlane(c, g1);
    const q2 = toPlane(c, g2);
    const Q1 = { re: q1.x, im: q1.y };
    const Q2 = { re: q2.x, im: q2.y };
    z = cDiv(cSub(Q2, Q1), dP);
    const t = cSub(Q1, cMul(z, P1));
    const Qc = cAdd(cMul(z, C), t);
    if (Math.hypot(Qc.re, Qc.im) < RECENTRE_TOLERANCE_M) break;
    c = fromPlane(c, { x: Qc.re, y: Qc.im });
  }

  const s = Math.hypot(z.re, z.im);
  const widthM = s * W;
  const heightM = s * H;
  if (!(widthM >= OVERLAY_MIN_M && widthM <= OVERLAY_MAX_M
    && heightM >= OVERLAY_MIN_M && heightM <= OVERLAY_MAX_M)) {
    return refuse('SIZE_OUT_OF_RANGE',
      `The computed overlay size must be between ${OVERLAY_MIN_M} and ${OVERLAY_MAX_M} m`);
  }

  let rotationDeg = normalizeBearing(-toDeg(Math.atan2(z.im, z.re)));
  if (rotationDeg >= 360 || rotationDeg === 0) rotationDeg = 0;

  return {
    ok: true,
    transform: { center: c, widthM, heightM, rotationDeg },
  };
}

// ── File / raster / reduced-copy helpers (pure, design 3.1) ────────────────
//
// These run before any upload so a bad file is rejected locally with a reason,
// and the PDF rasteriser (pdfLayout.ts) and the reduced-copy maker
// (reducedCopy.ts) share one sizing rule. Kept pure (no DOM / canvas) so
// `node --test` exercises them in bare Node; the DOM work lives in the TS
// callers, which only pass numbers back here.

// design 3.1: accepted extension → the browser MIME type(s) that identify the
// same type. SVG and every other declared type are rejected (R22.2 on the
// server rejects them too).
export const ACCEPTED_LAYOUT_TYPES = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
};
export const IMAGE_MAX_BYTES = 26214400; // 25 MiB
export const PDF_MAX_BYTES = 52428800;   // 50 MiB
// R22.6 decoded-pixel limits, same as the server's checkLayoutImageDims.
export const DECODED_MAX_SIDE_PX = 8192;
export const DECODED_MAX_PIXELS = 40000000; // 40 MP
// Reduced-copy caps (D10). Preview_Copy / Detail_Copy longest side.
export const PREVIEW_MAX_SIDE_PX = 2048;
export const DETAIL_MAX_SIDE_PX = 4096;
export const COPY_ASPECT_TOLERANCE = 0.005; // 0.5 %, R21.2

/** Lower-case extension after the last dot, '' when there is none. @param {string} name @returns {string} */
function lastExtension(name) {
  const s = String(name ?? '');
  const dot = s.lastIndexOf('.');
  return dot >= 0 ? s.slice(dot + 1).toLowerCase() : '';
}

/**
 * Accept a picked file by name + browser MIME + size (design 3.1 table). The
 * extension and the MIME must identify the SAME accepted type (so a .png with
 * an image/jpeg MIME, or a renamed file, is refused), the size must be > 0, and
 * within the image or PDF cap. Returns a reason the picker can translate.
 * @param {{ name?: string; type?: string; size?: number }} file
 * @returns {{ ok: true; kind: 'image' | 'pdf' }
 *   | { ok: false; reason: 'type' } | { ok: false; reason: 'empty' } | { ok: false; reason: 'size'; limit: number }}
 */
export function checkLayoutFile(file) {
  const ext = lastExtension(file && file.name);
  const allowed = Object.prototype.hasOwnProperty.call(ACCEPTED_LAYOUT_TYPES, ext)
    ? ACCEPTED_LAYOUT_TYPES[/** @type {keyof typeof ACCEPTED_LAYOUT_TYPES} */ (ext)]
    : null;
  if (!allowed || !allowed.includes(String(file && file.type))) {
    return { ok: false, reason: 'type' };
  }
  const size = Number(file && file.size);
  if (!(size > 0)) return { ok: false, reason: 'empty' };
  const limit = ext === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (size > limit) return { ok: false, reason: 'size', limit };
  return { ok: true, kind: ext === 'pdf' ? 'pdf' : 'image' };
}

/**
 * Reject a decoded raster whose longest side exceeds 8192 px or whose area
 * exceeds 40 MP, with the limit to show (R22.6, matches the server). Called
 * after the browser decodes the image, so the sizes are the true pixel sizes.
 * @param {number} width @param {number} height
 * @returns {{ ok: true } | { ok: false; reason: 'side'; limit: number } | { ok: false; reason: 'pixels'; limit: number }}
 */
export function checkDecodedDims(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0) || !(h > 0)) return { ok: false, reason: 'side', limit: DECODED_MAX_SIDE_PX };
  if (Math.max(w, h) > DECODED_MAX_SIDE_PX) return { ok: false, reason: 'side', limit: DECODED_MAX_SIDE_PX };
  if (w * h > DECODED_MAX_PIXELS) return { ok: false, reason: 'pixels', limit: DECODED_MAX_PIXELS };
  return { ok: true };
}

/**
 * Raster scale for one PDF page (R2.4), with the page `/Rotate` already applied
 * so `w`/`h` are the upright viewport size at scale 1. The scale fits the
 * longest side to 8192 px and the area to `pixelCap`, whichever is smaller, and
 * never upscales (capped at 1). `reduced` flags that the rendered longest side
 * falls below 4096 px, so the UI can warn the plan may look soft (R2.5).
 * @param {number} w @param {number} h @param {number} pixelCap
 * @returns {{ scale: number; reduced: boolean }}
 */
export function rasterScale(w, h, pixelCap) {
  const wN = Number(w);
  const hN = Number(h);
  const cap = Number(pixelCap);
  if (!(wN > 0) || !(hN > 0) || !(cap > 0)) return { scale: 0, reduced: true };
  const bySide = DECODED_MAX_SIDE_PX / Math.max(wN, hN);
  const byArea = Math.sqrt(cap / (wN * hN));
  // Never upscale a small page beyond 1:1; the plan is drawn, not photographed.
  const scale = Math.min(bySide, byArea, 1);
  return { scale, reduced: Math.max(wN, hN) * scale < 4096 };
}

/**
 * Target pixel size of a reduced copy (design D10 table), never upscaling and
 * keeping the aspect within 0.5 % of the source (R21.2). The Detail_Copy caps
 * the longest side at 4096 px, the Preview_Copy at 2048 px; a source already
 * within the cap keeps its size. The returned width/height are rounded
 * integers; the caller passes them to createImageBitmap.
 * @param {{ width: number; height: number }} imageSize source pixels
 * @param {'preview' | 'detail'} kind
 * @returns {{ width: number; height: number; maxBytes: number } | null}
 */
export function reducedCopyTarget(imageSize, kind) {
  const w = Number(imageSize && imageSize.width);
  const h = Number(imageSize && imageSize.height);
  if (!(w > 0) || !(h > 0)) return null;
  const maxSide = kind === 'detail' ? DETAIL_MAX_SIDE_PX : PREVIEW_MAX_SIDE_PX;
  const maxBytes = kind === 'detail' ? 6291456 : 1572864; // 6 MB / 1.5 MB
  // Never upscale: a source within maxSide keeps its exact size.
  const factor = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * factor));
  const th = Math.max(1, Math.round(h * factor));
  return { width: tw, height: th, maxBytes };
}

/**
 * Rotate an RGBA pixel buffer 90 degrees CLOCKWISE (R3.3). Pure: the preview
 * calls it once per Rotate click on the re-encode path, so four calls give back
 * the original pixels and size exactly. Source (x, y) lands at (h - 1 - y, x)
 * in the new h-wide, w-tall image.
 * @param {Uint8ClampedArray | Uint8Array} pixels RGBA, length w*h*4
 * @param {number} w @param {number} h
 * @returns {{ pixels: Uint8ClampedArray; width: number; height: number }}
 */
export function rotate90(pixels, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = (y * w + x) * 4;
      const d = (x * h + (h - 1 - y)) * 4;
      out[d] = pixels[s];
      out[d + 1] = pixels[s + 1];
      out[d + 2] = pixels[s + 2];
      out[d + 3] = pixels[s + 3];
    }
  }
  return { pixels: out, width: h, height: w };
}

/** Move a point by metres east / north (flat-earth, fine at layout scale). @param {LatLngLit} c @param {number} eastM @param {number} northM @returns {LatLngLit} */
export function offsetCenter(c, eastM, northM) {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos(toRad(c.lat));
  return {
    lat: c.lat + northM / M_PER_DEG_LAT,
    lng: c.lng + (mPerDegLng ? eastM / mPerDegLng : 0),
  };
}

/**
 * Screen-pixel drag delta → the image's own (unrotated) axes. CSS rotate(θ)
 * turns (x, y-down) clockwise; this is its inverse.
 * @param {number} dx @param {number} dy @param {number} bearing @returns {{ x: number; y: number }}
 */
export function screenToLocal(dx, dy, bearing) {
  const t = toRad(bearing);
  return { x: dx * Math.cos(t) + dy * Math.sin(t), y: -dx * Math.sin(t) + dy * Math.cos(t) };
}

/** @param {number} v @returns {number} */
const clampSize = (v) => Math.min(OVERLAY_MAX_M, Math.max(OVERLAY_MIN_M, v));

/**
 * Drag the image body: screen y grows downward, so a drag down is SOUTH.
 * `mPerPx` is captured at drag start (zoom does not change mid-drag).
 * @template {OverlayDraft} T @param {T} start @param {number} dxPx @param {number} dyPx @param {number} mPerPx @returns {T}
 */
export function moveOverlay(start, dxPx, dyPx, mPerPx) {
  return { ...start, center: offsetCenter(start.center, dxPx * mPerPx, -dyPx * mPerPx) };
}

/**
 * Drag the bottom-right scale handle. The image scales about its CENTRE (the
 * centre is what the user aligned first), so a handle moved by d grows each
 * side by 2d. With `lockAspect` the delta is projected onto the diagonal so the
 * picture is never stretched; that is the default because a scanned layout
 * plan has one true aspect ratio.
 * @template {OverlayDraft} T
 * @param {T} start @param {number} dxPx @param {number} dyPx @param {number} mPerPx @param {boolean} lockAspect
 * @returns {T}
 */
export function resizeOverlay(start, dxPx, dyPx, mPerPx, lockAspect) {
  if (!(mPerPx > 0)) return start;
  const local = screenToLocal(dxPx, dyPx, normalizeBearing(start.rotationDeg));
  if (lockAspect) {
    const hw = start.widthM / 2 / mPerPx;
    const hh = start.heightM / 2 / mPerPx;
    const len2 = hw * hw + hh * hh;
    if (!(len2 > 0)) return start;
    const s = ((hw + local.x) * hw + (hh + local.y) * hh) / len2;
    // Clamp the factor so neither side leaves [1, 5000] and the ratio holds.
    const lo = Math.max(OVERLAY_MIN_M / start.widthM, OVERLAY_MIN_M / start.heightM);
    const hi = Math.min(OVERLAY_MAX_M / start.widthM, OVERLAY_MAX_M / start.heightM);
    const k = Math.min(hi, Math.max(lo, s));
    return { ...start, widthM: start.widthM * k, heightM: start.heightM * k };
  }
  return {
    ...start,
    widthM: clampSize(start.widthM + 2 * local.x * mPerPx),
    heightM: clampSize(start.heightM + 2 * local.y * mPerPx),
  };
}

/**
 * Keyboard alignment (R4.7): arrows move 1 m (Shift 10 m) in the compass
 * direction, + / - scale 1 % (Shift 10 %), [ / ] rotate 0.1° (Shift 1°)
 * counter-clockwise / clockwise, and { / } rotate 1° (Shift 10°).
 * Before: + / - scaled 2 % and [ / ] rotated 1°; R4.7 and design 3.1 set 1 % and
 * 0.1° for the fine keys and give the 1° step to the brace keys, so a nudge can
 * be as small as the 0.1° rotation slider. Rotation is rounded to 0.1° after
 * each step so repeated nudges do not accumulate float noise.
 * null = key not handled, so the caller lets it through.
 * @template {OverlayDraft} T @param {T} d @param {string} key @param {boolean} shift @returns {T | null}
 */
export function nudgeOverlay(d, key, shift) {
  const step = shift ? 10 : 1;
  const rot = (/** @type {number} */ delta) => ({
    ...d,
    rotationDeg: normalizeRotation(Math.round((d.rotationDeg + delta) * 10) / 10),
  });
  switch (key) {
    case 'ArrowUp': return { ...d, center: offsetCenter(d.center, 0, step) };
    case 'ArrowDown': return { ...d, center: offsetCenter(d.center, 0, -step) };
    case 'ArrowLeft': return { ...d, center: offsetCenter(d.center, -step, 0) };
    case 'ArrowRight': return { ...d, center: offsetCenter(d.center, step, 0) };
    case '+':
    case '=':
    case '-':
    case '_': {
      const pct = (shift ? 0.1 : 0.01) * (key === '+' || key === '=' ? 1 : -1);
      const k0 = 1 + pct;
      const lo = Math.max(OVERLAY_MIN_M / d.widthM, OVERLAY_MIN_M / d.heightM);
      const hi = Math.min(OVERLAY_MAX_M / d.widthM, OVERLAY_MAX_M / d.heightM);
      const k = Math.min(hi, Math.max(lo, k0));
      return { ...d, widthM: d.widthM * k, heightM: d.heightM * k };
    }
    case '[': return rot(-(shift ? 1 : 0.1));
    case ']': return rot(shift ? 1 : 0.1);
    case '{': return rot(-(shift ? 10 : 1));
    case '}': return rot(shift ? 10 : 1);
    default: return null;
  }
}

// ── Gesture maths (R4.1-R4.5, R4.11, R4.12) ───────────────────────────────

const toDegAngle = (/** @type {number} */ r) => (r * 180) / Math.PI;

/**
 * normalizeBearing, but never exactly 360: a tiny negative angle (-5e-324) rounds up to 360 inside normalizeBearing, which must stay as it is (the server and viewers share it bit for bit). The gesture helpers return a value that is always in [0, 360).
 * @param {number} deg @returns {number}
 */
function normalizeRotation(deg) {
  const r = normalizeBearing(deg);
  return r >= 360 ? 0 : r;
}

/**
 * Scale factor range that keeps BOTH sides inside [1, 5000] m.
 * @param {number} w @param {number} h @returns {{ lo: number; hi: number }}
 */
function scaleRange(w, h) {
  return {
    lo: Math.max(OVERLAY_MIN_M / w, OVERLAY_MIN_M / h),
    hi: Math.min(OVERLAY_MAX_M / w, OVERLAY_MAX_M / h),
  };
}

/**
 * Drag one corner (0 NW, 1 NE, 2 SE, 3 SW, the image's own corners) so the
 * OPPOSITE corner stays on the ground (R4.1). The pointer delta is turned into
 * the image's axes, the size changes by that much in the corner's direction,
 * and the centre moves by half the size change along the rotated axes, which is
 * exactly what keeps the opposite corner still. With `lockAspect` the delta is
 * projected on the diagonal so the picture is never stretched.
 * @template {OverlayDraft} T
 * @param {T} start @param {number} cornerIndex @param {number} dxPx @param {number} dyPx
 * @param {number} mPerPx @param {boolean} lockAspect @returns {T}
 */
export function resizeFromCorner(start, cornerIndex, dxPx, dyPx, mPerPx, lockAspect) {
  if (!(mPerPx > 0) || !(start.widthM > 0) || !(start.heightM > 0)) return start;
  const sx = cornerIndex === 1 || cornerIndex === 2 ? 1 : -1; // right / left
  const sy = cornerIndex === 2 || cornerIndex === 3 ? 1 : -1; // down / up (image axes)
  const local = screenToLocal(dxPx, dyPx, normalizeBearing(start.rotationDeg));
  const growX = sx * local.x * mPerPx; // metres the width grows
  const growY = sy * local.y * mPerPx; // metres the height grows
  let w;
  let h;
  if (lockAspect) {
    const len2 = start.widthM * start.widthM + start.heightM * start.heightM;
    const s = ((start.widthM + growX) * start.widthM + (start.heightM + growY) * start.heightM) / len2;
    const { lo, hi } = scaleRange(start.widthM, start.heightM);
    const k = Math.min(hi, Math.max(lo, s));
    w = start.widthM * k;
    h = start.heightM * k;
  } else {
    w = clampSize(start.widthM + growX);
    h = clampSize(start.heightM + growY);
  }
  // Centre moves half the size change toward the dragged corner, in the image's
  // axes (a right, b up), then is turned CLOCKWISE by the bearing to east/north.
  const a = (sx * (w - start.widthM)) / 2;
  const b = (-sy * (h - start.heightM)) / 2;
  const t = toRad(normalizeBearing(start.rotationDeg));
  const east = a * Math.cos(t) + b * Math.sin(t);
  const north = -a * Math.sin(t) + b * Math.cos(t);
  return { ...start, widthM: w, heightM: h, center: offsetCenter(start.center, east, north) };
}

/** Angle in degrees of a screen point around a centre; y grows down so it increases CLOCKWISE, like a map bearing. @param {{x:number;y:number}} c @param {{x:number;y:number}} p @returns {number} */
export function pointerAngleDeg(c, p) {
  return toDegAngle(Math.atan2(p.y - c.y, p.x - c.x));
}

/**
 * Rotate-handle drag (R4.4): the overlay turns by the angle the pointer has
 * swept around the overlay centre since the drag began. Angles come from
 * pointerAngleDeg, so a clockwise sweep adds to the bearing.
 * @template {OverlayDraft} T @param {T} start @param {number} startAngle @param {number} currentAngle @returns {T}
 */
export function rotateByHandle(start, startAngle, currentAngle) {
  return { ...start, rotationDeg: normalizeRotation(start.rotationDeg + (currentAngle - startAngle)) };
}

/**
 * Two-finger pinch-and-twist (R4.5): size scales by the ratio of finger
 * distances (kept inside 1-5000 m, aspect unchanged) and the bearing changes by
 * the change of the finger angle. The caller only starts this when the gesture
 * began on the overlay.
 * @template {OverlayDraft} T
 * @param {T} start
 * @param {[{x:number;y:number},{x:number;y:number}]} startPair
 * @param {[{x:number;y:number},{x:number;y:number}]} currentPair
 * @returns {T}
 */
export function pinchTwist(start, startPair, currentPair) {
  const d0 = Math.hypot(startPair[1].x - startPair[0].x, startPair[1].y - startPair[0].y);
  const d1 = Math.hypot(currentPair[1].x - currentPair[0].x, currentPair[1].y - currentPair[0].y);
  if (!(d0 > 0) || !(d1 > 0)) return start;
  const { lo, hi } = scaleRange(start.widthM, start.heightM);
  const k = Math.min(hi, Math.max(lo, d1 / d0));
  const a0 = pointerAngleDeg(startPair[0], startPair[1]);
  const a1 = pointerAngleDeg(currentPair[0], currentPair[1]);
  return {
    ...start,
    widthM: start.widthM * k,
    heightM: start.heightM * k,
    rotationDeg: normalizeRotation(start.rotationDeg + (a1 - a0)),
  };
}

/**
 * Clamp a draft into the legal ranges (R4.11): both sides to 1-5000 m (with
 * `lockAspect` they scale together so the ratio holds, otherwise each is
 * clamped alone) and rotation into [0, 360). A non-finite value keeps nothing
 * it can trust: size falls back to the nearest bound, rotation to 0.
 * @template {OverlayDraft} T @param {T} d @param {boolean} [lockAspect] @returns {T}
 */
export function clampDraft(d, lockAspect = true) {
  let w = Number(d.widthM);
  let h = Number(d.heightM);
  if (!Number.isFinite(w)) w = OVERLAY_MIN_M;
  if (!Number.isFinite(h)) h = OVERLAY_MIN_M;
  if (lockAspect && w > 0 && h > 0) {
    const { lo, hi } = scaleRange(w, h);
    // lo > hi happens for extreme aspect ratios; the lower bound wins so neither side is < 1 m.
    const k = lo > hi ? lo : Math.min(hi, Math.max(lo, 1));
    w *= k;
    h *= k;
  }
  return {
    ...d,
    widthM: clampSize(w),
    heightM: clampSize(h),
    rotationDeg: normalizeRotation(Number(d.rotationDeg)),
  };
}

/**
 * Parse the numeric rotation field (R4.6, R4.12). Anything that is not a finite
 * number is rejected, and the caller restores the previous value. A valid entry
 * is normalised into [0, 360) and rounded to 1 decimal.
 * @param {unknown} raw @returns {{ ok: true; value: number } | { ok: false }}
 */
export function parseRotationInput(raw) {
  if (typeof raw === 'number' ? !Number.isFinite(raw) : !/^\s*-?\d+(\.\d+)?\s*$/.test(String(raw ?? ''))) {
    return { ok: false };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, value: normalizeRotation(Math.round(n * 10) / 10) };
}

/**
 * Bounding box of a ring in metres, for sizing a fresh overlay to the drawn
 * boundary. null below 2 valid points.
 * @param {LatLngLit[] | null | undefined} path @returns {{ center: LatLngLit; widthM: number; heightM: number } | null}
 */
export function pathExtentM(path) {
  const pts = (path || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (pts.length < 2) return null;
  let s = Infinity, n = -Infinity, w = Infinity, e = -Infinity;
  for (const p of pts) {
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
    w = Math.min(w, p.lng); e = Math.max(e, p.lng);
  }
  const center = { lat: (s + n) / 2, lng: (w + e) / 2 };
  return {
    center,
    widthM: (e - w) * M_PER_DEG_LAT * Math.cos(toRad(center.lat)),
    heightM: (n - s) * M_PER_DEG_LAT,
  };
}

/**
 * First placement after an upload. A saved overlay keeps its position (only
 * the picture changed). Otherwise the image is centred on the drawn boundary
 * and as wide as it, else on the project pin at 100 m. Height follows the
 * picture's aspect ratio so it is not stretched before the user touches it.
 * @param {{
 *   existing?: Partial<OverlayDraft> | null;
 *   image: { url: string; key: string };
 *   boundaryPath?: LatLngLit[] | null;
 *   fallbackCenter?: LatLngLit | null;
 *   aspect?: number | null;   // naturalHeight / naturalWidth
 * }} a
 * @returns {OverlayDraft | null}  null when there is nowhere to put it
 */
export function initialOverlayDraft(a) {
  return firstPlacement(a).draft;
}

/** |lat| < 0.001 and |lng| < 0.001: the "0,0" a missing coordinate becomes (R5.3, Null_Island_Location). @param {Partial<LatLngLit> | null | undefined} p @returns {boolean} */
export function isNullIsland(p) {
  return !!p && Math.abs(Number(p.lat)) < 0.001 && Math.abs(Number(p.lng)) < 0.001;
}

// Rough bounding box of India incl. islands; only drives a NON-blocking
// warning (R5.7), so a generous box is fine. Positions outside it still save.
const INDIA_BOUNDS = { south: 6.0, north: 37.6, west: 68.0, east: 97.5 };

/** True when a valid position lies outside India's bounding box (non-blocking warning, R5.7). @param {Partial<LatLngLit> | null | undefined} p @returns {boolean} */
export function outsideIndia(p) {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  return p.lat < INDIA_BOUNDS.south || p.lat > INDIA_BOUNDS.north
    || p.lng < INDIA_BOUNDS.west || p.lng > INDIA_BOUNDS.east;
}

/** @param {unknown} p @returns {boolean} */
const isUsablePoint = (p) => !!p && Number.isFinite(/** @type {any} */ (p).lat) && Number.isFinite(/** @type {any} */ (p).lng)
  && !isNullIsland(/** @type {any} */ (p));

/**
 * Largest rectangle of the image's aspect that fits inside w x h (R5.4).
 * @param {number} w @param {number} h @param {number} aspect naturalHeight / naturalWidth
 * @returns {{ widthM: number; heightM: number }}
 */
function largestFit(w, h, aspect) {
  const a = aspect > 0 ? aspect : 1;
  const byWidth = { widthM: w, heightM: w * a };
  const fit = byWidth.heightM <= h ? byWidth : { widthM: h / a, heightM: h };
  const { lo, hi } = scaleRange(fit.widthM, fit.heightM);
  const k = lo > hi ? lo : Math.min(hi, Math.max(lo, 1));
  return { widthM: clampSize(fit.widthM * k), heightM: clampSize(fit.heightM * k) };
}

/**
 * First_Placement (R5.1, R5.2, R5.4, R5.5), in this order:
 *   1. a saved overlay keeps its position (only the picture changed);
 *   2. boundary with >= 3 vertices and none at Null Island: centre of its
 *      bounding box, largest aspect-preserving fit inside it;
 *   3. else the project lat/lng (not Null Island): 200 m on the longest side;
 *   4. else the map centre, 200 m, with `hint` asking the Editor to search for
 *      or pan to the site;
 *   5. else nothing (draft null).
 * Before: no boundary meant 100 m, and a 2-vertex or Null Island boundary was
 * accepted; both put the picture somewhere the Editor had to drag from far away.
 * @param {{
 *   existing?: Partial<OverlayDraft> | null;
 *   image: { url: string; key: string };
 *   boundaryPath?: LatLngLit[] | null;
 *   fallbackCenter?: LatLngLit | null;
 *   mapCenter?: LatLngLit | null;
 *   aspect?: number | null;   // naturalHeight / naturalWidth
 * }} a
 * @returns {{ draft: OverlayDraft | null; source: 'existing' | 'boundary' | 'project' | 'map' | null; hint: string | null }}
 */
export function firstPlacement(a) {
  const ex = a.existing;
  if (ex && ex.center && Number.isFinite(ex.center.lat) && Number.isFinite(ex.center.lng)
    && Number(ex.widthM) > 0 && Number(ex.heightM) > 0) {
    return {
      source: 'existing',
      hint: null,
      draft: {
        image: a.image,
        center: { lat: ex.center.lat, lng: ex.center.lng },
        widthM: clampSize(Number(ex.widthM)),
        heightM: clampSize(Number(ex.heightM)),
        rotationDeg: normalizeBearing(Number(ex.rotationDeg) || 0),
        opacity: clampOpacity(ex.opacity),
      },
    };
  }
  const aspect = Number(a.aspect) > 0 ? Number(a.aspect) : 1;
  const base = { image: a.image, rotationDeg: 0, opacity: OVERLAY_DEFAULT_OPACITY };
  /** @param {LatLngLit} c @returns {OverlayDraft} */
  const at200 = (c) => {
    // 200 m on the LONGEST side, aspect kept.
    const widthM = aspect <= 1 ? 200 : 200 / aspect;
    const heightM = aspect <= 1 ? 200 * aspect : 200;
    return { ...base, center: { lat: c.lat, lng: c.lng }, widthM: clampSize(widthM), heightM: clampSize(heightM) };
  };

  const path = (a.boundaryPath || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const boundaryOk = path.length >= 3 && !path.some((p) => isNullIsland(p));
  const ext = boundaryOk ? pathExtentM(path) : null;
  if (ext && ext.widthM >= OVERLAY_MIN_M && ext.heightM >= OVERLAY_MIN_M) {
    const fit = largestFit(ext.widthM, ext.heightM, aspect);
    return {
      source: 'boundary',
      hint: null,
      draft: { ...base, center: { lat: ext.center.lat, lng: ext.center.lng }, ...fit },
    };
  }
  if (isUsablePoint(a.fallbackCenter)) {
    return { source: 'project', hint: null, draft: at200(/** @type {LatLngLit} */ (a.fallbackCenter)) };
  }
  if (isUsablePoint(a.mapCenter)) {
    return {
      source: 'map',
      hint: 'Search or pan to your site, then move the overlay there.',
      draft: at200(/** @type {LatLngLit} */ (a.mapCenter)),
    };
  }
  return { source: null, hint: null, draft: null };
}

/** @param {unknown} v @returns {number} */
export function clampOpacity(v) {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return OVERLAY_DEFAULT_OPACITY;
  return Math.min(1, Math.max(0, n));
}

/**
 * Body for PUT /projects/:id/layout-overlay, or an error to show. Same range
 * rules as the server's validateOverlay so a bad value fails here, with a
 * field name, instead of as a bare 400. The URL is never sent: the server
 * rebuilds it from the key.
 * @param {OverlayDraft | null | undefined} d @param {string} projectId
 * @returns {{ ok: true; body: { image: { key: string }; center: LatLngLit; widthM: number; heightM: number; rotationDeg: number; opacity: number } } | { ok: false; message: string }}
 */
export function overlaySavePayload(d, projectId) {
  if (!d || !d.image || typeof d.image.key !== 'string' || !d.image.key) {
    return { ok: false, message: 'Pehle overlay image upload karo' };
  }
  if (!d.image.key.startsWith(`projects/${projectId}/`) || d.image.key.includes('..')) {
    return { ok: false, message: 'Overlay image is project ki nahi hai, dobara upload karo' };
  }
  const { lat, lng } = d.center || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: 'Overlay ka centre galat hai' };
  }
  for (const [name, v] of /** @type {[string, number][]} */ ([['Width', d.widthM], ['Height', d.heightM]])) {
    if (!Number.isFinite(v) || v < OVERLAY_MIN_M || v > OVERLAY_MAX_M) {
      return { ok: false, message: `${name} ${OVERLAY_MIN_M}-${OVERLAY_MAX_M} m ke beech hona chahiye` };
    }
  }
  const opacity = Number(d.opacity);
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    return { ok: false, message: 'Opacity 0 se 1 ke beech hona chahiye' };
  }
  return {
    ok: true,
    body: {
      image: { key: d.image.key },
      center: { lat, lng },
      // Rounded: centimetres and 0.01° are below what a satellite tile shows,
      // and shorter numbers keep the stored doc readable.
      widthM: Math.round(d.widthM * 100) / 100,
      heightM: Math.round(d.heightM * 100) / 100,
      rotationDeg: Math.round(normalizeBearing(d.rotationDeg) * 100) / 100,
      opacity: Math.round(opacity * 100) / 100,
    },
  };
}

/** A key is this project's when it sits under projects/{id}/ with no traversal (mirrors the server's isProjectKey). @param {unknown} key @param {string} projectId @returns {boolean} */
function isOwnKey(key, projectId) {
  return typeof key === 'string' && key.startsWith(`projects/${projectId}/`)
    && !key.includes('..') && !key.includes('\\');
}

/**
 * Body for overlay save v2 (design A4): everything overlaySavePayload checks,
 * plus the Preview/Detail copies, pixel size, Control_Points and Source_PDF
 * page, and the Null_Island block (R5.6). `layoutVersion` is added by the
 * caller. Keys only; no URL is sent.
 * @param {OverlayDraft | null | undefined} d @param {string} projectId
 * @returns {{ ok: true; body: Record<string, any> } | { ok: false; message: string }}
 */
export function overlaySavePayloadV2(d, projectId) {
  const base = overlaySavePayload(d, projectId);
  if (!base.ok || !d) return base;
  if (isNullIsland(d.center)) {
    return { ok: false, message: 'Overlay ka centre (0, 0) hai. Pehle use apni site pe le jao.' };
  }
  /** @type {Record<string, any>} */
  const body = { ...base.body };
  for (const [field, f] of /** @type {[string, { key: string } | null | undefined][]} */ ([['preview', d.preview], ['detail', d.detail]])) {
    if (!f) continue;
    if (!isOwnKey(f.key, projectId)) return { ok: false, message: `${field} image is project ki nahi hai, dobara upload karo` };
    body[field] = { key: f.key };
  }
  if (d.imageSize) {
    const { width, height } = d.imageSize;
    if (!(width > 0) || !(height > 0)) return { ok: false, message: 'Image size galat hai' };
    body.imageSize = { width, height };
  }
  const cps = d.controlPoints || [];
  if (cps.length > 3) return { ok: false, message: 'Maximum 3 control points' };
  if (cps.length) {
    for (const p of cps) {
      if (![p.u, p.v, p.lat, p.lng].every(Number.isFinite) || isNullIsland(p)) {
        return { ok: false, message: 'Control point galat hai' };
      }
      if (d.imageSize && (p.u < 0 || p.v < 0 || p.u > d.imageSize.width || p.v > d.imageSize.height)) {
        return { ok: false, message: 'Control point image ke bahar hai' };
      }
    }
    body.controlPoints = cps.map((p) => ({ u: p.u, v: p.v, lat: p.lat, lng: p.lng, role: p.role }));
  }
  if (d.sourcePdf) {
    if (!isOwnKey(d.sourcePdf.key, projectId)) return { ok: false, message: 'Source PDF is project ki nahi hai, dobara upload karo' };
    body.sourcePdf = { key: d.sourcePdf.key, page: d.sourcePdf.page, extraRotationDeg: d.sourcePdf.extraRotationDeg };
  }
  return { ok: true, body };
}

/**
 * What Reset has to send to the server before the draft can go back to the
 * saved copy. proxy-upload with type=overlay $sets layoutOverlay.image on the
 * server at once (placement is only written on Save), so after a replacement
 * upload the server already shows the NEW image at the OLD placement. Before
 * this, Reset only swapped the draft back: the editor looked reverted and Save
 * went disabled, while the server and the public viewers kept the unsaved
 * image. Returns the PUT body that restores the saved image, or null when the
 * image key is unchanged (only placement differs, nothing on the server to undo)
 * or there is no saved overlay to go back to.
 * @param {OverlayDraft | null | undefined} draft
 * @param {OverlayDraft | null | undefined} savedDraft
 * @param {string} projectId
 */
export function overlayResetRestoreBody(draft, savedDraft, projectId) {
  if (!draft || !savedDraft) return null;
  if (draft.image?.key === savedDraft.image?.key) return null;
  const p = overlaySavePayload(savedDraft, projectId);
  return p.ok ? p.body : null;
}

// ── Units: generate-range prefill ─────────────────────────────────────────

export const MAX_PLOT_NUMBER = 9999; // backend UnitInventoryService MAX_PLOT_NUMBER
export const MAX_UNITS = 2000;       // backend MAX_UNITS

/**
 * Prefill for "Generate units": min..max of the numeric plot numbers on the
 * saved, non-deleted plots (D5: generateUnits only builds one contiguous
 * range). Gaps and non-numeric numbers ("A-12") are reported so the dialog can
 * warn that they will not link 1:1.
 * @param {{ type?: string; plotNumber?: string | number | null; saved?: boolean; deleted?: boolean }[]} entities
 * @returns {{ from: number | null; to: number | null; plotCount: number; numericCount: number; nonNumeric: string[]; duplicates: string[]; missing: number }}
 */
export function unitRangePrefill(entities) {
  const plots = (entities || []).filter((e) => e && e.type === 'subplot' && e.saved === true && e.deleted !== true);
  /** @type {Set<number>} */
  const nums = new Set();
  /** @type {string[]} */
  const nonNumeric = [];
  /** @type {Set<string>} */
  const dup = new Set();
  /** @type {Set<string>} */
  const seen = new Set();
  for (const p of plots) {
    const raw = String(p.plotNumber ?? '').trim();
    if (!raw) continue;
    if (seen.has(raw)) dup.add(raw);
    seen.add(raw);
    // Canonical whole numbers only. Units are labelled "7", and link-units
    // matches the trimmed plotNumber as a string, so "07", "7a" or "A-7"
    // would never link — they are reported instead of widening the range.
    if (/^[1-9]\d*$/.test(raw)) {
      const n = Number(raw);
      if (n >= 1 && n <= MAX_PLOT_NUMBER) nums.add(n);
      else nonNumeric.push(raw);
    } else {
      nonNumeric.push(raw);
    }
  }
  if (!nums.size) {
    return { from: null, to: null, plotCount: plots.length, numericCount: 0, nonNumeric, duplicates: [...dup], missing: 0 };
  }
  let from = Infinity, to = -Infinity;
  for (const n of nums) { from = Math.min(from, n); to = Math.max(to, n); }
  return {
    from, to,
    plotCount: plots.length,
    numericCount: nums.size,
    nonNumeric,
    duplicates: [...dup],
    missing: to - from + 1 - nums.size,
  };
}

/**
 * Same rules as generatePlotUnits (whole numbers 1..9999, to ≥ from, ≤ 2000
 * units) so a bad range is caught before a request.
 * @param {unknown} from @param {unknown} to @returns {string | null}
 */
export function validateUnitRange(from, to) {
  const f = Number(from), t = Number(to);
  if (!Number.isInteger(f) || !Number.isInteger(t) || f < 1 || t < 1 || f > MAX_PLOT_NUMBER || t > MAX_PLOT_NUMBER) {
    return `Plot numbers 1 se ${MAX_PLOT_NUMBER} tak ke whole numbers hone chahiye`;
  }
  if (t < f) return `Last plot number (${t}) first (${f}) se pehle hai`;
  if (t - f + 1 > MAX_UNITS) return `${t - f + 1} units banenge; limit ${MAX_UNITS} hai`;
  return null;
}

// ── Feedback text ─────────────────────────────────────────────────────────

export const PLOT_NO_PERMISSION = 'Is project ka status badalne ki permission nahi';

/**
 * PATCH /plots/:entityId/status result → message + whether to reload the
 * layout from the server. 403 uses the same fixed text as the homeintown.ai
 * viewer. 409 = the plot changed (or was relinked) under us; 404 = the plot is
 * not on the server (deleted elsewhere, or confirmed locally but the save
 * failed) — both reload so the editor stops showing a stale plot.
 * @param {{ ok: boolean; httpStatus?: number; serverMessage?: string | null; changed?: boolean; plotNumber?: string | null; status?: PlotStatus }} r
 * @returns {{ kind: 'success' | 'info' | 'error'; message: string; reload: boolean }}
 */
export function plotStatusFeedback(r) {
  const n = String(r.plotNumber ?? '').trim() || '?';
  const label = r.status ? PLOT_STATUS_LABELS[r.status] : '';
  if (r.ok) {
    return r.changed === false
      ? { kind: 'info', message: `Plot ${n} pehle se ${label} hai`, reload: false }
      : { kind: 'success', message: `Plot ${n}: ${label} save ho gaya`, reload: false };
  }
  const msg = String(r.serverMessage || '').trim();
  switch (r.httpStatus) {
    case 401: return { kind: 'error', message: 'Session khatam ho gaya, dobara login karo', reload: false };
    case 403: return { kind: 'error', message: PLOT_NO_PERMISSION, reload: false };
    case 404: return { kind: 'error', message: `Plot ${n} server pe nahi mila, layout reload ho raha hai`, reload: true };
    case 409: return { kind: 'error', message: msg || 'Plot changed while saving, reload and try again', reload: true };
    default: return { kind: 'error', message: msg || 'Status save nahi hua, dobara try karo', reload: false };
  }
}

/**
 * PUT /layout-entities failure → alert text. Before, every failure was only
 * console.error'd, so a 409 (layout changed by someone else while saving, the
 * server's CAS gave up after 3 tries) or a 400 from the new validator looked
 * like a successful save.
 * @param {number} httpStatus @param {string | null | undefined} serverMessage @param {number | null | undefined} [index]
 * @returns {string}
 */
export function layoutSaveErrorMessage(httpStatus, serverMessage, index) {
  const msg = String(serverMessage || '').trim();
  if (httpStatus === 409) {
    return 'Layout kisi aur ne save karte waqt badal diya. Page reload karke dobara try karo (aapke unsaved changes reload pe chale jayenge).';
  }
  if (httpStatus === 403) return 'Is project ka layout badalne ki permission nahi';
  if (httpStatus === 400) {
    return `Layout save nahi hua: ${msg || 'invalid data'}${Number.isInteger(index) ? ` (shape #${Number(index) + 1})` : ''}`;
  }
  return `Layout save nahi hua: ${msg || 'network / server error'}`;
}
