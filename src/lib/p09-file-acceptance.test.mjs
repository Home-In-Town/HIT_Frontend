// Feature: interactive-plot-layout, Property 9: File acceptance
//
// For any file name, browser MIME type and size, checkLayoutFile accepts the
// file iff the case-insensitive extension and the MIME identify the same
// accepted type, the size is > 0, and the size is within the image cap
// (26,214,400) or the PDF cap (52,428,800). Validates R1.2, R1.4.

import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  checkLayoutFile,
  ACCEPTED_LAYOUT_TYPES,
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
} from './layoutTools.mjs';

// A small reference implementation of the spec rule, independent of the code
// under test, so the property checks behaviour and not a copy of itself.
const EXT_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf',
};
const EXTS = Object.keys(ACCEPTED_LAYOUT_TYPES);

test('checkLayoutFile accepts exactly the spec-valid files', () => {
  fc.assert(
    fc.property(
      // ext picked from accepted + some junk ones
      fc.constantFrom(...EXTS, 'svg', 'gif', 'txt', ''),
      // mime from the accepted set + junk
      fc.constantFrom('image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'image/svg+xml', 'text/plain', ''),
      fc.integer({ min: 0, max: 60000000 }),
      fc.string(),
      (ext, type, size, stem) => {
        const name = ext ? `${stem}.${ext}` : stem.replace(/\./g, '_');
        const res = checkLayoutFile({ name, type, size });
        const isAccepted = EXTS.includes(ext) && EXT_MIME[ext] === type;
        if (!isAccepted) {
          assert.equal(res.ok, false);
          assert.equal(res.reason, 'type');
          return;
        }
        if (size === 0) {
          assert.deepEqual(res, { ok: false, reason: 'empty' });
          return;
        }
        const limit = ext === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
        if (size > limit) {
          assert.deepEqual(res, { ok: false, reason: 'size', limit });
          return;
        }
        assert.deepEqual(res, { ok: true, kind: ext === 'pdf' ? 'pdf' : 'image' });
      },
    ),
    { numRuns: 300 },
  );
});

test('extension match is case-insensitive', () => {
  fc.assert(
    fc.property(fc.constantFrom('PNG', 'Jpg', 'WEBP', 'Pdf'), (ext) => {
      const type = EXT_MIME[ext.toLowerCase()];
      const res = checkLayoutFile({ name: `plan.${ext}`, type, size: 1000 });
      assert.equal(res.ok, true);
    }),
    { numRuns: 100 },
  );
});
