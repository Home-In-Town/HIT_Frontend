// Task 10.5: the editor places the image with a CSS matrix() derived from the
// projected NW/NE/SW corners (design 7.2). Pure maths only; the map projection
// is faked with a flat metres->px scale.

import test from 'node:test';
import assert from 'node:assert/strict';
import { cornersToMatrix, matrixToCss, overlayGeometry } from './layoutTools.mjs';

const apply = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('axis-aligned corners give a pure scale + translate', () => {
  const m = cornersToMatrix({ x: 10, y: 20 }, { x: 110, y: 20 }, { x: 10, y: 70 }, 50, 25);
  assert.deepEqual(m, [2, 0, 0, 2, 10, 20]);
});

test('the matrix maps the natural image corners onto NW, NE and SW', () => {
  const nw = { x: 31.5, y: -4 }, ne = { x: 120, y: 33 }, sw = { x: -2, y: 90 };
  const W = 640, H = 480;
  const m = cornersToMatrix(nw, ne, sw, W, H);
  for (const [got, want, name] of [[apply(m, 0, 0), nw, 'NW'], [apply(m, W, 0), ne, 'NE'], [apply(m, 0, H), sw, 'SW']]) {
    near(got.x, want.x, `${name}.x`);
    near(got.y, want.y, `${name}.y`);
  }
});

test('a rotated overlay yields a rotation matrix of the same angle', () => {
  const g = overlayGeometry({ center: { lat: 0, lng: 0 }, widthM: 100, heightM: 60, rotationDeg: 30 });
  // Flat projection: 1 deg lng/lat = 1 px * 1e5, y grows southward.
  const px = (c) => ({ x: c.lng * 1e5, y: -c.lat * 1e5 });
  const [nw, ne, , sw] = g.corners.map(px);
  const m = cornersToMatrix(nw, ne, sw, 100, 60);
  const angle = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  assert.ok(Math.abs(angle - 30) < 0.01, `angle ${angle}`);
});

test('unusable input returns null instead of a NaN matrix', () => {
  const p = { x: 0, y: 0 };
  assert.equal(cornersToMatrix(p, p, p, 0, 10), null);
  assert.equal(cornersToMatrix(p, p, p, 10, -1), null);
  assert.equal(cornersToMatrix(null, p, p, 10, 10), null);
  assert.equal(cornersToMatrix(p, { x: NaN, y: 0 }, p, 10, 10), null);
});

test('matrixToCss formats the six values', () => {
  assert.equal(matrixToCss([1, 0, 0, 1, 5, 6]), 'matrix(1, 0, 0, 1, 5, 6)');
});
