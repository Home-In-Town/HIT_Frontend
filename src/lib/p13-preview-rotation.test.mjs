// Feature: interactive-plot-layout, Property 13: Preview rotation round trip
//
// Four 90-degree rotations return the original pixels and size (R3.3); one
// rotation swaps the dimensions and moves each pixel to (h-1-y, x).

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { rotate90 } from './layoutTools.mjs';

const image = fc.tuple(fc.integer({ min: 1, max: 24 }), fc.integer({ min: 1, max: 24 })).chain(([w, h]) =>
  fc.uint8Array({ minLength: w * h * 4, maxLength: w * h * 4 }).map((px) => ({ w, h, px })));

test('four rotations are the identity', () => {
  fc.assert(
    fc.property(image, ({ w, h, px }) => {
      let cur = { pixels: Uint8ClampedArray.from(px), width: w, height: h };
      for (let i = 0; i < 4; i += 1) cur = rotate90(cur.pixels, cur.width, cur.height);
      assert.equal(cur.width, w);
      assert.equal(cur.height, h);
      assert.deepEqual(Array.from(cur.pixels), Array.from(px));
    }),
    { numRuns: 200 },
  );
});

test('one rotation swaps dimensions and maps (x, y) to (h-1-y, x)', () => {
  fc.assert(
    fc.property(image, ({ w, h, px }) => {
      const r = rotate90(px, w, h);
      assert.equal(r.width, h);
      assert.equal(r.height, w);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const s = (y * w + x) * 4;
          const d = (x * r.width + (h - 1 - y)) * 4;
          for (let k = 0; k < 4; k += 1) assert.equal(r.pixels[d + k], px[s + k]);
        }
      }
    }),
    { numRuns: 100 },
  );
});

test('two rotations equal a 180-degree turn', () => {
  const px = Uint8ClampedArray.from([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255, 4, 4, 4, 255, 5, 5, 5, 255, 6, 6, 6, 255]);
  const a = rotate90(px, 3, 2);
  const b = rotate90(a.pixels, a.width, a.height);
  assert.equal(b.width, 3);
  assert.equal(b.height, 2);
  assert.deepEqual(Array.from(b.pixels).filter((_, i) => i % 4 === 0), [6, 5, 4, 3, 2, 1]);
});
