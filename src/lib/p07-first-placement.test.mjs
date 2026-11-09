// Feature: interactive-plot-layout, Property 7: First placement
//
// With a usable boundary (>= 3 vertices, none at Null Island) the overlay is
// centred on the bbox centre and is the largest aspect-preserving fit inside
// it; otherwise the project position (not Null Island) gets 200 m on the
// longest side; otherwise the map centre with a hint. Validates R5.1, R5.2,
// R5.4, R5.5.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { firstPlacement, initialOverlayDraft, isNullIsland, outsideIndia, pathExtentM, offsetCenter } from './layoutTools.mjs';

const image = { url: 'u', key: 'projects/p/overlay/x.png' };
const aspectArb = fc.double({ min: 0.25, max: 4, noNaN: true });
const siteArb = fc.record({ lat: fc.double({ min: 8, max: 35, noNaN: true }), lng: fc.double({ min: 69, max: 96, noNaN: true }) });

// A rectangular boundary of w x h metres around `c`.
const rect = (c, w, h) => [
  offsetCenter(c, -w / 2, -h / 2), offsetCenter(c, w / 2, -h / 2),
  offsetCenter(c, w / 2, h / 2), offsetCenter(c, -w / 2, h / 2),
];

test('boundary: bbox centre, largest fit, aspect within 0.5 %', () => {
  fc.assert(
    fc.property(siteArb, fc.double({ min: 30, max: 2000, noNaN: true }), fc.double({ min: 30, max: 2000, noNaN: true }), aspectArb, (c, w, h, aspect) => {
      const path = rect(c, w, h);
      const ext = pathExtentM(path);
      const r = firstPlacement({ image, boundaryPath: path, aspect });
      assert.equal(r.source, 'boundary');
      const d = r.draft;
      assert.ok(Math.abs(d.center.lat - ext.center.lat) < 1e-9 && Math.abs(d.center.lng - ext.center.lng) < 1e-9);
      assert.ok(d.widthM <= ext.widthM * 1.0001 && d.heightM <= ext.heightM * 1.0001, 'fits inside');
      // One side matches the bbox within 1 %.
      const wOk = Math.abs(d.widthM - ext.widthM) / ext.widthM <= 0.01;
      const hOk = Math.abs(d.heightM - ext.heightM) / ext.heightM <= 0.01;
      assert.ok(wOk || hOk, 'one side matches');
      assert.ok(Math.abs(d.heightM / d.widthM - aspect) / aspect <= 0.005, 'aspect');
    }),
    { numRuns: 200 },
  );
});

test('no usable boundary: project position, 200 m on the longest side', () => {
  fc.assert(
    fc.property(siteArb, aspectArb, fc.constantFrom('none', 'two', 'nullisland'), (c, aspect, kind) => {
      const boundaryPath = kind === 'none' ? null
        : kind === 'two' ? [c, { lat: c.lat + 0.001, lng: c.lng }]
          : [{ lat: 0, lng: 0 }, { lat: 0.0001, lng: 0 }, { lat: 0, lng: 0.0001 }, c];
      const r = firstPlacement({ image, boundaryPath, fallbackCenter: c, aspect });
      assert.equal(r.source, 'project');
      const longest = Math.max(r.draft.widthM, r.draft.heightM);
      assert.ok(Math.abs(longest - 200) <= 1);
      assert.ok(Math.abs(r.draft.heightM / r.draft.widthM - aspect) / aspect <= 0.005);
      assert.equal(r.draft.center.lat, c.lat);
      assert.equal(r.draft.center.lng, c.lng);
    }),
    { numRuns: 200 },
  );
});

test('Null Island project position falls through to the map centre with a hint', () => {
  const r = firstPlacement({ image, fallbackCenter: { lat: 0, lng: 0 }, mapCenter: { lat: 21, lng: 79 }, aspect: 1 });
  assert.equal(r.source, 'map');
  assert.ok(r.hint && /search|pan/i.test(r.hint));
  assert.deepEqual(r.draft.center, { lat: 21, lng: 79 });
});

test('nothing usable: no draft; initialOverlayDraft agrees', () => {
  assert.equal(firstPlacement({ image, fallbackCenter: { lat: 0, lng: 0 } }).draft, null);
  assert.equal(initialOverlayDraft({ image }), null);
});

test('isNullIsland / outsideIndia', () => {
  assert.equal(isNullIsland({ lat: 0, lng: 0 }), true);
  assert.equal(isNullIsland({ lat: 0.0009, lng: -0.0009 }), true);
  assert.equal(isNullIsland({ lat: 0.001, lng: 0 }), false);
  assert.equal(outsideIndia({ lat: 21.1, lng: 79.1 }), false);
  assert.equal(outsideIndia({ lat: 51.5, lng: -0.1 }), true);
  assert.equal(outsideIndia(null), false);
});
