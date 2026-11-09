// node --test src/lib/pdfjsVersion.test.mjs
//
// R2.8 / R2.9: the PDF worker must be the same version as the pdf.js library.
// Before this, three versions were installed at once: pdfjs-dist@3.11.174 as
// a direct dependency, 5.4.296 nested under react-pdf, and a hand-copied
// public/pdf.worker.min.mjs at 5.4.624. Whichever one a loader picked, the
// worker and the library could disagree and pdf.js refuses to run with a
// mismatched worker. Now there is one pinned copy and the loader takes the
// worker from that same package via
// new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).
// This test fails if a dependency drags in a second copy, if the pin drifts
// to a range, or if a stray worker reappears in public/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Collects the version of every installed pdfjs-dist, at any nesting depth.
function findPdfjsCopies(nodeModulesDir, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(nodeModulesDir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const dir = path.join(nodeModulesDir, entry.name);
    if (entry.name.startsWith('@')) {
      // Scoped packages sit one level deeper: @scope/name.
      for (const scoped of fs.readdirSync(dir, { withFileTypes: true })) {
        if (scoped.isDirectory()) findPdfjsCopies(path.join(dir, scoped.name, 'node_modules'), found);
      }
      continue;
    }
    if (entry.name === 'pdfjs-dist') {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      found.push({ dir: path.relative(root, dir), version: pkg.version });
    }
    findPdfjsCopies(path.join(dir, 'node_modules'), found);
  }
  return found;
}

const pinned = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies['pdfjs-dist'];

test('package.json pins pdfjs-dist to one exact 5.x version', () => {
  assert.match(pinned, /^5\.\d+\.\d+$/, `expected an exact 5.x pin, got "${pinned}"`);
});

test('exactly one pdfjs-dist is installed, at the pinned version', () => {
  const copies = findPdfjsCopies(path.join(root, 'node_modules'));
  assert.equal(copies.length, 1, `found ${copies.length} copies: ${JSON.stringify(copies)}`);
  assert.equal(copies[0].version, pinned);
});

test('the bundled worker reports the same version as the library', () => {
  const worker = path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
  const head = fs.readFileSync(worker, 'utf8').slice(0, 4096);
  assert.match(head, new RegExp(`pdfjsVersion = ${pinned.replace(/\./g, '\\.')}\\b`));
});

test('no hand-copied worker is left in public/', () => {
  assert.equal(fs.existsSync(path.join(root, 'public', 'pdf.worker.min.mjs')), false);
});
