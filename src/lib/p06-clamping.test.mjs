// Feature: interactive-plot-layout, Property 6: Draft clamping and normalisation
//
// clampDraft keeps both sides in 1-5000 m (aspect kept while locked whenever
// that is possible), normalises rotation into [0, 360), and is idempotent. A
// non-numeric rotation entry is rejected (the caller restores the old value).
// Validates R4.11, R4.12.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { clampDraft, parseRotationInput, OVERLAY_MIN_M, OVERLAY_MAX_M } from './layoutTools.mjs';

const base = { image: { url: 'u', key: 'k' }, center: { lat: 1, lng: 1 }, opacity: 0.5 };
const sizeArb = fc.double({ min: 0.01, max: 100000, noNaN: true });

test('clampDraft: sizes in range, rotation in [0, 360), idempotent', () => {
  fc.assert(
    fc.property(sizeArb, sizeArb, fc.double({ min: -1e6, max: 1e6, noNaN: true }), fc.boolean(), (w, h, rot, lock) => {
      const d = { ...base, widthM: w, heightM: h, rotationDeg: rot };
      const c = clampDraft(d, lock);
      assert.ok(c.widthM >= OVERLAY_MIN_M && c.widthM <= OVERLAY_MAX_M);
      assert.ok(c.heightM >= OVERLAY_MIN_M && c.heightM <= OVERLAY_MAX_M);
      assert.ok(c.rotationDeg >= 0 && c.rotationDeg < 360);
      assert.deepEqual(clampDraft(c, lock), c);
    }),
    { numRuns: 300 },
  );
});

test('clampDraft with the lock keeps the aspect ratio when a legal size exists', () => {
  fc.assert(
    fc.property(sizeArb, sizeArb, (w, h) => {
      fc.pre(Math.max(w, h) / Math.min(w, h) <= OVERLAY_MAX_M); // otherwise no size satisfies both bounds
      const c = clampDraft({ ...base, widthM: w, heightM: h, rotationDeg: 0 }, true);
      assert.ok(Math.abs(c.widthM / c.heightM - w / h) / (w / h) < 1e-9);
    }),
    { numRuns: 300 },
  );
});

test('clampDraft leaves in-range values alone', () => {
  const d = { ...base, widthM: 120, heightM: 80, rotationDeg: 33.3 };
  assert.deepEqual(clampDraft(d, true), d);
  assert.deepEqual(clampDraft(d, false), d);
});

test('parseRotationInput accepts numbers (normalised, 1 decimal) and rejects the rest', () => {
  fc.assert(
    fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (n) => {
      const r = parseRotationInput(String(n));
      if (/e/i.test(String(n))) { assert.equal(r.ok, false); return; }
      assert.equal(r.ok, true);
      assert.ok(r.value >= 0 && r.value < 360);
    }),
    { numRuns: 200 },
  );
  for (const bad of ['', 'abc', '12abc', '1e', '--5', NaN, Infinity, null, undefined, '1,5']) {
    assert.equal(parseRotationInput(bad).ok, false, String(bad));
  }
  assert.deepEqual(parseRotationInput('-10'), { ok: true, value: 350 });
  assert.deepEqual(parseRotationInput('12.34'), { ok: true, value: 12.3 });
});
