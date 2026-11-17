// node --test src/lib/propertySchema.test.mjs
// Web copy of the category logic against the shared fixture that the backend and
// mobile also run (byte-identical, hash pinned below).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  familyOf, isPlotFamily, categoryForPlotType, validateProjectBody, deriveProjectFields, toSqft, fromSqft,
  parsePlotSizeRange, summaryLine, plotDetailRows, showsField, FAMILY_FIELDS, PLOT_AMENITY_OPTIONS,
  LAYOUT_TYPE_SUGGESTIONS, DEVELOPMENT_STATUSES, shapeProjectPayload, cleanPlotDetails,
} from './propertySchema.mjs';

const fx = JSON.parse(readFileSync(new URL('./__fixtures__/property-schema-fixture.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));

test('shared property-schema fixture is the byte-identical master copy', () => {
  assert.equal(
    createHash('sha256').update(readFileSync(new URL('./__fixtures__/property-schema-fixture.json', import.meta.url))).digest('hex'),
    '4af0d573f3a876a25d36343f1ebc2ab2cbbbe77258cae4600409629d9266f4c7',
  );
});

test('familyOf / isPlotFamily follow the fixture cases', () => {
  for (const c of fx.familyCases) {
    assert.equal(familyOf(c), c.family, `${c.propertyType}|${c.projectType}`);
    assert.equal(isPlotFamily(c), c.isPlot, `${c.propertyType}|${c.projectType}`);
  }
});

test('every fixture type maps to its family and category', () => {
  for (const t of fx.types) {
    assert.equal(familyOf({ propertyType: t.label }), t.family, t.label);
    assert.equal(categoryForPlotType(t.label), t.category, t.label);
  }
});

test('FAMILY_FIELDS, option lists and development statuses equal the fixture', () => {
  assert.deepEqual(FAMILY_FIELDS, fx.fieldsByFamily);
  assert.deepEqual(PLOT_AMENITY_OPTIONS, fx.plotAmenityOptions);
  assert.deepEqual(LAYOUT_TYPE_SUGGESTIONS, fx.layoutTypeSuggestions);
  assert.deepEqual(DEVELOPMENT_STATUSES, fx.developmentStatuses);
});

test('plot family hides BHK / carpet / floor, residential keeps them', () => {
  for (const f of ['bhkOptions', 'carpetAreaRange', 'floorRange', 'unitSetup']) assert.equal(showsField('plot', f), false, f);
  for (const f of ['landArea', 'plotSize', 'roadWidthsFt', 'layoutTypes']) assert.equal(showsField('plot', f), true, f);
  for (const f of ['bhkOptions', 'carpetAreaRange', 'floorRange']) assert.equal(showsField('residential', f), true, f);
  assert.equal(showsField('residential', 'plotSize'), false);
});

test('validateProjectBody follows the fixture cases', () => {
  for (const c of fx.validationCases) {
    const r = validateProjectBody(c.body, { isCreate: c.isCreate });
    assert.deepEqual(Object.keys(r.fields).sort(), c.expectedPaths, c.name);
    assert.equal(r.errors.length, new Set(Object.values(r.fields)).size, c.name);
  }
});

test('deriveProjectFields follows the fixture cases', () => {
  for (const c of fx.derivationCases) {
    const { body: b, familyChange } = deriveProjectFields(c.body, { stored: c.stored, isCreate: c.isCreate });
    const e = c.expected;
    assert.equal(Object.prototype.hasOwnProperty.call(b, 'projectType'), e.projectTypeSent, c.name);
    if (e.projectTypeSent) assert.equal(b.projectType, e.projectType, c.name);
    assert.equal(b.category ?? null, e.category, c.name);
    assert.equal(b.configuration?.plotSizeRange ?? null, e.plotSizeRange, c.name);
    assert.equal(b.pricing?.pricePerSqFt ?? null, e.pricePerSqFt, c.name);
    const sqft = b.plotDetails && Object.prototype.hasOwnProperty.call(b.plotDetails, 'landAreaSqft') ? b.plotDetails.landAreaSqft : null;
    assert.equal(sqft, e.landAreaSqft, c.name);
    assert.deepEqual(familyChange, e.familyChange, c.name);
  }
});

test('a plot save never touches residential values', () => {
  const r = deriveProjectFields(
    { propertyType: 'Residential Plot', plotDetails: { totalPlots: 5 } },
    { stored: { propertyType: 'Residential Plot', projectType: 'plot', configuration: { bhkOptions: ['2BHK'] } } },
  );
  assert.equal(r.body.configuration, undefined);
});

test('units, display, parse and summary follow the fixture', () => {
  for (const c of fx.unitCases) assert.equal(Number(toSqft(c.value, c.from).toFixed(2)), c.toSqft);
  for (const c of fx.displayCases) assert.equal(fromSqft(c.sqft, c.unit), c.expected);
  for (const c of fx.parseCases) assert.deepEqual(parsePlotSizeRange(c.input), c.expected, c.input);
  for (const c of fx.summaryCases) assert.equal(summaryLine(c.project), c.line, c.name);
});

const FORM = {
  name: 'A', type: 'flat', category: 'Residential', propertyType: 'Apartment / Flat', startingPrice: 1,
  bhkOptions: ['2BHK'], carpetAreaRange: '800 - 900 sqft', floorRange: '1-5', plotSizeRange: '1000 - 1200 sqft', facingOptions: ['East'],
  plotDetails: { totalPlots: 4 },
};

test('shapeProjectPayload: plot save leaves out bhk / carpet / floor / projectType so stored residential values survive', () => {
  const out = shapeProjectPayload({ ...FORM, propertyType: 'Residential Plot', plotDetails: { totalPlots: 40, plotSize: { minSqft: 1000, maxSqft: 2400 } } });
  for (const k of ['bhkOptions', 'carpetAreaRange', 'floorRange', 'type']) assert.equal(Object.prototype.hasOwnProperty.call(out, k), false, k);
  assert.equal(out.plotSizeRange, '1000 - 2400 sqft');
  assert.deepEqual(out.plotDetails, { totalPlots: 40, plotSize: { minSqft: 1000, maxSqft: 2400 } });
  assert.deepEqual(out.facingOptions, ['East']);
});

test('shapeProjectPayload: residential save carries no plot fields, mixed use keeps its plot size', () => {
  const res = shapeProjectPayload(FORM);
  assert.equal('plotDetails' in res, false);
  assert.equal('plotSizeRange' in res, false);
  assert.deepEqual(res.bhkOptions, ['2BHK']);
  const mixed = shapeProjectPayload({ ...FORM, category: 'Mixed Use', propertyType: 'Mixed-Use Tower' });
  assert.equal(mixed.plotSizeRange, '1000 - 1200 sqft');
  assert.equal('plotDetails' in mixed, false);
});

test('cleanPlotDetails: empty values are left out, an emptied stored value is sent as null', () => {
  const stored = { roadWidthsFt: [30], naOrderNumber: 'NA/1', totalPlots: 5 };
  const out = cleanPlotDetails({ roadWidthsFt: [], naOrderNumber: '', totalPlots: 5, tpApproval: '', landAreaSqft: 99 }, stored);
  assert.deepEqual(out, { roadWidthsFt: null, naOrderNumber: null, totalPlots: 5 });
  assert.deepEqual(cleanPlotDetails({ totalPlots: undefined }, undefined), {});
});

test('plotDetailRows lists the plot facts and nothing for a project without them', () => {
  const full = fx.summaryCases[0].project;
  const rows = plotDetailRows(full);
  assert.deepEqual(rows.map((r) => r[0]), ['Total Plots', 'Land Area', 'Plot Size', 'Plot Price', 'Price / sq ft', 'Road Width', 'Layout Type', 'NA Order', 'TP Approval', 'Development']);
  assert.deepEqual(plotDetailRows({}), []);
  assert.deepEqual(plotDetailRows(null), []);
});
