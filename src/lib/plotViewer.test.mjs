// node --test src/lib/plotViewer.test.mjs
// Unit tests for buildPlotMeta (14.6), the slug rule, and the Public_Plot_Page
// read-only pins (14.2). Property 45 is in p45-overlay-image.test.mjs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlotMeta, parsePlotSlug, plotPageUrl, centroid, boundsForLayout, fetchPublicLayout } from './plotViewer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const layout = (over = {}) => ({
  slug: 'green-valley', projectName: 'Green Valley', city: 'Nagpur', location: 'Wardha Road',
  media: { coverImage: 'https://cdn.example/cover.jpg' },
  overlay: { previewUrl: 'https://cdn.example/preview.webp', detailUrl: null, image: { url: 'https://cdn.example/full.png' } },
  ...over,
});

describe('buildPlotMeta', () => {
  test('preview image is the OG image; title, description, canonical', () => {
    const m = buildPlotMeta(layout());
    assert.equal(m.title, 'Green Valley plot layout | HomeInTown');
    assert.equal(m.description, 'Nagpur · Wardha Road');
    assert.equal(m.canonical, 'https://homeintown.in/plots/green-valley');
    assert.equal(m.image, 'https://cdn.example/preview.webp');
    assert.equal(m.twitterCard, 'summary_large_image');
    assert.equal(m.noindex, false);
  });
  test('cover is the fallback when there is no preview', () => {
    const m = buildPlotMeta(layout({ overlay: { previewUrl: null, image: { url: 'https://cdn.example/full.png' } } }));
    assert.equal(m.image, 'https://cdn.example/cover.jpg');
  });
  test('no image at all: none, and a plain summary card', () => {
    const m = buildPlotMeta(layout({ media: {}, overlay: { previewUrl: null, image: { url: 'x' } } }));
    assert.equal(m.image, null);
    assert.equal(m.twitterCard, 'summary');
  });
  test('missing city and location: fallback description', () => {
    const m = buildPlotMeta(layout({ city: '', location: undefined }));
    assert.equal(m.description, 'Plot layout of Green Valley on HomeInTown');
  });
  test('unknown slug (null) and overlay: null are "Layout not available" + noindex', () => {
    for (const l of [null, layout({ overlay: null })]) {
      const m = buildPlotMeta(l);
      assert.equal(m.title, 'Layout not available | HomeInTown');
      assert.equal(m.noindex, true);
      assert.equal(m.image, null);
    }
  });
  test('an unsafe image URL is dropped', () => {
    const m = buildPlotMeta(layout({ overlay: { previewUrl: 'javascript:alert(1)', image: { url: 'x' } }, media: {} }));
    assert.equal(m.image, null);
  });
});

describe('parsePlotSlug', () => {
  test('valid, encoded, and invalid slugs', () => {
    assert.equal(parsePlotSlug('green-valley'), 'green-valley');
    assert.equal(parsePlotSlug('green%20valley'), 'green valley');
    for (const bad of ['', '%E0%A4%A', 'a%2Fb', 'a%5Cb', 'a%00b', 'x'.repeat(201), undefined]) assert.equal(parsePlotSlug(bad), null, String(bad));
    assert.equal(plotPageUrl('a b'), 'https://homeintown.in/plots/a%20b');
  });
});

describe('geometry helpers', () => {
  test('centroid and bounds', () => {
    const sq = [{ lat: 0, lng: 0 }, { lat: 0, lng: 2 }, { lat: 2, lng: 2 }, { lat: 2, lng: 0 }];
    assert.deepEqual(centroid(sq), { lat: 1, lng: 1 });
    assert.equal(centroid([]), null);
    assert.deepEqual(boundsForLayout({ plots: [{ path: sq }] }), { south: 0, west: 0, north: 2, east: 2 });
    assert.equal(boundsForLayout({}), null);
  });
});

describe('Public_Plot_Page is read-only (R9.9, R9.13, R9.16, R23.8)', () => {
  const files = [
    ['src', 'components', 'plots', 'PublicPlotViewer.tsx'],
    ['src', 'components', 'plots', 'PublicOverlayLayer.ts'],
    ['src', 'app', 'plots', '[slug]', 'page.tsx'],
    ['src', 'lib', 'plotViewer.mjs'],
  ];
  test('no status, auth, login or session code in the page sources', () => {
    for (const f of files) {
      // Strip comments so the explanations of what is NOT ported do not trip the scan.
      const src = read(...f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      assert.doesNotMatch(src, /\/status\b/, f.join('/'));
      assert.doesNotMatch(src, /Authorization/, f.join('/'));
      assert.doesNotMatch(src, /credentials\s*:\s*['"]include['"]/, f.join('/'));
      assert.doesNotMatch(src, /PlotLoginModal|plotSession|patchPlotStatus|plotApi\.login/, f.join('/'));
    }
  });
  test('PublicOverlayLayer imports its transform from layoutTools.mjs', () => {
    assert.match(read('src', 'components', 'plots', 'PublicOverlayLayer.ts'), /from ['"]@\/lib\/layoutTools\.mjs['"]/);
  });
  test('no second golden fixture copy for the public page', () => {
    assert.equal(fs.existsSync(path.join(root, 'src', 'components', 'plots', '__fixtures__')), false);
  });
});

describe('PublicCard link (R9.22, R9.25)', () => {
  const src = read('src', 'components', 'card', 'PublicCard.tsx');
  test('is gated on hasPlotLayout and points at /plots/<encoded slug>', () => {
    assert.match(src, /hasPlotLayout\?: boolean/);
    assert.match(src, /pr\.hasPlotLayout === true/);
    assert.match(src, /\/plots\/\$\{encodeURIComponent\(pr\.slug\)\}/);
    assert.match(src, /View Plot Layout/);
  });
  test('the existing /visit/<slug> tile link is unchanged', () => {
    assert.match(src, /href=\{`\/visit\/\$\{encodeURIComponent\(pr\.slug\)\}`\}/);
  });
});

describe('fetchPublicLayout states (R9.10, R9.11)', () => {
  const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

  test('200 -> ok with the layout; the URL is the same-origin /api route', async () => {
    let seen = '';
    const r = await fetchPublicLayout('a b', { fetchImpl: async (u) => { seen = u; return res(200, { slug: 'a b' }); } });
    assert.equal(r.kind, 'ok');
    assert.equal(seen, '/api/public/projects/a%20b/layout');
  });
  test('overlay: null is still a 200 (the page shows "Layout not available" itself)', async () => {
    const r = await fetchPublicLayout('x', { fetchImpl: async () => res(200, { overlay: null }) });
    assert.equal(r.kind, 'ok');
    assert.equal(r.layout.overlay, null);
  });
  test('404 -> notfound (no retry offered)', async () => {
    assert.deepEqual(await fetchPublicLayout('x', { fetchImpl: async () => res(404, {}) }), { kind: 'notfound' });
  });
  test('5xx and network errors -> error (Retry offered)', async () => {
    assert.equal((await fetchPublicLayout('x', { fetchImpl: async () => res(503, {}) })).kind, 'error');
    assert.equal((await fetchPublicLayout('x', { fetchImpl: async () => { throw new TypeError('network'); } })).kind, 'error');
  });
  test('no answer within 15 s aborts -> error (fake timers)', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const p = fetchPublicLayout('x', {
      fetchImpl: (u, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    });
    t.mock.timers.tick(14999);
    let settled = false;
    p.then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(settled, false);
    t.mock.timers.tick(1);
    assert.equal((await p).kind, 'error');
  });
});

describe('Public_Plot_Page import graph and built chunks (R9.9, R9.13, R9.16)', () => {
  // The root layout (Providers -> auth -> api.ts) is on EVERY route, so its
  // chunk legitimately contains "/status" and credentials:"include". What is
  // pinned here is that the plots page itself adds none.
  test('the page modules never import api.ts or the auth context', () => {
    for (const f of [
      ['src', 'components', 'plots', 'PublicPlotViewer.tsx'],
      ['src', 'components', 'plots', 'PublicOverlayLayer.ts'],
      ['src', 'app', 'plots', '[slug]', 'page.tsx'],
      ['src', 'app', 'plots', '[slug]', 'error.tsx'],
      ['src', 'lib', 'plotViewer.mjs'],
    ]) {
      const src = read(...f);
      assert.doesNotMatch(src, /from ['"]@\/lib\/api['"]|authContext|AuthContext|useAuth/, f.join('/'));
    }
  });

  test('built /plots/[slug] chunks (beyond the root layout) have no status, Authorization or credentials include', (t) => {
    const manifestOf = (...p) => {
      const file = path.join(root, '.next', 'server', 'app', ...p, 'page_client-reference-manifest.js');
      return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    };
    const plots = manifestOf('plots', '[slug]');
    const base = manifestOf('_not-found');
    if (!plots || !base) { t.skip('run `next build` first'); return; }
    const chunksOf = (m) => new Set([...m.matchAll(/static\/chunks\/[^"\\]+\.js/g)].map((x) => x[0]));
    const shared = chunksOf(base);
    const own = [...chunksOf(plots)].filter((c) => !shared.has(c));
    for (const c of own) {
      const file = path.join(root, '.next', c);
      if (!fs.existsSync(file)) continue;
      const code = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(code, /\/status\b/, c);
      assert.doesNotMatch(code, /Authorization/, c);
      assert.doesNotMatch(code, /credentials\s*:\s*["']include["']/, c);
    }
  });
});
