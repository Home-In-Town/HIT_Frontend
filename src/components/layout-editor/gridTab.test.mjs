// node --test src/components/layout-editor/gridTab.test.mjs
// R23.6: the tab that used to be called "AI" is now "Grid", and no tab label
// contains "AI", "detect" or "auto". The tool buttons inside it (and what
// runAILayout produces) are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const page = fs.readFileSync(path.join(here, '..', '..', 'app', 'dashboard', 'projects', '[id]', 'layout-editor', 'page.tsx'), 'utf8');

test('TABS has Grid and no forbidden words', () => {
  const m = /^const TABS: TabType\[\] = \[(.*)\];/m.exec(page);
  assert.ok(m, 'TABS line found');
  const labels = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(labels.includes('Grid'));
  for (const l of labels) assert.doesNotMatch(l, /\bAI\b|detect|auto/i, l);
});

test('the tool buttons inside the Grid tab are unchanged', () => {
  for (const label of ['Draw AI Boundary', 'Generate AI Layout', 'Edit AI Layout', 'Save AI Layout']) {
    assert.ok(page.includes(label), label);
  }
  assert.ok(page.includes('generateAILayout()'));
});

test('read-only mode renders no write controls: sidebar and sheet are gated on canEdit', () => {
  assert.match(page, /\{perms\.canEdit && \(\s*<div\s+className=\{`fixed/);
  assert.match(page, /\{perms\.canEdit && \(\s*<div className="hidden lg:flex w-80/);
});
