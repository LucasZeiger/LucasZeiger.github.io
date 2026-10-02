import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const { SITE_ROUTES, getRouteMetadata, getLegacyRedirect } = await import(pathToFileURL(resolve('dist-ssr/prerender-entry.js')).href);

assert.equal(getLegacyRedirect(new URL('https://lucaszeiger.github.io/#/research/p1')), '/research/p1');
assert.equal(getLegacyRedirect(new URL('https://lucaszeiger.github.io/#/news?item=mapk-plasticity-nature-2025')), '/news?item=mapk-plasticity-nature-2025');
assert.equal(getLegacyRedirect(new URL('https://lucaszeiger.github.io/#research')), null);
assert.equal(getLegacyRedirect(new URL('https://lucaszeiger.github.io/#//example.com')), null);
assert.equal(getLegacyRedirect(new URL('https://lucaszeiger.github.io/#/\\example.com')), null);
assert.equal(getLegacyRedirect(new URL('blob:https://lucaszeiger.github.io/example#/research')), null);

for (const route of SITE_ROUTES) {
  const html = await readFile(resolve('dist', `.${route.path}`, 'index.html'), 'utf8');
  const metadata = getRouteMetadata(route.path);
  assert(html.includes(`href="${metadata.url}"`), `Incorrect canonical URL: ${route.path}`);
  assert(html.includes('<meta name="description"'), `Missing description: ${route.path}`);
  assert(!html.includes('cdn.tailwindcss.com'), `Runtime Tailwind found: ${route.path}`);
  assert(!html.includes('href="TBC"') && !html.includes('href="NA"'), `Placeholder action: ${route.path}`);
  if (route.prerender) {
    assert(/<h1[\s>]/.test(html), `Missing rendered page content: ${route.path}`);
    assert(!html.includes('href="#/'), `Hash navigation found: ${route.path}`);
  }
  for (const [, attribute, value] of html.matchAll(/\b(href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const target = resolve('dist', `.${value}`);
    const info = await stat(target).catch(() => null);
    assert(info, `Missing ${attribute} target ${value} on ${route.path}`);
    if (info.isDirectory()) await access(resolve(target, 'index.html'));
  }
}

const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal([...sitemap.matchAll(/<loc>/g)].length, SITE_ROUTES.length - 1);
for (const route of SITE_ROUTES.filter(route => route.path !== '/synth')) {
  assert(sitemap.includes(`<loc>${getRouteMetadata(route.path).url}</loc>`), `Missing sitemap route: ${route.path}`);
}
const embedded = await readFile('dist/experiments/cellular-automata/index.html', 'utf8');
assert(embedded.includes('app.js'), 'Embedded app was overwritten');
assert(!embedded.includes('id="root"'), 'Embedded app collides with React entry');
const assets = await readdir('dist/assets');
assert(assets.some(name => name.startsWith('SynthCanvasPage-') && name.endsWith('.js')), 'Synth is not split into its own chunk');
assert(assets.some(name => name.startsWith('DungeonDesignerPage-') && name.endsWith('.js')), 'Dungeon designer is not split into its own chunk');
assert(assets.some(name => name.endsWith('.webp')), 'Optimized images missing');
for (const name of ['spatial_mapk', 'Slc7a5']) {
  const original = await sharp(`data/images/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const optimized = await sharp(`.generated/images/${name}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(optimized.info.width, original.info.width, `${name} width changed`);
  assert.equal(optimized.info.height, original.info.height, `${name} height changed`);
  assert(original.data.equals(optimized.data), `${name} pixels changed during optimization`);
}
console.log(`Checked ${SITE_ROUTES.length} routes, internal links, metadata, sitemap, embedded app, and code splitting.`);
