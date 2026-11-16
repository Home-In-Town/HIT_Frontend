// node --test src/lib/transformProject.test.mjs
// Pins that transformBackendToFrontend keeps `plotMap` (the one field the web
// project list needs to show "Plot Map" only where E2 will answer 200). The
// mapping lives in plotMap.mjs as mapPlotMapField (a plain .mjs function so
// node --test can import it); transformBackendToFrontend calls it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPlotMapField } from './plotMap.mjs';

test('mapPlotMapField keeps enabled + layoutId and drops everything else', () => {
  assert.deepEqual(mapPlotMapField({ enabled: true, layoutId: '64f0', publishLockAt: 'x' }), { enabled: true, layoutId: '64f0' });
});

test('mapPlotMapField: absent field stays absent (undefined, not null)', () => {
  assert.equal(mapPlotMapField(undefined), undefined);
  assert.equal(mapPlotMapField(null), undefined);
});

test('mapPlotMapField: a truthy non-boolean enabled becomes false', () => {
  assert.deepEqual(mapPlotMapField({ enabled: 'yes', layoutId: null }), { enabled: false, layoutId: null });
  assert.deepEqual(mapPlotMapField({ enabled: 1, layoutId: 'a' }), { enabled: false, layoutId: 'a' });
});

test('mapPlotMapField: a non-string layoutId is stringified', () => {
  // MongoDB ObjectId objects serialise to a string on the wire; the function keeps the cast.
  assert.equal(mapPlotMapField({ enabled: true, layoutId: 123 }).layoutId, '123');
});
