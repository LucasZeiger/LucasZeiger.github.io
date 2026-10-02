import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

await build();
await build({
  build: { ssr: 'scripts/prerender-entry.tsx', outDir: 'dist-ssr' },
  publicDir: false
});

const { SITE_ROUTES, SITE_URL, getRouteMetadata, render } = await import(pathToFileURL(resolve('dist-ssr/prerender-entry.js')).href);
const template = await readFile('dist/index.html', 'utf8');
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

for (const route of SITE_ROUTES) {
  const metadata = getRouteMetadata(route.path);
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`);
  const values = {
    description: metadata.description,
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:url': metadata.url,
    'twitter:title': metadata.title,
    'twitter:description': metadata.description
  };
  for (const [name, value] of Object.entries(values)) {
    const attribute = name.startsWith('og:') ? 'property' : 'name';
    html = html.replace(new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="[^"]*"\\s*/?>`), () => `<meta ${attribute}="${name}" content="${escapeHtml(value)}" />`);
  }
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${metadata.url}" />`);
  if (route.prerender) {
    const markup = await render(route.path);
    html = html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`);
  }
  const target = resolve('dist', `.${route.path}`, 'index.html');
  // Never silently overwrite an embedded application's index file.
  if (route.path !== '/') {
    try {
      await readFile(target);
      throw new Error(`Static route conflicts with a public asset: ${route.path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}

const urls = SITE_ROUTES.filter(route => route.path !== '/synth').map(route => `  <url><loc>${SITE_URL}${route.path === '/' ? '/' : `${route.path}/`}</loc></url>`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Generated ${SITE_ROUTES.length} static routes and sitemap.`);
