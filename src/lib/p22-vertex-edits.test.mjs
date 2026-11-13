// Feature: interactive-plot-layout, Property 22: Vertex edits keep the ring legal
// node --test src/lib/p22-vertex-edits.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { addVertex, moveVertex, removeVertex, VERTEX_MIN, VERTEX_MAX } from './layoutTools.mjs';

/** Arbitrary {lat,lng} point. */
const arbPt = fc.record({ lat: fc.double({ min: -90, max: 90, noNaN: true }), lng: fc.double({ min: -180, max: 180, noNaN: true }) });

/** Arbitrary ring with n vertices. */
const arbRing = (n) => fc.array(arbPt, { minLength: n, maxLength: n });

test('Property 22: removeVertex on a 3-vertex ring returns null (100 runs)', () => {
  fc.assert(fc.property(
    arbRing(VERTEX_MIN),
    fc.integer({ min: 0, max: VERTEX_MIN - 1 }),
    (ring, idx) => {
      const result = removeVertex(ring, idx);
      assert.equal(result, null, 'Should refuse to remove below VERTEX_MIN');
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 22: addVertex on a 200-vertex ring returns null (100 runs)', () => {
  fc.assert(fc.property(
    arbRing(VERTEX_MAX),
    fc.integer({ min: 0, max: VERTEX_MAX - 1 }),
    arbPt,
    (ring, idx, pt) => {
      const result = addVertex(ring, idx, pt);
      assert.equal(result, null, 'Should refuse to add above VERTEX_MAX');
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 22: chain of valid vertex ops keeps ring in [3, 200] (100 runs)', () => {
  fc.assert(fc.property(
    fc.integer({ min: VERTEX_MIN, max: 10 }).chain((n) => arbRing(n)),
    fc.array(fc.oneof(
      fc.record({ op: fc.constant('move'), idx: fc.integer({ min: 0, max: 9 }), pt: arbPt }),
      fc.record({ op: fc.constant('add'), idx: fc.integer({ min: 0, max: 9 }), pt: arbPt }),
      fc.record({ op: fc.constant('remove'), idx: fc.integer({ min: 0, max: 9 }) }),
    ), { minLength: 1, maxLength: 20 }),
    (ring, ops) => {
      let r = ring;
      for (const op of ops) {
        const i = op.idx % Math.max(1, r.length);
        if (op.op === 'move') {
          r = moveVertex(r, i, op.pt);
        } else if (op.op === 'add') {
          const next = addVertex(r, i, op.pt);
          if (next !== null) r = next;
        } else {
          const next = removeVertex(r, i);
          if (next !== null) r = next;
        }
        assert.ok(r.length >= VERTEX_MIN, `Ring shrunk below ${VERTEX_MIN}`);
        assert.ok(r.length <= VERTEX_MAX, `Ring grew above ${VERTEX_MAX}`);
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('addVertex inserts at the right position', () => {
  const ring = [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }];
  const pt = { lat: 0.5, lng: 0.5 };
  const result = addVertex(ring, 1, pt);
  assert.ok(result !== null);
  assert.equal(result.length, 4);
  assert.deepEqual(result[2], pt);
});

test('removeVertex removes at the right position', () => {
  const ring = [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }, { lat: 0, lng: 1 }];
  const result = removeVertex(ring, 1);
  assert.ok(result !== null);
  assert.equal(result.length, 3);
  assert.deepEqual(result[1], { lat: 1, lng: 1 });
});
