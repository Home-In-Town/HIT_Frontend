// Feature: interactive-plot-layout, Property 12: Raster scale
//
// For any page size w×h and pixel cap, rasterScale returns a scale that keeps
// the longest side within 8192 px and the area within the cap, never upscales
// (<= 1), and flags `reduced` exactly when the scaled longest side < 4096.
// Validates R2.4, R2.5.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { rasterScale, DECODED_MAX_SIDE_PX } from './layoutTools.mjs';

const EPS = 1e-6;

test('rasterScale fits side + area, never upscales, flags reduced', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 1, max: 20000, noNaN: true }),
      fc.double({ min: 1, max: 20000, noNaN: true }),
      fc.double({ min: 1000000, max: 40000000, noNaN: true }),
      (w, h, cap) => {
        const { scale, reduced } = rasterScale(w, h, cap);
        assert.ok(scale > 0, 'scale positive');
        assert.ok(scale <= 1 + EPS, 'never upscales');
        // Longest side within the 8192 cap.
        assert.ok(Math.max(w, h) * scale <= DECODED_MAX_SIDE_PX + EPS, 'side cap');
        // Area within the pixel cap.
        assert.ok(w * h * scale * scale <= cap + 1, 'area cap');
        // reduced flag is consistent with the rendered longest side.
        assert.equal(reduced, Math.max(w, h) * scale < 4096);
      },
    ),
    { numRuns: 300 },
  );
});

test('rasterScale rejects non-positive input', () => {
  for (const bad of [[0, 100, 1e6], [100, 0, 1e6], [100, 100, 0], [NaN, 1, 1]]) {
    const r = rasterScale(bad[0], bad[1], bad[2]);
    assert.equal(r.scale, 0);
    assert.equal(r.reduced, true);
  }
});
