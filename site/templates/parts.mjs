import { html } from '../lib/html.mjs';
import { icons } from '../lib/icons.mjs';

export function icon(id, { size = 20, cls = '', label } = {}) {
  const d = icons[id];
  if (!d) return '';
  return html`<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" ${label ? html`role="img" aria-label="${label}"` : html`aria-hidden="true"`} focusable="false"><path d="${d}" fill="currentColor"/></svg>`;
}

const glyphs = {
  arrowUpRight: 'M7 17L17 7M8 7h9v9',
  arrowRight: 'M4 12h16M14 6l6 6-6 6',
  arrowLeft: 'M20 12H4M10 6l-6 6 6 6',
  play: 'M7 4.5v15l13-7.5z',
  menu: 'M3 7h18M3 12h18M3 17h12',
  close: 'M5 5l14 14M19 5L5 19',
  diamond: 'M12 3l4 9-4 9-4-9z',
};
export function glyph(id, size = 18, cls = '') {
  const fill = id === 'play' || id === 'diamond';
  return html`<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${glyphs[id]}" ${fill ? html`fill="currentColor"` : html`fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"`}/></svg>`;
}

export const btn = (href, label, { solid = false, lg = false, iconId, ext = false } = {}) =>
  html`<a class="btn${solid ? ' btn--solid' : ''}${lg ? ' btn--lg' : ''}" href="${href}" ${ext ? html`rel="noopener"` : ''}><span>${iconId ? icon(iconId, { size: 18 }) : ''}${label}</span></a>`;

/** Live status pill. main.js updates data-state and the text from /api/status. */
export function livePill(site) {
  return html`<a class="live" href="${site.twitch}" rel="noopener" data-live-chip data-state="unknown">
    <span class="live__dot" aria-hidden="true"></span><span class="live__text" data-live-text>twitch.tv/${site.handle}</span>
  </a>`;
}

export function title(text, { tag = 'h2', id } = {}) {
  const inner = html`${text}<span class="title__slash" aria-hidden="true"></span>`;
  return tag === 'h1'
    ? html`<h1 class="title" ${id ? html`id="${id}"` : ''}>${inner}</h1>`
    : html`<h2 class="title" ${id ? html`id="${id}"` : ''}>${inner}</h2>`;
}

export function socialGrid(site) {
  return html`<ul class="socials" role="list">
    ${site.socials.map((s) => html`<li><a class="social" href="${s.url}" rel="me noopener">
      ${icon(s.id, { size: 32, cls: 'social__icon' })}
      <span class="social__name">${s.label}</span>
      <span class="social__handle data">${s.handle}</span>
      ${glyph('arrowUpRight', 20, 'social__go')}
    </a></li>`)}
  </ul>`;
}

export function marquee(site) {
  const items = ['Live on Twitch', `twitch.tv/${site.handle}`, 'Join the Discord', 'Recent clips', 'notelkz.net'];
  const group = (hidden) => html`<div class="marquee__group" ${hidden ? html`aria-hidden="true"` : ''}>
    ${items.map((t) => html`<span>${t}</span>${glyph('diamond', 16)}`)}
    ${items.map((t) => html`<span>${t}</span>${glyph('diamond', 16)}`)}
  </div>`;
  return html`<div class="marquee" aria-label="Find elkz on Twitch and Discord"><div class="marquee__track">${group(false)}${group(true)}</div></div>`;
}

export function stagImg({ cls = '', alt = '', eager = false, sizes = '40vw' } = {}) {
  return html`<img class="${cls}" src="/img/stag-800.webp" srcset="/img/stag-400.webp 400w, /img/stag-800.webp 800w, /img/stag-1400.webp 1400w"
    sizes="${sizes}" width="1954" height="2720" alt="${alt}" ${eager ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async">`;
}

export function pageHero({ title: t, lede, kicker }) {
  return html`<header class="page-hero">
    ${stagImg({ cls: 'page-hero__ghost', sizes: '50vw' })}
    <div class="wrap">
      ${kicker || ''}
      <h1 class="page-hero__title">${t}<span class="title__slash" aria-hidden="true"></span></h1>
      ${lede ? html`<p class="lede">${lede}</p>` : ''}
    </div>
  </header>`;
}
