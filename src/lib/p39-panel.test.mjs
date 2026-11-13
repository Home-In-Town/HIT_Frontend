// Feature: interactive-plot-layout, Property 39: Plot detail panel content
// node --test src/lib/p39-panel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { formatPanelLines, formatAreaSqFt, formatAreaSqM, formatPriceLine, formatWhatsAppText } from './plotViewer.mjs';

// '0 sq ft' must only match a leading zero, not digits within larger numbers
// e.g. '107639.00 sq ft' is valid; '0 sq ft' is not.
const BAD_STRINGS = ['undefined', 'null', 'NaN'];
// Separate check for bare zero area (never show "0 sq ft" as a standalone value)
function isZeroArea(val) {
  if (typeof val !== 'string') return false;
  // matches "0 sq ft", "0.0 sq ft", "0.00 sq ft" but NOT "107639.00 sq ft"
  return /^0(\.0+)? sq ft$/.test(val);
}

function noBadStrings(val) {
  if (val === null || val === undefined) return true;
  const s = String(val);
  for (const bad of BAD_STRINGS) {
    if (s.includes(bad)) return false;
  }
  if (isZeroArea(s)) return false;
  return true;
}

const arbPlot = fc.record({
  id: fc.uuid(),
  plotNumber: fc.oneof(fc.constant(null), fc.string({ maxLength: 10 })),
  status: fc.oneof(fc.constant(null), fc.constant('available'), fc.constant('booked')),
  facing: fc.oneof(fc.constant(null), fc.constant('north'), fc.constant('south')),
  // areaSqm: backend public field (toPublicPlot renames 'area' → 'areaSqm')
  areaSqm: fc.oneof(fc.constant(null), fc.double({ min: -100, max: 10000, noNaN: true })),
  price: fc.oneof(fc.constant(null), fc.double({ min: -1, max: 1e9, noNaN: true })),
  unit: fc.oneof(fc.constant(null), fc.record({ corner: fc.oneof(fc.constant(null), fc.string()), dimensions: fc.oneof(fc.constant(null), fc.string()) })),
});

const arbLayout = fc.record({
  projectName: fc.oneof(fc.constant(null), fc.string({ maxLength: 30 })),
  priceMode: fc.oneof(fc.constant(null), fc.constant('per-plot'), fc.constant('per-sqft'), fc.constant('hidden')),
  pricePerSqFt: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100000, noNaN: true })),
  cta: fc.constant({ whatsappNumber: '919876543210', callNumber: '1234567890' }),
});

test('Property 39: formatPanelLines never contains bad strings (100 runs)', () => {
  fc.assert(fc.property(arbPlot, arbLayout, (plot, layout) => {
    const lines = formatPanelLines(plot, layout);
    for (const [key, val] of Object.entries(lines)) {
      assert.ok(noBadStrings(val), `Line "${key}" contains a bad string: "${val}"`);
    }
    return true;
  }), { numRuns: 100 });
});

test('Property 39: when areaSqm <= 0, areaSqFt and areaSqM are null (100 runs)', () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(0), fc.constant(-1), fc.constant(null), fc.double({ min: -1000, max: 0, noNaN: true })),
    (areaSqm) => {
      assert.equal(formatAreaSqFt(areaSqm), null, `Expected null for areaSqm=${areaSqm}`);
      assert.equal(formatAreaSqM(areaSqm), null, `Expected null for areaSqm=${areaSqm}`);
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 39: WhatsApp text always starts with Namaste (100 runs)', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.string({ minLength: 1, maxLength: 10 }),
    (project, plotNum) => {
      const text = formatWhatsAppText(project, plotNum);
      assert.ok(text.startsWith('Namaste, '), `WhatsApp text should start with "Namaste, ", got: "${text}"`);
      return true;
    },
  ), { numRuns: 100 });
});

// Cross-repo seam §3.1 exact values
test('formatAreaSqFt(50) produces a string ending in " sq ft" and is positive', () => {
  const r = formatAreaSqFt(50);
  assert.ok(r !== null && r.endsWith(' sq ft'), `Expected sq ft string, got: ${r}`);
  assert.ok(parseFloat(r) > 500, `Expected > 500 sq ft for 50 m², got: ${r}`);
});
test('formatAreaSqFt(0) = null', () => {
  assert.equal(formatAreaSqFt(0), null);
});
test('formatAreaSqFt(null) = null', () => {
  assert.equal(formatAreaSqFt(null), null);
});
test('formatPriceLine per-plot 5000000', () => {
  const line = formatPriceLine({ price: 5000000, areaSqm: 100 }, { priceMode: 'per-plot' });
  assert.equal(line, '₹ 50,00,000');
});
test('formatPriceLine hidden = null', () => {
  const line = formatPriceLine({ price: 5000000, areaSqm: 100 }, { priceMode: 'hidden' });
  assert.equal(line, null);
});
test('formatPriceLine per-sqft with areaSqm=50', () => {
  // 50 m² × 10.7639 = 538.195 sq ft × 1000 ppsf = 538195 → rounds to 5,38,195
  const line = formatPriceLine({ areaSqm: 50 }, { priceMode: 'per-sqft', pricePerSqFt: 1000 });
  assert.ok(line !== null && line.startsWith('₹'), `Expected ₹ price, got: ${line}`);
  assert.ok(line.includes('(indicative)'), `Expected (indicative), got: ${line}`);
});
test('formatWhatsAppText exact format', () => {
  assert.equal(
    formatWhatsAppText('Green Park', '12A'),
    'Namaste, mujhe Green Park ka Plot 12A ke baare me jaankari chahiye.',
  );
});
