// Feature: interactive-plot-layout, Property 21: Review classification and duplicate flags
// node --test src/components/layout-editor/p21-review-classes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { classifyPlot, computeDuplicateFlags, hasOIDigit } from './reviewState.mjs';

const arbPlot = fc.record({
  id: fc.uuid(),
  plotNumber: fc.oneof(fc.constant(''), fc.string({ maxLength: 20 })),
  boundaryConfidence: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true })),
  ocrConfidence: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true })),
  validationErrors: fc.oneof(fc.constant(null), fc.array(fc.string(), { maxLength: 3 })),
  saved: fc.boolean(),
  provenance: fc.oneof(fc.constant(null), fc.record({ approved: fc.boolean() })),
  deleted: fc.oneof(fc.constant(undefined), fc.boolean()),
});

test('Property 21: plot with any validation error is never valid (100 runs)', () => {
  fc.assert(fc.property(
    arbPlot.map((p) => ({ ...p, validationErrors: ['some-error'] })),
    (plot) => {
      const cls = classifyPlot(plot, new Set());
      assert.notEqual(cls, 'valid', `Expected non-valid for plot with errors`);
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 21: plot with ocrConfidence < 0.80 is at most needs-check (100 runs)', () => {
  fc.assert(fc.property(
    arbPlot.map((p) => ({ ...p, validationErrors: [], ocrConfidence: 0.5, boundaryConfidence: 0.95 })),
    (plot) => {
      const cls = classifyPlot(plot, new Set());
      assert.notEqual(cls, 'valid', `Expected non-valid for low ocrConfidence`);
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 21: two plots with same normalised number are both flagged (100 runs)', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1, maxLength: 10 }).map((s) => s.toUpperCase().replace(/[^A-Z0-9\/-]/g, '').slice(0, 10) || 'A'),
    fc.uuid(),
    fc.uuid(),
    (num, id1, id2) => {
      if (id1 === id2) return true; // skip same UUID (astronomically rare)
      const plots = [
        { id: id1, plotNumber: num },
        { id: id2, plotNumber: num.toLowerCase() }, // same after normalise
      ];
      const dups = computeDuplicateFlags(plots);
      assert.ok(dups.has(id1), `id1 not flagged as duplicate`);
      assert.ok(dups.has(id2), `id2 not flagged as duplicate`);
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 21: plot with O/I+digit is at most needs-check (100 runs)', () => {
  fc.assert(fc.property(
    fc.oneof(
      fc.constant('O1'), fc.constant('1O'), fc.constant('I5A'),
      fc.constant('AB0I'), fc.constant('3OB'),
    ),
    (num) => {
      const plot = { id: 'x', plotNumber: num, validationErrors: [], boundaryConfidence: 0.95, ocrConfidence: 0.95 };
      const cls = classifyPlot(plot, new Set());
      assert.notEqual(cls, 'valid', `Expected non-valid for OI-digit plot number "${num}"`);
      return true;
    },
  ), { numRuns: 100 });
});

test('hasOIDigit: true for O/I with digit', () => {
  assert.ok(hasOIDigit('O1'));
  assert.ok(hasOIDigit('I5'));
  assert.ok(hasOIDigit('AB1O'));
  assert.ok(hasOIDigit('o1')); // lowercase
});

test('hasOIDigit: false for no O/I or no digit', () => {
  assert.ok(!hasOIDigit('AB'));
  assert.ok(!hasOIDigit('12'));
  assert.ok(!hasOIDigit(''));
});
