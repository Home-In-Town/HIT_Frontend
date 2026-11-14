// Feature: interactive-plot-layout, Property 41: Plot search
// node --test src/lib/p41-search.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { searchPlots } from './plotViewer.mjs';
import { normalisePlotNumber } from './layoutTools.mjs';

const arbPlots = fc.array(
  fc.record({ id: fc.uuid(), plotNumber: fc.oneof(fc.constant(null), fc.string({ maxLength: 15 })) }),
  { minLength: 0, maxLength: 20 },
);

test('Property 41: searchPlots(plots, "") always returns [] (100 runs)', () => {
  fc.assert(fc.property(arbPlots, (plots) => {
    const result = searchPlots(plots, '');
    assert.equal(result.length, 0, 'Empty query should return empty array');
    return true;
  }), { numRuns: 100 });
});

test('Property 41: whitespace-only query returns [] (100 runs)', () => {
  fc.assert(fc.property(
    arbPlots,
    fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim() === ''),
    (plots, ws) => {
      const result = searchPlots(plots, ws);
      assert.equal(result.length, 0, `Whitespace query "${ws}" should return []`);
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 41: every returned plot normalised number starts with normalised query (100 runs)', () => {
  fc.assert(fc.property(
    arbPlots,
    fc.string({ minLength: 1, maxLength: 8 }),
    (plots, query) => {
      const results = searchPlots(plots, query);
      const q = normalisePlotNumber(query.trim());
      if (!q) {
        assert.equal(results.length, 0, 'Non-normalisable query should return []');
        return true;
      }
      for (const p of results) {
        const n = normalisePlotNumber(String(p.plotNumber ?? ''));
        assert.ok(n && n.startsWith(q), `Plot "${p.plotNumber}" (normalised: "${n}") does not start with query "${q}"`);
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('searchPlots matches by prefix', () => {
  const plots = [
    { id: '1', plotNumber: '12A' },
    { id: '2', plotNumber: '12B' },
    { id: '3', plotNumber: '5' },
  ];
  const r = searchPlots(plots, '12');
  assert.equal(r.length, 2);
  assert.ok(r.some((p) => p.id === '1'));
  assert.ok(r.some((p) => p.id === '2'));
});

test('searchPlots returns [] for no match', () => {
  const plots = [{ id: '1', plotNumber: 'ABC' }];
  assert.equal(searchPlots(plots, 'XYZ').length, 0);
});
