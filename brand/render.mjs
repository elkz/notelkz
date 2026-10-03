// Renders the notelkz background in Twitch sizes.  node brand/render.mjs  (needs Playwright + Chromium)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const tpl = 'file://' + path.join(here, 'template.html');
const sizes = [['scene-1920x1080', 1920, 1080], ['scene-3840x2160', 3840, 2160], ['profile-banner-1200x480', 1200, 480]];
const panels = ['About', 'Schedule', 'Setup', 'Game Tracker', 'Wall of Fame', 'Discord', 'Socials', 'Throne'];
const b = await chromium.launch();
const shot = async (file, w, h, q) => {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${tpl}?${new URLSearchParams({ w, h, ...q })}`); await p.evaluate(() => document.fonts.ready);
  await mkdir(path.dirname(file), { recursive: true }); await p.screenshot({ path: file }); await p.close();
};
for (const v of ['default', 'live', 'holiday']) for (const [n, w, h] of sizes) await shot(path.join(here, 'backgrounds', v, `${n}.png`), w, h, { v });
for (const label of panels) await shot(path.join(here, 'panels', `${label.toLowerCase().replace(/ /g, '-')}.png`), 640, 200, { label });
await shot(path.join(here, 'panels', 'blank.png'), 640, 200, {});
await b.close();
console.log('Rendered into brand/backgrounds and brand/panels');
