import { html, raw } from '../lib/html.mjs';
import { livePill, btn, glyph, icon } from './parts.mjs';

export const nav = [
  { href: '/stream/', label: 'Stream' },
  { href: '/setup/', label: 'Setup' },
  { href: '/about/', label: 'About' },
  { href: '/work/', label: 'Work' },
  { href: '/contact/', label: 'Contact' },
];

function header(ctx, path) {
  const current = (href) => path.startsWith(href);
  return html`<header class="nav" data-nav>
    <div class="nav__inner">
      <a class="nav__brand" href="/" ${path === '/' ? html`aria-current="page"` : ''}>
        <img src="/img/stag-400.webp" width="30" height="42" alt="">
        <span class="nav__word">notelkz</span>
      </a>
      <nav aria-label="Main">
        <ul class="nav__links" id="nav-links" role="list">
          ${nav.map((n) => html`<li><a href="${n.href}" ${current(n.href) ? html`aria-current="page"` : ''}>${n.label}</a></li>`)}
        </ul>
      </nav>
      <div class="nav__actions">
        ${livePill(ctx.site)}
        ${btn(ctx.site.twitch, 'Follow', { solid: true, ext: true })}
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" data-nav-toggle>
          <span data-open>${glyph('menu', 22)}</span><span data-close>${glyph('close', 22)}</span>
          <span class="visually-hidden">Menu</span>
        </button>
      </div>
    </div>
  </header>`;
}

function footer(ctx, { cta = true } = {}) {
  const { site } = ctx;
  return html`
  ${cta ? html`<section class="cta" aria-labelledby="cta-title">
    <img class="cta__ghost" src="/img/stag-800.webp" width="800" height="1114" alt="" loading="lazy">
    <div class="wrap">
      <h2 class="cta__title" id="cta-title">Catch the<br><span>next stream</span></h2>
      <p class="cta__sub">Follow on Twitch to get a notification the moment I go live.</p>
      <div class="hero__actions">
        ${btn(site.twitch, 'Follow on Twitch', { solid: true, lg: true, iconId: 'twitch', ext: true })}
        ${btn(site.discord, 'Join the Discord', { lg: true, iconId: 'discord', ext: true })}
      </div>
    </div>
  </section>` : ''}
  <footer class="footer">
    <div class="footer__inner">
      <a class="footer__brand" href="/"><img src="/img/stag-400.webp" width="26" height="36" alt=""><span class="nav__word">notelkz</span></a>
      <nav aria-label="Footer"><ul class="footer__nav data" role="list">
        ${nav.map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}
      </ul></nav>
      <ul class="footer__icons" role="list">
        ${site.socials.map((s) => html`<li><a href="${s.url}" rel="me noopener" title="${s.label}">${icon(s.id, { label: s.label })}</a></li>`)}
      </ul>
      <p class="footer__small data"><span>© ${new Date().getFullYear()} notelkz</span><span>Self-hosted, no tracking</span></p>
    </div>
  </footer>`;
}

/** page: { path, title, description, body, home, jsonLd, image } */
export function layout(ctx, page) {
  const { site, assets } = ctx;
  const fullTitle = page.title ? `${page.title} | ${site.name}` : `${site.name} | ${site.tagline}`;
  const description = page.description || site.description;
  const canonical = new URL(page.path, site.url).href;
  const image = new URL(page.image || '/img/og.png', site.url).href;

  return html`<!doctype html>
<html lang="en-GB" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#171616">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/archivo-italic.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/chakra-petch-semibold.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${assets.css}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${page.title || site.name}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
${site.socials.map((s) => html`<link rel="me" href="${s.url}">`)}
${page.jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(page.jsonLd).replace(/</g, '\\u003c'))}</script>` : ''}
<script src="${assets.js}" defer></script>
${page.home ? html`<script type="module" src="${assets.stag}"></script>` : ''}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(ctx, page.path)}
<main id="main" tabindex="-1">
${page.body}
</main>
${footer(ctx, { cta: !page.noCta })}
</body>
</html>
`;
}
