// Two-point georeferencing state machine (design 3.1, R6.1-R6.3, R6.5-R6.9, R6.11).
//
// pick-image-1 -> pick-map-1 -> pick-image-2 -> pick-map-2 -> solved, then an
// optional pick-image-3 -> pick-map-3 for the check point. Plain .mjs so
// `node --test` pins the rules (a refusal names the failed check and keeps the
// current transform; the check point never takes part in the solve) without
// React. GeorefPanel.tsx only renders this state and forwards clicks.

import { solveTwoPoint, imageToGeo, haversineM } from '../../lib/layoutTools.mjs';

/** @typedef {{ x: number; y: number }} ImagePt */
/** @typedef {{ lat: number; lng: number }} GeoPt */
/** @typedef {{ image: ImagePt | null; geo: GeoPt | null }} PointSlot */
/** @typedef {{ center: GeoPt; widthM: number; heightM: number; rotationDeg: number }} Transform */

/** Plain-language names for the failed checks of solveTwoPoint (R6.3). */
export const REFUSAL_TEXT = {
  INVALID_INPUT: 'The image size or a point is not valid.',
  IMAGE_POINTS_TOO_CLOSE: 'The two image points are less than 20 px apart. Pick points further apart.',
  GEO_POINTS_TOO_CLOSE: 'The two map points are less than 2 m apart. Pick points further apart.',
  SIZE_OUT_OF_RANGE: 'The computed size is outside 1 to 5000 m. Check that you matched the same two places.',
};

/** Shown whenever a transform comes from two points (R6.7). */
export const MIRROR_NOTICE = 'Two points cannot tell if the drawing is mirrored. Add a check point to verify.';

/**
 * @param {{ controlPoints?: { u: number; v: number; lat: number; lng: number; role: 'align'|'check' }[] | null }} [init]
 */
export function initialGeorefState(init = {}) {
  const cps = init.controlPoints || [];
  const align = cps.filter((c) => c.role === 'align');
  const check = cps.find((c) => c.role === 'check');
  /** @type {PointSlot[]} */
  const points = [0, 1, 2].map((i) => {
    const c = i < 2 ? align[i] : check;
    return c ? { image: { x: c.u, y: c.v }, geo: { lat: c.lat, lng: c.lng } } : { image: null, geo: null };
  });
  const solved = !!(points[0].image && points[0].geo && points[1].image && points[1].geo);
  return {
    step: /** @type {string} */ (solved ? 'solved' : 'pick-image-1'),
    points,
    refusal: /** @type {{ check: string; message: string } | null} */ (null),
  };
}

/** @typedef {ReturnType<typeof initialGeorefState>} GeorefState */

/** Control_Points in the stored shape (A4): up to 2 align + 1 check. @param {GeorefState} s */
export function toControlPoints(s) {
  /** @type {{ u: number; v: number; lat: number; lng: number; role: 'align'|'check' }[]} */
  const out = [];
  s.points.forEach((p, i) => {
    if (p.image && p.geo) out.push({ u: p.image.x, v: p.image.y, lat: p.geo.lat, lng: p.geo.lng, role: i < 2 ? 'align' : 'check' });
  });
  return out;
}

/**
 * Metres between a point's map position and where `transform` puts its image
 * point. Used for the alignment offsets (R6.6) and the check point error (R6.8).
 * @param {Transform} transform @param {{ width: number; height: number }} imageSize @param {PointSlot} slot
 * @returns {number | null}
 */
export function pointErrorM(transform, imageSize, slot) {
  if (!slot.image || !slot.geo) return null;
  return haversineM(imageToGeo(transform, imageSize, slot.image), slot.geo);
}

/** Offsets in metres to 0.1 m for the two alignment points (R6.6). */
export function alignOffsets(/** @type {Transform} */ t, /** @type {{ width: number; height: number }} */ size, /** @type {GeorefState} */ s) {
  return [0, 1].map((i) => {
    const e = pointErrorM(t, size, s.points[i]);
    return e === null ? null : Math.round(e * 10) / 10;
  });
}

/** Scale in metres per pixel, 3 significant figures (R6.6). */
export function metresPerPixelText(/** @type {{ widthM: number }} */ t, /** @type {{ width: number }} */ size) {
  return (t.widthM / size.width).toPrecision(3);
}

const slotOf = (/** @type {string} */ step) => {
  const m = /^pick-(image|map)-(\d)$/.exec(step);
  return m ? { kind: m[1], index: Number(m[2]) - 1 } : null;
};

/**
 * Pure transition. Returns the next state plus `transform` when a NEW
 * Overlay_Transform was computed. On a refusal `transform` is null so the
 * caller keeps the current transform and points (R6.3).
 * @param {GeorefState} s
 * @param {{ type: 'RESTART' } | { type: 'PICK_IMAGE'; pt: ImagePt } | { type: 'PICK_MAP'; geo: GeoPt } | { type: 'ADD_CHECK' } | { type: 'MOVE_IMAGE'; index: number; pt: ImagePt } | { type: 'MOVE_MAP'; index: number; geo: GeoPt }} a
 * @param {{ width: number; height: number }} imageSize
 * @returns {{ state: GeorefState; transform: Transform | null }}
 */
export function georefTransition(s, a, imageSize) {
  /** @param {number} i @param {Partial<PointSlot>} patch */
  const withSlot = (i, patch) => s.points.map((p, k) => (k === i ? { ...p, ...patch } : p));
  /** Solve from the two alignment points; check point is never passed. @param {GeorefState} next */
  const solve = (next) => {
    const [p1, p2] = next.points;
    if (!(p1.image && p1.geo && p2.image && p2.geo)) return { state: next, transform: null };
    const r = solveTwoPoint(imageSize, { image: p1.image, geo: p1.geo }, { image: p2.image, geo: p2.geo });
    if (!r.ok) {
      return {
        state: { ...next, step: 'pick-image-2', refusal: { check: r.check, message: REFUSAL_TEXT[/** @type {keyof typeof REFUSAL_TEXT} */ (r.check)] || r.message } },
        transform: null,
      };
    }
    return { state: { ...next, step: 'solved', refusal: null }, transform: r.transform };
  };

  switch (a.type) {
    case 'RESTART':
      return { state: { ...initialGeorefState(), step: 'pick-image-1' }, transform: null };
    case 'ADD_CHECK':
      return s.step === 'solved' ? { state: { ...s, step: 'pick-image-3', refusal: null }, transform: null } : { state: s, transform: null };
    case 'PICK_IMAGE': {
      const sl = slotOf(s.step);
      if (!sl || sl.kind !== 'image') return { state: s, transform: null };
      return { state: { ...s, points: withSlot(sl.index, { image: a.pt, geo: null }), step: `pick-map-${sl.index + 1}`, refusal: null }, transform: null };
    }
    case 'PICK_MAP': {
      const sl = slotOf(s.step);
      if (!sl || sl.kind !== 'map') return { state: s, transform: null };
      const next = { ...s, points: withSlot(sl.index, { geo: a.geo }), refusal: null };
      if (sl.index === 0) return { state: { ...next, step: 'pick-image-2' }, transform: null };
      if (sl.index === 1) return solve(next);
      // Check point: stored, never solved. Back to solved.
      return { state: { ...next, step: 'solved' }, transform: null };
    }
    case 'MOVE_IMAGE':
    case 'MOVE_MAP': {
      // Dragging a marker (R6.11): update the point and recompute for align points.
      const next = { ...s, points: withSlot(a.index, a.type === 'MOVE_IMAGE' ? { image: a.pt } : { geo: a.geo }) };
      return a.index < 2 ? solve(next) : { state: next, transform: null };
    }
    default:
      return { state: s, transform: null };
  }
}
