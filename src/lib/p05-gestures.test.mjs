// Feature: interactive-plot-layout, Property 5: Gesture maths preserves what it should
//
// Corner drag keeps the OPPOSITE corner on the ground and (with the aspect
// lock) the aspect ratio; the rotate handle and pinch-twist change the bearing
// by exactly the swept angle; pinch scales by the ratio of finger distances.
// Validates R4.1, R4.2, R4.3, R4.4, R4.5.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  corners, resizeFromCorner, rotateByHandle, pinchTwist, normalizeBearing, pointerAngleDeg,
  OVERLAY_MIN_M, OVERLAY_MAX_M,
} from './layoutTools.mjs';

const img = { url: 'u', key: 'projects/p/overlay/x.png' };
const draftArb = fc.record({
  center: fc.record({ lat: fc.double({ min: -60, max: 60, noNaN: true }), lng: fc.double({ min: -170, max: 170, noNaN: true }) }),
  widthM: fc.double({ min: 20, max: 1000, noNaN: true }),
  heightM: fc.double({ min: 20, max: 1000, noNaN: true }),
  rotationDeg: fc.double({ min: 0, max: 359.9, noNaN: true }),
}).map((d) => ({ image: img, opacity: 0.8, ...d }));

// The model scales longitude by cos(centre lat), so moving the centre north changes that factor a hair: a pure translation is exact only to ~1e-9 deg. 5e-8 deg is ~5 mm.
const TOL = 5e-8;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('corner drag keeps the opposite corner fixed (aspect lock on and off)', () => {
  fc.assert(
    fc.property(
      draftArb, fc.integer({ min: 0, max: 3 }),
      fc.double({ min: -60, max: 60, noNaN: true }), fc.double({ min: -60, max: 60, noNaN: true }),
      fc.double({ min: 0.1, max: 2, noNaN: true }), fc.boolean(),
      (d, i, dx, dy, mPerPx, lock) => {
        const before = corners(d);
        const next = resizeFromCorner(d, i, dx, dy, mPerPx, lock);
        const after = corners(next);
        const opp = (i + 2) % 4;
        near(after[opp].lat, before[opp].lat, TOL, 'opposite lat');
        near(after[opp].lng, before[opp].lng, TOL, 'opposite lng');
        assert.ok(next.widthM >= OVERLAY_MIN_M - 1e-9 && next.widthM <= OVERLAY_MAX_M + 1e-9);
        assert.ok(next.heightM >= OVERLAY_MIN_M - 1e-9 && next.heightM <= OVERLAY_MAX_M + 1e-9);
        assert.equal(next.rotationDeg, d.rotationDeg);
        if (lock) near(next.widthM / next.heightM, d.widthM / d.heightM, 1e-9, 'aspect');
      },
    ),
    { numRuns: 300 },
  );
});

test('rotate handle adds exactly the swept angle; there and back is the identity', () => {
  fc.assert(
    fc.property(draftArb, fc.double({ min: -720, max: 720, noNaN: true }), fc.double({ min: -180, max: 180, noNaN: true }), (d, sweep, a0) => {
      const r = rotateByHandle(d, a0, a0 + sweep);
      const want = normalizeBearing(d.rotationDeg + sweep);
      const diff = Math.abs(r.rotationDeg - want);
      assert.ok(Math.min(diff, 360 - diff) < 1e-9);
      assert.ok(r.rotationDeg >= 0 && r.rotationDeg < 360);
      assert.deepEqual(r.center, d.center);
      assert.equal(r.widthM, d.widthM);
      const back = rotateByHandle(r, a0 + sweep, a0);
      const bd = Math.abs(back.rotationDeg - d.rotationDeg);
      assert.ok(Math.min(bd, 360 - bd) < 1e-6);
    }),
    { numRuns: 200 },
  );
});

test('pointerAngleDeg grows clockwise on screen (y down)', () => {
  assert.equal(pointerAngleDeg({ x: 0, y: 0 }, { x: 1, y: 0 }), 0);
  assert.equal(pointerAngleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }), 90);
});

test('pinch-twist scales by the distance ratio and rotates by the angle change', () => {
  fc.assert(
    fc.property(
      draftArb,
      fc.double({ min: 40, max: 300, noNaN: true }), fc.double({ min: -180, max: 180, noNaN: true }),
      fc.double({ min: 0.5, max: 2, noNaN: true }), fc.double({ min: -90, max: 90, noNaN: true }),
      (d, dist, ang, ratio, twist) => {
        const pair = (dd, aa) => [{ x: 100, y: 100 }, { x: 100 + dd * Math.cos((aa * Math.PI) / 180), y: 100 + dd * Math.sin((aa * Math.PI) / 180) }];
        const next = pinchTwist(d, pair(dist, ang), pair(dist * ratio, ang + twist));
        assert.ok(next.widthM >= OVERLAY_MIN_M - 1e-9 && next.widthM <= OVERLAY_MAX_M + 1e-9);
        assert.ok(next.heightM >= OVERLAY_MIN_M - 1e-9 && next.heightM <= OVERLAY_MAX_M + 1e-9);
        near(next.widthM / next.heightM, d.widthM / d.heightM, 1e-9, 'aspect');
        const unclamped = d.widthM * ratio >= OVERLAY_MIN_M && d.widthM * ratio <= OVERLAY_MAX_M
          && d.heightM * ratio >= OVERLAY_MIN_M && d.heightM * ratio <= OVERLAY_MAX_M;
        if (unclamped) near(next.widthM / d.widthM, ratio, 1e-9, 'scale');
        const want = normalizeBearing(d.rotationDeg + twist);
        const diff = Math.abs(next.rotationDeg - want);
        assert.ok(Math.min(diff, 360 - diff) < 1e-6, 'rotation');
        assert.deepEqual(next.center, d.center);
      },
    ),
    { numRuns: 200 },
  );
});

test('pinch-twist ignores a zero-length finger pair', () => {
  const d = { image: img, opacity: 1, center: { lat: 1, lng: 1 }, widthM: 50, heightM: 40, rotationDeg: 10 };
  const same = [{ x: 5, y: 5 }, { x: 5, y: 5 }];
  assert.equal(pinchTwist(d, same, [{ x: 0, y: 0 }, { x: 10, y: 0 }]), d);
});
