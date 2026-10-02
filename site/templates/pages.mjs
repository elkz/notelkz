import { html, raw } from '../lib/html.mjs';
import { mdInline } from '../lib/content.mjs';
import { layout } from './layout.mjs';
import { icon, glyph, btn, title, socialGrid, marquee, stagImg, pageHero } from './parts.mjs';

const carouselNav = (target) => html`<div class="carousel__nav">
  <button class="carousel__btn" type="button" data-carousel-prev="${target}" aria-label="Previous">${glyph('arrowLeft', 20)}</button>
  <button class="carousel__btn" type="button" data-carousel-next="${target}" aria-label="Next">${glyph('arrowRight', 20)}</button>
</div>`;

function projectCard(w, featured = false) {
  return html`<a class="project${featured ? ' project--featured' : ''} reveal" href="/work/${w.slug}/" data-year="${w.year}">
    <span class="project__meta data">${w.kind ? html`<span>${w.kind}</span>` : ''}${w.status ? html`<span class="project__status">${w.status}</span>` : ''}</span>
    <span class="project__title">${w.title}</span>
    <span class="project__summary">${w.summary}</span>
    <span class="chips">${w.stack.map((s) => html`<span class="chip"><span>${s}</span></span>`)}</span>
  </a>`;
}

/* ───────────────────────── Home ───────────────────────── */
export function home(ctx) {
  const { site, setup, work } = ctx;
  const featured = work.filter((w) => w.featured).concat(work.filter((w) => !w.featured)).slice(0, 2);
  const tiles = [
    ...setup.pc.headline.map((p) => ({ role: p.role, big: p.short || p.name, full: p.name })),
    ...setup.lines.slice(0, 2).map((l) => ({ role: l.items[0].role, big: l.items[0].short || l.items[0].name.split(' ').slice(-1)[0], full: l.items[0].name })),
  ];

  const body = html`
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__bg" aria-hidden="true"></div>
    <h1 class="hero__word" id="hero-title">elkz</h1>
    <div class="hero__stag" data-stag aria-hidden="true">
      ${stagImg({ cls: 'hero__fallback', eager: true, sizes: '60vw' })}
    </div>
    <p class="hud hud--tl" data-clock>Local time<strong>--:--</strong></p>
    <p class="hud hud--tr">Channel<strong>twitch.tv/${site.handle}</strong></p>
    <div class="wrap hero__bottom">
      <div>
        <p class="hero__status data" data-hero-status data-state="unknown"><span class="live__dot" aria-hidden="true"></span><span data-hero-status-text>Variety streamer</span></p>
        <p class="hero__name">Single-player worlds,<br><span>streamed live.</span></p>
        <p class="hero__tag">${site.tagline}</p>
      </div>
      <div class="hero__actions">
        <a class="btn btn--solid btn--lg" href="${site.twitch}" rel="noopener" data-watch-cta><span>${icon('twitch', { size: 18 })}<span data-watch-label>Watch on Twitch</span></span></a>
        ${btn('/stream/', 'Schedule', { lg: true })}
      </div>
    </div>
    <a class="hero__scroll data" href="#on-air"><span>Scroll</span><i></i></a>
  </section>

  ${marquee(site)}

  <section class="section" id="on-air" aria-labelledby="onair-title">
    <div class="wrap onair">
      <div class="reveal">
        <p class="onair__label data" data-onair-label>Next stream</p>
        <h2 class="onair__title" id="onair-title" data-onair-title>Check the schedule</h2>
        <p class="onair__game" data-onair-game>Times load from Twitch.</p>
        <div class="countdown" data-countdown hidden>
          <div class="countdown__unit"><span class="countdown__num" data-cd="d">00</span><span class="countdown__lbl data">Days</span></div>
          <div class="countdown__unit"><span class="countdown__num" data-cd="h">00</span><span class="countdown__lbl data">Hours</span></div>
          <div class="countdown__unit"><span class="countdown__num" data-cd="m">00</span><span class="countdown__lbl data">Mins</span></div>
          <div class="countdown__unit"><span class="countdown__num" data-cd="s">00</span><span class="countdown__lbl data">Secs</span></div>
        </div>
        <div class="onair__thumb" data-onair-thumb hidden></div>
        <div class="onair__actions">
          ${btn(site.twitch, 'Follow for alerts', { solid: true, iconId: 'twitch', ext: true })}
          ${btn('/stream/', 'Full schedule')}
        </div>
      </div>
      <div class="reveal d2">
        <h3 class="data dim mb-1">Coming up</h3>
        <div class="rows" data-upcoming data-count="4">
          <p class="empty">The schedule loads from Twitch. <a href="${site.twitch}/schedule" rel="noopener">See it on Twitch</a>.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="band" aria-labelledby="clips-title">
    <div class="wrap section__head reveal">
      <div>${title('Clips', { id: 'clips-title' })}<p class="lede">The best moments from recent streams, clipped by chat.</p></div>
      ${carouselNav('clips')}
    </div>
    <div class="carousel"><div class="carousel__track" id="clips" data-clips data-count="10">
      <p class="empty wrap">Clips load from Twitch. <a href="${site.twitch}/clips" rel="noopener">See all clips</a>.</p>
    </div></div>
  </section>

  <section class="section" aria-labelledby="rig-title">
    <div class="wrap split">
      <div class="split__copy reveal">
        ${title('The loadout', { id: 'rig-title' })}
        <p class="lede">${setup.intro}</p>
        ${btn('/setup/', 'Full setup')}
      </div>
      <div class="tiles reveal d2">
        ${tiles.map((t) => html`<div class="tile"><span class="tile__role data">${t.role}</span><div><div class="tile__big">${t.big}</div><div class="tile__full">${t.full}</div></div></div>`)}
      </div>
    </div>
  </section>

  ${featured.length ? html`<section class="section pt-0" aria-labelledby="work-title">
    <div class="wrap">
      <div class="section__head reveal">
        <div>${title('Built by elkz', { id: 'work-title' })}<p class="lede">Websites, Discord bots and tools for the communities I play with.</p></div>
        ${btn('/work/', 'All work')}
      </div>
      <div class="projects">${featured.map((w) => projectCard(w))}</div>
    </div>
  </section>` : ''}

  <section class="section pt-0" aria-labelledby="social-title">
    <div class="wrap">
      <div class="section__head reveal">${title('Everywhere else', { id: 'social-title' })}</div>
      <div class="reveal">${socialGrid(site)}</div>
    </div>
  </section>`;

  return layout(ctx, {
    path: '/', body, home: true,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Person', name: 'elkz', alternateName: 'notelkz', url: site.url,
      image: new URL('/img/stag-800.webp', site.url).href, sameAs: site.socials.map((s) => s.url),
    },
  });
}

/* ───────────────────────── Stream ───────────────────────── */
export function stream(ctx) {
  const { site } = ctx;
  const body = html`
  ${pageHero({
    title: 'Stream',
    kicker: html`<p class="data" data-hero-status data-state="unknown"><span class="live__dot" aria-hidden="true"></span><span data-hero-status-text>twitch.tv/${site.handle}</span></p>`,
    lede: 'Watch live, see what is coming up this week, and catch up on past broadcasts and clips.',
  })}
  <section class="wrap" aria-label="Watch">
    <div class="watch">
      <div class="frame frame--player" data-player data-channel="${site.handle}">
        <img class="frame__poster" data-player-poster alt="" hidden>
        ${stagImg({ cls: 'frame__ghost', sizes: '30vw' })}
        <button class="frame__load" type="button" data-player-load>
          <span class="frame__play">${glyph('play', 30)}</span>
          <span class="frame__label" data-player-label>Load the stream</span>
          <span class="frame__note data">Loads the Twitch player and its cookies</span>
        </button>
      </div>
      <div class="frame frame--chat" data-chat data-channel="${site.handle}">
        <button class="frame__load" type="button" data-chat-load>
          <span class="frame__label">Load chat</span>
          <span class="frame__note data">Sign in on Twitch to talk</span>
        </button>
      </div>
    </div>
    <div class="status-bar">
      <div><p class="status-bar__title" data-live-title>Live status loads from Twitch</p><p class="status-bar__meta" data-live-meta></p></div>
      <div class="hero__actions">
        ${btn(site.twitch, 'Open on Twitch', { solid: true, iconId: 'twitch', ext: true })}
        ${btn(site.discord, 'Discord', { iconId: 'discord', ext: true })}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="schedule-title">
    <div class="wrap">
      <div class="section__head reveal">
        <div>${title('This week', { id: 'schedule-title' })}<p class="lede">Pulled live from my Twitch schedule. Every stream also shows up as an event in the <a href="${site.discord}" rel="noopener" class="link">Discord</a>.</p></div>
        <p class="data dim" data-tz-note>Times in your time zone</p>
      </div>
      <div class="week reveal" data-week></div>
      <div class="rows reveal" data-upcoming data-count="10" data-full>
        <p class="empty">The schedule loads from Twitch. <a href="${site.twitch}/schedule" rel="noopener">See it on Twitch</a>.</p>
      </div>
    </div>
  </section>

  <section class="band" aria-labelledby="vods-title">
    <div class="wrap">
      <div class="section__head reveal">${title('Past broadcasts', { id: 'vods-title' })}${btn(`${site.twitch}/videos`, 'All videos', { ext: true })}</div>
      <div class="grid-media" data-videos data-count="6"><p class="empty">Past broadcasts load from Twitch.</p></div>
    </div>
  </section>

  <section class="section" aria-labelledby="clips-title">
    <div class="wrap section__head reveal">${title('Clips', { id: 'clips-title' })}${carouselNav('clips')}</div>
    <div class="carousel"><div class="carousel__track" id="clips" data-clips data-count="12"><p class="empty wrap">Clips load from Twitch.</p></div></div>
  </section>`;

  return layout(ctx, { path: '/stream/', title: 'Stream', description: `Watch ${site.handle} live, see this week's stream schedule, past broadcasts and clips.`, body });
}

/* ───────────────────────── Setup ───────────────────────── */
export function setup(ctx) {
  const { setup } = ctx;
  const { pc } = setup;
  const groups = [...setup.lines, { id: 'pc', name: pc.name, summary: pc.summary, items: pc.parts }];
  const body = html`
  ${pageHero({ title: 'Setup', lede: setup.intro })}
  <div class="wrap">
    <div class="rig reveal">
      ${pc.headline.map((p) => html`<div class="rig__hero" data-ghost="${p.short || ''}">
        <p class="rig__role data">${p.role}</p>
        <p class="rig__big">${p.short || p.name}</p>
        <p class="rig__full">${p.name}</p>
      </div>`)}
    </div>
    <div class="loadout">
      ${groups.map((g) => html`<section class="loadout__group" aria-labelledby="g-${g.id}">
        <div class="reveal">
          <h2 class="loadout__name" id="g-${g.id}">${g.name}</h2>
          ${g.summary ? html`<p class="loadout__sum">${g.summary}</p>` : ''}
        </div>
        <ul class="slots" role="list">
          ${g.items.map((it, i) => html`<li class="slot reveal">
            <span class="slot__role data">${it.role}</span>
            <span class="slot__name">${it.name}</span>
            ${it.note ? html`<span class="slot__note">${it.note}</span>` : ''}
          </li>`)}
        </ul>
      </section>`)}
    </div>
  </div>
  <div class="spacer"></div>`;

  return layout(ctx, {
    path: '/setup/', title: 'Setup',
    description: `The streaming setup behind elkz: ${pc.headline.map((p) => p.name).join(', ')}, plus audio, camera and capture gear.`,
    body,
  });
}

/* ───────────────────────── About ───────────────────────── */
export function about(ctx) {
  const { site, about, games } = ctx;
  const label = { playing: 'Playing now', regular: 'Regular', retired: 'Played to death' };
  const body = html`
  ${pageHero({ title: 'About', lede: about.lede })}
  <div class="wrap about">
    <div class="prose reveal">${raw(about.html)}</div>
    <figure class="portrait reveal d2">
      ${stagImg({ sizes: '35vw' })}
      <figcaption class="data">elkz · twitch.tv/${site.handle}</figcaption>
    </figure>
  </div>

  <section class="section" aria-labelledby="games-title">
    <div class="wrap">
      <div class="section__head reveal">${title('What I play', { id: 'games-title' })}</div>
      <ul class="games" role="list">
        ${games.map((g, i) => html`<li class="game game--${g.status} reveal">
          <p class="game__status data">${label[g.status] || g.status}</p>
          <p class="game__name">${g.name}</p>
          ${g.note ? html`<p class="game__note">${g.note}</p>` : ''}
        </li>`)}
      </ul>
    </div>
  </section>

  ${about.history.length ? html`<section class="band" aria-labelledby="history-title">
    <div class="wrap">
      <div class="section__head reveal">${title('So far', { id: 'history-title' })}</div>
      <ol class="timeline reveal" role="list">
        ${about.history.map((h) => html`<li class="timeline__stop"><p class="timeline__when">${h.when}</p><p class="timeline__what">${raw(mdInline(h.what))}</p></li>`)}
      </ol>
    </div>
  </section>` : ''}

  <section class="section" aria-labelledby="elsewhere-title">
    <div class="wrap">
      <div class="section__head reveal">${title('Find me', { id: 'elsewhere-title' })}</div>
      <div class="reveal">${socialGrid(site)}</div>
    </div>
  </section>`;
  return layout(ctx, { path: '/about/', title: 'About', description: about.lede, body });
}

/* ───────────────────────── Work ───────────────────────── */
export function workIndex(ctx) {
  const { work } = ctx;
  const body = html`
  ${pageHero({ title: 'Work', lede: 'Websites, Discord bots and tools, mostly built for the communities I play with.' })}
  <div class="wrap"><div class="projects">${work.map((w, i) => projectCard(w, i === 0 && w.featured))}</div></div>
  <div class="spacer"></div>`;
  return layout(ctx, { path: '/work/', title: 'Work', description: 'Projects by elkz: websites, Discord bots and tools.', body });
}

export function workItem(ctx, w) {
  const body = html`
  <article>
    ${pageHero({ title: w.title, lede: w.summary, kicker: html`<a class="back data" href="/work/">${glyph('arrowLeft', 16)} All work</a>` })}
    <div class="wrap detail">
      <dl class="detail__meta reveal">
        ${w.year ? html`<div><dt class="data">Year</dt><dd>${w.year}</dd></div>` : ''}
        ${w.kind ? html`<div><dt class="data">Type</dt><dd>${w.kind}</dd></div>` : ''}
        ${w.status ? html`<div><dt class="data">Status</dt><dd>${w.status}</dd></div>` : ''}
        ${w.stack.length ? html`<div><dt class="data">Built with</dt><dd class="chips mt">${w.stack.map((s) => html`<span class="chip"><span>${s}</span></span>`)}</dd></div>` : ''}
        ${w.url ? html`<div><dt class="data">Link</dt><dd><a href="${w.url}" rel="noopener">${w.url.replace(/^https?:\/\//, '')}</a></dd></div>` : ''}
      </dl>
      <div class="prose reveal">${raw(w.html)}</div>
    </div>
  </article>
  <div class="spacer"></div>`;
  return layout(ctx, { path: `/work/${w.slug}/`, title: w.title, description: w.summary, body });
}

/* ───────────────────────── Contact ───────────────────────── */
export function contact(ctx) {
  const { site } = ctx;
  const body = html`
  ${pageHero({ title: 'Contact', lede: 'The quickest way to reach me is the Discord server. I read messages on the platforms below too.' })}
  <div class="wrap">
    <div class="contact-lead reveal">
      ${btn(site.discord, 'Join the Discord', { solid: true, lg: true, iconId: 'discord', ext: true })}
      ${site.email ? html`<p>Business enquiries: <a href="mailto:${site.email}" class="link">${site.email}</a></p>` : ''}
    </div>
    <div class="reveal">${socialGrid(site)}</div>
  </div>
  <div class="spacer"></div>`;
  return layout(ctx, { path: '/contact/', title: 'Contact', description: 'How to reach elkz: Discord, Twitch, YouTube, Bluesky, TikTok and Instagram.', body });
}

/* ───────────────────────── 404 ───────────────────────── */
export function notFound(ctx) {
  const body = html`<section class="lost">
    <p class="lost__code">404</p>
    <p>Nothing at this address. The link may be old, or it has a typo.</p>
    <div class="hero__actions">${btn('/', 'Back to the start', { solid: true })}${btn('/stream/', 'Stream schedule')}</div>
  </section>`;
  return layout(ctx, { path: '/404.html', title: 'Page not found', body, noCta: true });
}
