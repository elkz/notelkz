#!/usr/bin/env node
// Builds the static site into site/dist.
//   node build.mjs            → production build
// Content comes from ../content, templates from ./templates, static files from ./public.
import { mkdir, rm, readFile, writeFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './lib/content.mjs';
import * as pages from './templates/pages.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(here, '../content');
const OUT = path.resolve(here, process.env.OUT_DIR || 'dist');

async function emitAsset(file, ext) {
  const src = await readFile(path.join(here, 'assets', file), 'utf8');
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 10);
  const name = `/assets/${path.basename(file, ext)}.${hash}${ext}`;
  await mkdir(path.join(OUT, 'assets'), { recursive: true });
  await writeFile(path.join(OUT, name), src);
  return name;
}

async function writePage(route, page) {
  const file = route.endsWith('.html') ? path.join(OUT, route) : path.join(OUT, route, 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, String(page));
}

export async function build() {
  const t0 = performance.now();
  const content = await loadContent(CONTENT);

  await rm(OUT, { recursive: true, force: true });
  await cp(path.join(here, 'public'), OUT, { recursive: true });

  const assets = { css: await emitAsset('main.css', '.css'), js: await emitAsset('main.js', '.js'), stag: await emitAsset('stag.js', '.js') };
  const ctx = { ...content, assets };

  const routes = [
    ['/', pages.home(ctx)],
    ['/about/', pages.about(ctx)],
    ['/stream/', pages.stream(ctx)],
    ['/setup/', pages.setup(ctx)],
    ['/work/', pages.workIndex(ctx)],
    ...content.work.map((w) => [`/work/${w.slug}/`, pages.workItem(ctx, w)]),
    ['/contact/', pages.contact(ctx)],
    ['/404.html', pages.notFound(ctx)],
  ];
  for (const [route, page] of routes) await writePage(route, page);

  const base = content.site.url.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes.filter(([r]) => !r.endsWith('.html')).map(([r]) => `  <url><loc>${base}${r}</loc><lastmod>${today}</lastmod></url>`);
  await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`);

  console.log(`Built ${routes.length} pages into ${path.relative(process.cwd(), OUT) || '.'} in ${Math.round(performance.now() - t0)}ms`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(`\nBuild failed: ${err.message}\n`);
    process.exit(1);
  });
}
