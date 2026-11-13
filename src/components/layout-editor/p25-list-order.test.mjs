// Feature: interactive-plot-layout, Property 25: Review list order and filter
// node --test src/components/layout-editor/p25-list-order.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { sortAndFilterPlots } from './reviewState.mjs';

const arbPlot = (id) => fc.record({
  id: fc.constant(id),
  plotNumber: fc.string({ maxLength: 10 }),
  boundaryConfidence: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true })),
  ocrConfidence: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true })),
  validationErrors: fc.oneof(fc.constant([]), fc.array(fc.constant('err'), { minLength: 1, maxLength: 1 })),
  saved: fc.boolean(),
  provenance: fc.oneof(fc.constant(null), fc.record({ approved: fc.boolean() })),
  deleted: fc.oneof(fc.constant(undefined), fc.constant(false)),
});

test('Property 25: ascending sort: adjacent entries satisfy a.minConf <= b.minConf (100 runs)', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 0, max: 99 }).chain((i) => arbPlot(`id${i}`)), { minLength: 1, maxLength: 20 }),
    (plots) => {
      const sorted = sortAndFilterPlots(plots, { sortDir: 'asc', filter: 'all' });
      const minConf = (p) => Math.min(
        Number.isFinite(Number(p.boundaryConfidence)) ? Number(p.boundaryConfidence) : 0,
        Number.isFinite(Number(p.ocrConfidence)) ? Number(p.ocrConfidence) : 0,
      );
      for (let i = 1; i < sorted.length; i++) {
        assert.ok(
          minConf(sorted[i - 1]) <= minConf(sorted[i]) + 1e-10,
          `Ascending sort violated: ${minConf(sorted[i-1])} > ${minConf(sorted[i])}`,
        );
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 25: filter invalid returns only plots with errors (100 runs)', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 0, max: 99 }).chain((i) => arbPlot(`id${i}`)), { minLength: 1, maxLength: 20 }),
    (plots) => {
      const filtered = sortAndFilterPlots(plots, { sortDir: 'asc', filter: 'invalid' });
      for (const p of filtered) {
        assert.ok(
          Array.isArray(p.validationErrors) && p.validationErrors.length > 0,
          `Non-invalid plot in invalid filter result: ${JSON.stringify(p)}`,
        );
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 25: filter approved returns only saved+approved plots (100 runs)', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 0, max: 99 }).chain((i) => arbPlot(`id${i}`)), { minLength: 1, maxLength: 20 }),
    (plots) => {
      const filtered = sortAndFilterPlots(plots, { sortDir: 'asc', filter: 'approved' });
      for (const p of filtered) {
        assert.ok(p.saved === true, `Non-saved plot in approved filter: ${JSON.stringify(p)}`);
        assert.ok(p.provenance?.approved === true, `Non-approved plot in approved filter: ${JSON.stringify(p)}`);
      }
      return true;
    },
  ), { numRuns: 100 });
});
