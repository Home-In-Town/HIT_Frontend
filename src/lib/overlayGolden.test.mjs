// Golden-file test for the shared Overlay_Transform in src/lib/layoutTools.mjs
// (interactive-plot-layout design 7.3, R10.2, R23.3, R23.9).
//
// R23.9: the project keeps ONE shared Overlay_Transform and the HIT_Frontend,
// HIT_Mobile and HIT_Backend suites each run every golden case at 1e-9 deg per
// corner coordinate. This is the HIT_Frontend half, the counterpart of
// HIT_Backend tests/overlayTransform.golden.test.js. The fixtures in
// src/lib/__fixtures__/*.json are byte-for-byte copies of the backend's, so
// all three repos check against ONE answer.
//
// Run with `node --test` (HIT_Frontend has no jest). No npm imports, so it
// loads in bare Node like the rest of layoutTools.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  imageToGeo,
  corners,
  solveTwoPoint,
} from './layoutTools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, '__fixtures__');
const GOLDEN_FILE = path.join(FIXTURES_DIR, 'overlay-golden.v1.json');
const PUBLIC_FILE = path.join(FIXTURES_DIR, 'public-overlay.v1.json');

// R23.9 tolerance: 1e-9 deg per coordinate.
const TOL_DEG = 1e-9;

// SHA-256 of each fixture, as committed. The three repos embed the SAME two
// constants (see HIT_Backend tests/overlayTransform.golden.test.js). Hashing is
// done AFTER CRLF -> LF normalisation because .gitattributes
// (`src/lib/__fixtures__/*.json -text`) keeps these files LF in the repo, but a
// Windows checkout without that attribute would otherwise flip the hash purely
// from line endings. The backend generator writes "\n", so LF is canonical.
const SHA = {
  'overlay-golden.v1.json': 'e3d64080aede3e91807c2765dfc6777d3353ce7e241801cac1f8fa0f8c9c002c',
  'public-overlay.v1.json': '76eae4f30b3f09142882ecdd8347fc354fb6ff7e79c46dc4f45f5d8a181b4e67',
};

const toLf = (text) => text.replace(/\r\n/g, '\n');
const sha256 = (text) => crypto.createHash('sha256').update(toLf(text), 'utf8').digest('hex');
const readRaw = (file) => fs.readFileSync(file, 'utf8');
const readJson = (file) => JSON.parse(readRaw(file));

const assertNearGeo = (actual, expected, label) => {
  assert.ok(Math.abs(actual.lat - expected.lat) <= TOL_DEG, `lat mismatch at ${label}`);
  assert.ok(Math.abs(actual.lng - expected.lng) <= TOL_DEG, `lng mismatch at ${label}`);
};

const golden = readJson(GOLDEN_FILE);
const publicFixture = readJson(PUBLIC_FILE);

test('overlay-golden.v1.json matches the embedded SHA-256 (LF-normalised)', () => {
  assert.equal(sha256(readRaw(GOLDEN_FILE)), SHA['overlay-golden.v1.json']);
});

test('public-overlay.v1.json matches the embedded SHA-256 (LF-normalised)', () => {
  assert.equal(sha256(readRaw(PUBLIC_FILE)), SHA['public-overlay.v1.json']);
});

test('golden fixture is populated and tagged 1e-9', () => {
  assert.equal(golden.toleranceDeg, TOL_DEG);
  assert.ok(golden.cases.length > 0);
});

test('transform cases: corners agree at 1e-9', () => {
  const transformCases = golden.cases.filter((c) => c.kind === 'transform');
  assert.ok(transformCases.length > 0);
  for (const c of transformCases) {
    const got = corners(c.input.transform);
    assert.equal(got.length, c.expected.corners.length);
    c.expected.corners.forEach((exp, i) => assertNearGeo(got[i], exp, `${c.id} corner ${i}`));
  }
});

test('transform cases: imageToGeo samples agree at 1e-9', () => {
  const transformCases = golden.cases.filter((c) => c.kind === 'transform');
  for (const c of transformCases) {
    const { transform, imageSize } = c.input;
    if (!imageSize) {
      // Legacy case: corners only (R23.3).
      assert.equal(c.expected.imageToGeo.length, 0);
      continue;
    }
    assert.ok(c.expected.imageToGeo.length > 0);
    c.expected.imageToGeo.forEach((sample, i) => {
      const got = imageToGeo(transform, imageSize, sample.image);
      assertNearGeo(got, sample.geo, `${c.id} sample ${i}`);
    });
  }
});

test('two-point cases: solveTwoPoint matches the fixture at 1e-9', () => {
  const twoPointCases = golden.cases.filter((c) => c.kind === 'twoPoint');
  assert.ok(twoPointCases.length > 0);
  for (const c of twoPointCases) {
    const { imageSize, p1, p2 } = c.input;
    const r = solveTwoPoint(imageSize, p1, p2);
    if (!c.expected.ok) {
      assert.equal(r.ok, false);
      assert.equal(r.check, c.expected.check);
      continue;
    }
    assert.equal(r.ok, true);
    const exp = c.expected.transform;
    assertNearGeo(r.transform.center, exp.center, `${c.id} center`);
    assert.ok(Math.abs(r.transform.widthM - exp.widthM) <= TOL_DEG, `${c.id} widthM`);
    assert.ok(Math.abs(r.transform.heightM - exp.heightM) <= TOL_DEG, `${c.id} heightM`);
    const dRot = Math.abs(r.transform.rotationDeg - exp.rotationDeg);
    assert.ok(Math.min(dRot, Math.abs(360 - dRot)) <= TOL_DEG, `${c.id} rotationDeg`);
    const got = corners(r.transform);
    c.expected.corners.forEach((cexp, i) => assertNearGeo(got[i], cexp, `${c.id} solved corner ${i}`));
  }
});

test('public overlay fixture: corners rebuilt from the stored transform match', () => {
  // toPublicLayout builds corners from overlayTransform.corners. The fixture
  // carries them as `overlay.corners`; recompute and compare at 1e-9. The
  // legacy case still has 4 finite corners (R23.3) with null preview/detail.
  for (const c of publicFixture.cases) {
    const o = c.overlay;
    const got = corners({
      center: o.center, widthM: o.widthM, heightM: o.heightM, rotationDeg: o.rotationDeg,
    });
    assert.equal(got.length, o.corners.length);
    o.corners.forEach((exp, i) => assertNearGeo(got[i], exp, `${c.id} public corner ${i}`));
  }
  const legacy = publicFixture.cases.find((c) => c.id === 'legacy');
  assert.ok(legacy);
  assert.equal(legacy.overlay.previewUrl, null);
  assert.equal(legacy.overlay.detailUrl, null);
  assert.equal(legacy.overlay.imageSize, null);
  assert.equal(legacy.overlay.corners.length, 4);
});
