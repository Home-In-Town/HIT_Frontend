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
 * Keyboard alignment (the drag handles are mouse/touch only): arrows move
 * 1 m (Shift 10 m), + / - scale 2 % (Shift 10 %), [ / ] rotate 1° (Shift 10°).
 * null = key not handled, so the caller lets it through.
 * @template {OverlayDraft} T @param {T} d @param {string} key @param {boolean} shift @returns {T | null}
 */
export function nudgeOverlay(d, key, shift) {
  const step = shift ? 10 : 1;
  switch (key) {
    case 'ArrowUp': return { ...d, center: offsetCenter(d.center, 0, step) };
    case 'ArrowDown': return { ...d, center: offsetCenter(d.center, 0, -step) };
    case 'ArrowLeft': return { ...d, center: offsetCenter(d.center, -step, 0) };
    case 'ArrowRight': return { ...d, center: offsetCenter(d.center, step, 0) };
    case '+':
    case '=':
    case '-':
    case '_': {
      const pct = (shift ? 0.1 : 0.02) * (key === '+' || key === '=' ? 1 : -1);
      const k0 = 1 + pct;
      const lo = Math.max(OVERLAY_MIN_M / d.widthM, OVERLAY_MIN_M / d.heightM);
      const hi = Math.min(OVERLAY_MAX_M / d.widthM, OVERLAY_MAX_M / d.heightM);
      const k = Math.min(hi, Math.max(lo, k0));
      return { ...d, widthM: d.widthM * k, heightM: d.heightM * k };
    }
    case '[':
    case '{': return { ...d, rotationDeg: normalizeBearing(d.rotationDeg - step) };
    case ']':
    case '}': return { ...d, rotationDeg: normalizeBearing(d.rotationDeg + step) };
    default: return null;
  }
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
  const ex = a.existing;
  if (ex && ex.center && Number.isFinite(ex.center.lat) && Number.isFinite(ex.center.lng)
    && Number(ex.widthM) > 0 && Number(ex.heightM) > 0) {
    return {
      image: a.image,
      center: { lat: ex.center.lat, lng: ex.center.lng },
      widthM: clampSize(Number(ex.widthM)),
      heightM: clampSize(Number(ex.heightM)),
      rotationDeg: normalizeBearing(Number(ex.rotationDeg) || 0),
      opacity: clampOpacity(ex.opacity),
    };
  }
  const ext = pathExtentM(a.boundaryPath);
  const center = ext?.center
    ?? (a.fallbackCenter && Number.isFinite(a.fallbackCenter.lat) && Number.isFinite(a.fallbackCenter.lng)
      ? a.fallbackCenter : null);
  if (!center) return null;
  const widthM = clampSize(ext && ext.widthM >= OVERLAY_MIN_M ? ext.widthM : 100);
  const aspect = Number(a.aspect) > 0 ? Number(a.aspect) : (ext && ext.widthM > 0 ? ext.heightM / ext.widthM : 1);
  return {
    image: a.image,
    center: { lat: center.lat, lng: center.lng },
    widthM,
    heightM: clampSize(widthM * (aspect > 0 ? aspect : 1)),
    rotationDeg: 0,
    opacity: OVERLAY_DEFAULT_OPACITY,
  };
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
