// Feature: interactive-plot-layout, Property 20: Plot-number normalisation
// node --test src/lib/p20-normalise.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { normalisePlotNumber } from './layoutTools.mjs';

test('Property 20: normalised result always matches /^[A-Z0-9\\/-]{1,20}$/ (100 runs)', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 0, maxLength: 40 }),
    (raw) => {
      const result = normalisePlotNumber(raw);
      if (result === null) return true; // invalid input → no constraint on result
      if (result === '') return raw.trim() === '' || raw === null; // empty input → empty result
      assert.ok(
        /^[A-Z0-9\/-]{1,20}$/.test(result),
        `result "${result}" for input "${raw}" does not match allowed charset`,
      );
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 20: lowercase is uppercased (100 runs)', () => {
  fc.assert(fc.property(
    fc.stringMatching(/^[a-z0-9\/-]{1,20}$/),
    (raw) => {
      const result = normalisePlotNumber(raw);
      // After uppercase, all [a-z] become [A-Z], all else ([0-9/-]) stay
      if (result !== null && result !== '') {
        assert.equal(result, raw.toUpperCase().replace(/[^A-Z0-9\/-]/g, ''));
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 20: characters outside [A-Z0-9/-] are stripped (100 runs)', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    (raw) => {
      const result = normalisePlotNumber(raw);
      if (result === null || result === '') return true;
      // Every character in the result is in the allowed set
      for (const ch of result) {
        assert.ok(/[A-Z0-9\/-]/.test(ch), `Unexpected char "${ch}" in result "${result}"`);
      }
      return true;
    },
  ), { numRuns: 100 });
});

test('identity: already-valid input is returned unchanged', () => {
  assert.equal(normalisePlotNumber('12A'), '12A');
  assert.equal(normalisePlotNumber('A-12'), 'A-12');
  assert.equal(normalisePlotNumber('P/Q'), 'P/Q');
});

test('lowercase uppercased', () => {
  assert.equal(normalisePlotNumber('12a'), '12A');
  assert.equal(normalisePlotNumber('abc'), 'ABC');
});

test('strips disallowed chars', () => {
  assert.equal(normalisePlotNumber('abc123!@#'), 'ABC123');
  assert.equal(normalisePlotNumber('hello world'), 'HELLOWORLD');
});

test('empty string returns empty string (clears the field)', () => {
  assert.equal(normalisePlotNumber(''), '');
  assert.equal(normalisePlotNumber(null), '');
  assert.equal(normalisePlotNumber(undefined), '');
});

test('all-stripped non-empty input returns null', () => {
  assert.equal(normalisePlotNumber('!!!'), null);
  assert.equal(normalisePlotNumber('  '), null);
});

test('> 20 chars after strip returns null', () => {
  assert.equal(normalisePlotNumber('a'.repeat(21)), null);
  assert.equal(normalisePlotNumber('A'.repeat(21)), null);
});

test('exactly 20 chars is accepted', () => {
  const r = normalisePlotNumber('A'.repeat(20));
  assert.equal(r, 'A'.repeat(20));
});
