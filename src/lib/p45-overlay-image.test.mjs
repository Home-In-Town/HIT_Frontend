// Feature: interactive-plot-layout, Property 45: Overlay image selection and fallback
//
// Driven by the shared public-overlay.v1.json fixture plus generated failure
// sets. The preview is used until zoomed in; the sharper image wins when zoomed
// in; failures fall back as R21.7 says; mobile never takes the full image
// unless both copies are null. Validates R21.3, R21.7.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { chooseOverlayImage } from './plotViewer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, '__fixtures__', 'public-overlay.v1.json'), 'utf8'));
const urlsOf = (o) => ({ image: o.image.url, preview: o.previewUrl, detail: o.detailUrl });

const failuresArb = fc.record({ preview: fc.boolean(), detail: fc.boolean(), image: fc.boolean() });
const caseArb = fc.constantFrom(...fixture.cases);

test('fixture has a new overlay (copies present) and a legacy one (copies null)', () => {
  const kinds = fixture.cases.map((c) => (c.overlay.previewUrl ? 'new' : 'legacy')).sort();
  assert.deepEqual(kinds, ['legacy', 'new']);
});

test('result is never a failed URL, and is "unavailable" only when nothing usable is left', () => {
  fc.assert(
    fc.property(caseArb, fc.constantFrom('web', 'mobile'), fc.option(fc.constantFrom(1, 2, 4, 8), { nil: null }),
      fc.double({ min: 0, max: 4, noNaN: true }), failuresArb, (c, platform, deviceMemory, zoomRatio, failures) => {
        const urls = urlsOf(c.overlay);
        const r = chooseOverlayImage({ platform, deviceMemory, zoomRatio, urls, failures });
        if (r.unavailable) { assert.equal(r.url, null); return; }
        assert.ok(r.url);
        assert.equal(failures[r.kind], false, `chose failed ${r.kind}`);
        assert.equal(r.url, urls[r.kind]);
      }),
    { numRuns: 300 },
  );
});

test('new overlay, no failures: preview until zoomed in, then the sharper image', () => {
  const o = fixture.cases.find((c) => c.overlay.previewUrl).overlay;
  const urls = urlsOf(o);
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 0.5 }).kind, 'preview');
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 1.5 }).kind, 'image');
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 1.5, deviceMemory: 2 }).kind, 'detail');
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 1.5, platform: 'mobile' }).kind, 'detail');
});

test('mobile never returns the full image while a copy exists', () => {
  fc.assert(
    fc.property(fc.double({ min: 0, max: 4, noNaN: true }), failuresArb, (zoomRatio, failures) => {
      const o = fixture.cases.find((c) => c.overlay.previewUrl).overlay;
      const r = chooseOverlayImage({ platform: 'mobile', zoomRatio, urls: urlsOf(o), failures });
      assert.notEqual(r.kind, 'image');
    }),
    { numRuns: 200 },
  );
});

test('fallbacks: preview fails -> sharper; sharper fails -> keep preview; both fail -> unavailable', () => {
  const urls = urlsOf(fixture.cases.find((c) => c.overlay.previewUrl).overlay);
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 0.2, failures: { preview: true } }).kind, 'image');
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 3, failures: { image: true, detail: true } }).kind, 'preview');
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 0.2, failures: { preview: true, image: true, detail: true } }).unavailable, true);
});

test('legacy overlay: the full image is the only image', () => {
  const urls = urlsOf(fixture.cases.find((c) => !c.overlay.previewUrl).overlay);
  assert.equal(chooseOverlayImage({ urls, zoomRatio: 0.1 }).kind, 'image');
  assert.equal(chooseOverlayImage({ urls, platform: 'mobile' }).kind, 'image');
  assert.equal(chooseOverlayImage({ urls, failures: { image: true } }).unavailable, true);
});
