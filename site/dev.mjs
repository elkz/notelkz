#!/usr/bin/env node
// Local preview: rebuilds on change and serves site/dist on http://localhost:4321.
// Requests to /api/* are forwarded to the core service (default http://127.0.0.1:8787).
// No service running? Add ?demo=live or ?demo=offline to any page to preview with sample data.
import http from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, 'dist');
const PORT = Number(process.env.PORT || 4321);
const API = process.env.API_URL || 'http://127.0.0.1:8787';

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
};

let building = Promise.resolve();
const rebuild = () => (building = building.then(build).catch((e) => console.error(`Build failed: ${e.message}`)));
await rebuild();

let timer;
for (const dir of ['../content', 'templates', 'assets', 'lib', 'public']) {
  watch(path.join(here, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 80);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const upstream = http.request(API + url.pathname + url.search, { method: req.method, headers: { accept: 'application/json' } }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"error":"core service not running"}'); });
    return upstream.end();
  }
  await building;
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) { res.writeHead(400); return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': types['.html'] });
    res.end(await readFile(path.join(DIST, '404.html')).catch(() => 'Not found'));
  }
}).listen(PORT, () => console.log(`Preview on http://localhost:${PORT}  (API → ${API})`));
