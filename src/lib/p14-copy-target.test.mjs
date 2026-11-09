// Feature: interactive-plot-layout, Property 14: Reduced copy sizing and check
// (client target-size half)
//
// For any source image size, reducedCopyTarget never upscales, caps the
// longest side at 2048 (preview) or 4096 (detail), and keeps the aspect within
// 0.5 % of the source. Validates R21.2.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  reducedCopyTarget,
  PREVIEW_MAX_SIDE_PX,
  DETAIL_MAX_SIDE_PX,
  COPY_ASPECT_TOLERANCE,
} from './layoutTools.mjs';

test('reducedCopyTarget: no upscale, side cap, aspect within 0.5%', () => {
  fc.assert(
    fc.property(
      // Real decoded layout images: both sides within the decoded-dims domain
      // (checkDecodedDims caps the longest side at 8192) and the minor side big
      // enough that a down-scale does not collapse it to ~1 px, where integer
      // rounding alone cannot hold any aspect ratio. Aspect up to ~48:1 covers
      // panoramic site plans; 0.5 % is a resampling tolerance, not a rounding
      // guarantee for a 1-px-tall input.
      fc.integer({ min: 512, max: 8192 }),
      fc.integer({ min: 512, max: 8192 }),
      fc.constantFrom('preview', 'detail'),
      (w, h, kind) => {
        const t = reducedCopyTarget({ width: w, height: h }, kind);
        assert.ok(t, 'target returned');
        const cap = kind === 'detail' ? DETAIL_MAX_SIDE_PX : PREVIEW_MAX_SIDE_PX;
        // Never upscale.
        assert.ok(t.width <= w && t.height <= h, 'no upscale');
        // Longest side within the cap (rounding can only shrink, never exceed).
        assert.ok(Math.max(t.width, t.height) <= cap, 'side cap');
        // Aspect within 0.5 % of the source.
        const srcAspect = w / h;
        const dstAspect = t.width / t.height;
        assert.ok(
          Math.abs(dstAspect - srcAspect) / srcAspect <= COPY_ASPECT_TOLERANCE,
          `aspect drift ${w}x${h} ${kind}: ${srcAspect} vs ${dstAspect}`,
        );
        assert.ok(t.maxBytes === (kind === 'detail' ? 6291456 : 1572864));
      },
    ),
    { numRuns: 300 },
  );
});

test('reducedCopyTarget: each side is within half a pixel of the ideal scale', () => {
  // The exact guarantee integer pixels can give, for ANY size (including thin
  // images where a 0.5 % aspect tolerance is impossible): both sides equal the
  // ideal scaled value rounded, so the error is <= 0.5 px per side.
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 12000 }),
      fc.integer({ min: 1, max: 12000 }),
      fc.constantFrom('preview', 'detail'),
      (w, h, kind) => {
        const cap = kind === 'detail' ? DETAIL_MAX_SIDE_PX : PREVIEW_MAX_SIDE_PX;
        const t = reducedCopyTarget({ width: w, height: h }, kind);
        const factor = Math.min(1, cap / Math.max(w, h));
        // A side is the ideal rounded, except it is floored to 1 px (an image
        // cannot be 0 px wide/tall), so the error is <= 0.5 px unless the ideal
        // itself is below 1, where the clamp to 1 is the only sane choice.
        const within = (side, ideal) => Math.abs(side - ideal) <= 0.5 + 1e-9 || (ideal < 1 && side === 1);
        assert.ok(within(t.width, w * factor), `width ${t.width} vs ${w * factor}`);
        assert.ok(within(t.height, h * factor), `height ${t.height} vs ${h * factor}`);
      },
    ),
    { numRuns: 200 },
  );
});

test('reducedCopyTarget: source within cap keeps its exact size', () => {
  assert.deepEqual(
    reducedCopyTarget({ width: 1000, height: 800 }, 'detail'),
    { width: 1000, height: 800, maxBytes: 6291456 },
  );
  assert.deepEqual(
    reducedCopyTarget({ width: 500, height: 400 }, 'preview'),
    { width: 500, height: 400, maxBytes: 1572864 },
  );
});

test('reducedCopyTarget: invalid size returns null', () => {
  assert.equal(reducedCopyTarget({ width: 0, height: 10 }, 'preview'), null);
  assert.equal(reducedCopyTarget(null, 'detail'), null);
});
