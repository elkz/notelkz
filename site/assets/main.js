// notelkz.net client script: live data from /api, plus the small interactions.
// No framework. API data is only ever written with textContent / DOM nodes.
(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  };
  const svg = (d, fill = true, size = 18) => {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    if (fill) p.setAttribute('fill', 'currentColor'); else { p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2'); }
    s.append(p);
    return s;
  };
  const PLAY = 'M7 4.5v15l13-7.5z';

  /* ---------- nav ---------- */
  const nav = $('[data-nav]');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const toggle = $('[data-nav-toggle]');
  if (toggle) {
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); toggle.focus(); } });
    $$('#nav-links a').forEach((a) => a.addEventListener('click', () => set(false)));
    matchMedia('(min-width: 62.01rem)').addEventListener('change', (m) => m.matches && set(false));
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const watchReveals = (root = document) => $$('.reveal:not(.in)', root).forEach((n) => io.observe(n));
  watchReveals();

  /* ---------- formatting ---------- */
  const L = 'en-GB';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fTime = new Intl.DateTimeFormat(L, { hour: '2-digit', minute: '2-digit' });
  const fDay = new Intl.DateTimeFormat(L, { weekday: 'long' });
  const fDayS = new Intl.DateTimeFormat(L, { weekday: 'short' });
  const fDate = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'short' });
  const fNum = new Intl.NumberFormat(L, { notation: 'compact', maximumFractionDigits: 1 });
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = (d) => Math.round((sod(d) - sod(new Date())) / 864e5);
  const dayName = (d, short) => { const n = diffDays(d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : (short ? fDayS : fDay).format(d); };
  const dur = (sec) => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
  const uptime = (iso) => { const m = Math.floor((Date.now() - new Date(iso)) / 6e4); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

  /* ---------- HUD clock (streamer's time) ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const f = new Intl.DateTimeFormat(L, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    const tick = () => { clock.replaceChildren('UK time', el('strong', { text: f.format(new Date()) })); };
    tick(); setInterval(tick, 15_000);
  }

  /* ---------- data ---------- */
  const demo = new URLSearchParams(location.search).get('demo');
  const api = async (path) => {
    if (demo) return mock(path, demo);
    const r = await fetch(`/api/${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  };
  let status = null;
  let schedule = null;
  const upcoming = () => (schedule ? schedule.segments.filter((s) => new Date(s.end || s.start) > new Date()) : []);
  const nextStream = () => upcoming().find((s) => !s.cancelled && new Date(s.start) > new Date());

  /* ---------- live status everywhere ---------- */
  function renderStatus() {
    const live = !!(status && status.live);
    const next = nextStream();
    $$('[data-live-chip]').forEach((c) => {
      c.dataset.state = live ? 'live' : 'offline';
      $('[data-live-text]', c).textContent = live ? 'Live now' : 'Offline';
    });
    $$('[data-hero-status]').forEach((h) => {
      h.dataset.state = live ? 'live' : 'offline';
      const t = $('[data-hero-status-text]', h);
      if (live) t.textContent = ['Live now', status.game, status.viewers != null ? `${status.viewers} watching` : null].filter(Boolean).join(' · ');
      else if (next) t.textContent = `Offline · next stream ${dayName(new Date(next.start), true)} ${fTime.format(new Date(next.start))}`;
      else t.textContent = 'Offline';
    });
    const wl = $('[data-watch-label]');
    if (wl) wl.textContent = live ? 'Watch live now' : 'Watch on Twitch';

    const title = $('[data-live-title]'), meta = $('[data-live-meta]');
    if (title) title.textContent = live ? (status.title || 'Live now') : 'Offline right now';
    if (meta) {
      if (live) meta.textContent = `Playing ${status.game || 'something'} for ${status.viewers ?? 0} viewers · live for ${uptime(status.startedAt)}`;
      else if (next) meta.textContent = `Next stream ${dayName(new Date(next.start)).toLowerCase()} at ${fTime.format(new Date(next.start))}: ${next.title || 'Stream'}`;
      else meta.textContent = 'Nothing scheduled right now. Follow on Twitch to get notified when I go live.';
    }
    const poster = $('[data-player-poster]'), plabel = $('[data-player-label]');
    if (poster && live && status.thumbnail) { poster.src = status.thumbnail.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`; poster.hidden = false; }
    if (plabel) plabel.textContent = live ? 'Watch live here' : 'Load the stream';
    renderOnAir();
  }

  /* ---------- on air panel + countdown ---------- */
  let cdTimer = 0;
  function renderOnAir() {
    const label = $('[data-onair-label]');
    if (!label) return;
    const live = !!(status && status.live);
    const next = nextStream();
    const cd = $('[data-countdown]'), thumb = $('[data-onair-thumb]');
    const t = $('[data-onair-title]'), g = $('[data-onair-game]');
    clearInterval(cdTimer);
    if (live) {
      label.replaceChildren(el('span', { class: 'live__dot', 'aria-hidden': 'true' }), 'Live now');
      t.textContent = status.title || 'Live on Twitch';
      g.textContent = `${status.game || 'Live'} · ${status.viewers ?? 0} watching · ${uptime(status.startedAt)} on air`;
      cd.hidden = true;
      if (status.thumbnail) {
        thumb.replaceChildren(el('img', { src: status.thumbnail.replace('{width}', '960').replace('{height}', '540') + `?t=${Date.now()}`, alt: `Live preview: ${status.title || ''}` }));
        thumb.hidden = false;
      }
      return;
    }
    thumb.hidden = true;
    if (!next) {
      label.textContent = 'Next stream';
      t.textContent = 'Nothing scheduled yet';
      g.textContent = 'Follow on Twitch and you will get a notification when I go live.';
      cd.hidden = true;
      return;
    }
    const start = new Date(next.start);
    label.textContent = `Next stream · ${dayName(start)} ${fTime.format(start)}`;
    t.textContent = next.title || 'Live on Twitch';
    g.textContent = next.game || '';
    cd.hidden = false;
    const parts = { d: $('[data-cd="d"]', cd), h: $('[data-cd="h"]', cd), m: $('[data-cd="m"]', cd), s: $('[data-cd="s"]', cd) };
    const tick = () => {
      let ms = Math.max(0, start - Date.now());
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      parts.d.textContent = String(d).padStart(2, '0'); parts.h.textContent = String(h).padStart(2, '0');
      parts.m.textContent = String(m).padStart(2, '0'); parts.s.textContent = String(s).padStart(2, '0');
    };
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  /* ---------- schedule ---------- */
  function renderSchedule() {
    const note = $('[data-tz-note]');
    if (note) note.textContent = `Times in your time zone · ${tz.replace(/_/g, ' ')}`;
    const items = upcoming();
    const now = new Date();
    const first = nextStream();

    $$('[data-upcoming]').forEach((box) => {
      const n = Number(box.dataset.count || 4);
      const list = items.slice(0, n);
      if (!list.length) {
        box.replaceChildren(el('p', { class: 'empty', text: 'Nothing on the schedule yet. Follow on Twitch to hear when I go live.' }));
        return;
      }
      box.replaceChildren(...list.map((s) => {
        const start = new Date(s.start), end = s.end ? new Date(s.end) : null;
        const isLive = status && status.live && start <= now && (!end || end >= now);
        const flag = s.cancelled ? 'Cancelled' : isLive ? 'Live' : s === first ? 'Next' : null;
        return el('a', { class: `row${s.cancelled ? ' row--cancelled' : ''}${isLive ? ' row--now' : ''}`, href: box.dataset.full != null ? 'https://www.twitch.tv/elkz/schedule' : '/stream/' },
          el('span', { class: 'row__day', text: dayName(start, true) }),
          el('span', { class: 'row__date data', text: fDate.format(start) }),
          el('span', { class: 'row__main' },
            el('span', { class: 'row__title' }, s.title || 'Stream', flag ? el('span', { class: 'chip row__flag' }, el('span', { text: flag })) : null),
            el('span', { class: 'row__game', text: s.game || '' })),
          el('span', { class: 'row__time data' }, el('time', { datetime: s.start, text: fTime.format(start) }), end ? `–${fTime.format(end)}` : '', el('small', { text: 'your time' })));
      }));
    });

    const week = $('[data-week]');
    if (week) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const segs = items.filter((s) => !s.cancelled && sod(new Date(s.start)).getTime() === sod(d).getTime());
        days.push(el('div', { class: `week__day${segs.length ? ' week__day--on' : ''}${i === 0 ? ' week__day--today' : ''}` },
          el('span', { class: 'week__name', text: i === 0 ? 'Today' : fDayS.format(d) }),
          segs.length
            ? segs.map((s) => el('span', { class: 'week__slot data' }, fTime.format(new Date(s.start)), el('span', { text: s.title || s.game || 'Stream' })))
            : el('span', { class: 'week__rest data', text: 'Rest' })));
      }
      week.replaceChildren(...days);
    }
    if (schedule && schedule.vacation) {
      const end = new Date(schedule.vacation.end);
      $$('[data-upcoming]').forEach((b) => b.prepend(el('p', { class: 'empty', text: `On a break until ${fDay.format(end)} ${fDate.format(end)}.` })));
    }
  }

  /* ---------- clips & videos ---------- */
  const card = ({ url, thumbnail, title, seconds, meta }) => el('article', { class: 'media' },
    el('a', { class: 'media__link', href: url, rel: 'noopener' },
      el('div', { class: 'media__thumb' },
        thumbnail ? el('img', { src: thumbnail, alt: '', loading: 'lazy', decoding: 'async', width: 480, height: 270 }) : null,
        el('span', { class: 'media__play' }, svg(PLAY, true, 22)),
        seconds ? el('span', { class: 'media__dur data', text: dur(seconds) }) : null),
      el('h3', { class: 'media__title', text: title }),
      el('p', { class: 'media__meta data', text: meta })));

  function fill(sel, items, toCard, emptyText) {
    $$(sel).forEach((box) => {
      if (!items.length) { const p = box.querySelector('.empty'); if (p) p.textContent = emptyText; return; }
      box.replaceChildren(...items.slice(0, Number(box.dataset.count || 6)).map(toCard));
      updateCarousels();
    });
  }
  const clipCard = (c) => card({ url: c.url, thumbnail: c.thumbnail, title: c.title, seconds: c.duration, meta: `${fNum.format(c.views)} views · by ${c.creator}` });
  const vodCard = (v) => card({ url: v.url, thumbnail: v.thumbnail, title: v.title, seconds: v.duration, meta: `${fDate.format(new Date(v.createdAt))} · ${fNum.format(v.views)} views` });

  /* ---------- carousels ---------- */
  function updateCarousels() {
    $$('[data-carousel-prev]').forEach((b) => {
      const t = document.getElementById(b.dataset.carouselPrev);
      const next = $(`[data-carousel-next="${b.dataset.carouselPrev}"]`);
      if (!t) return;
      b.disabled = t.scrollLeft < 8;
      next.disabled = t.scrollLeft + t.clientWidth >= t.scrollWidth - 8;
    });
  }
  $$('[data-carousel-prev], [data-carousel-next]').forEach((b) => {
    const id = b.dataset.carouselPrev || b.dataset.carouselNext;
    const t = document.getElementById(id);
    if (!t) return;
    b.addEventListener('click', () => t.scrollBy({ left: (b.dataset.carouselPrev ? -1 : 1) * t.clientWidth * 0.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    t.addEventListener('scroll', updateCarousels, { passive: true });
  });
  updateCarousels();

  /* ---------- player & chat (click to load: Twitch only loads when asked) ---------- */
  const host = location.hostname;
  const load = (btnSel, boxSel, url, title) => {
    const b = $(btnSel);
    if (!b) return;
    b.addEventListener('click', () => {
      const box = b.closest(boxSel);
      const f = el('iframe', { src: url(box.dataset.channel), title, allow: 'autoplay; fullscreen', allowfullscreen: '' });
      box.replaceChildren(f);
      f.focus();
    });
  };
  load('[data-player-load]', '[data-player]', (c) => `https://player.twitch.tv/?${new URLSearchParams({ channel: c, parent: host, autoplay: 'true' })}`, 'Twitch stream player');
  load('[data-chat-load]', '[data-chat]', (c) => `https://www.twitch.tv/embed/${encodeURIComponent(c)}/chat?${new URLSearchParams({ parent: host, darkpopout: '' })}`, 'Twitch chat');

  /* ---------- boot ---------- */
  const refresh = async () => { try { status = await api('status'); renderStatus(); } catch { /* stay neutral */ } };
  (async () => {
    await Promise.allSettled([
      api('schedule').then((s) => { schedule = s; renderSchedule(); }),
      refresh(),
      $('[data-clips]') && api('clips').then((c) => fill('[data-clips]', c.clips, clipCard, 'No clips from the last few weeks yet.')),
      $('[data-videos]') && api('videos').then((v) => fill('[data-videos]', v.videos, vodCard, 'No past broadcasts right now.')),
    ]);
    renderStatus();
    renderSchedule();
    watchReveals();
    setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
  })();

  /* ---------- demo data: ?demo=live or ?demo=offline ---------- */
  function mock(path, mode) {
    const at = (days, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const live = mode === 'live';
    const nowH = new Date().getHours();
    const data = {
      status: { configured: true, live, title: live ? 'First playthrough, no spoilers please' : null, game: live ? 'Metaphor: ReFantazio' : null, viewers: live ? 38 : 0, startedAt: new Date(Date.now() - 97 * 6e4).toISOString(), thumbnail: null },
      schedule: { vacation: null, segments: [
        ...(live ? [{ id: 'n', start: at(0, nowH - 1), end: at(0, nowH + 2), title: 'First playthrough', game: 'Metaphor: ReFantazio', cancelled: false }] : []),
        { id: 'a', start: at(1, 20, 30), end: at(1, 23, 30), title: 'JRPG night', game: 'Metaphor: ReFantazio', cancelled: false },
        { id: 'b', start: at(2, 20, 30), end: at(2, 23, 30), title: 'Story catch-up', game: 'Final Fantasy VII Rebirth', cancelled: false },
        { id: 'c', start: at(4, 15), end: at(4, 18), title: 'Weekend variety', game: 'Just Chatting', cancelled: true },
        { id: 'd', start: at(8, 20, 30), end: at(8, 23, 30), title: 'JRPG night', game: 'Metaphor: ReFantazio', cancelled: false },
      ] },
      clips: { clips: ['That boss had no right', 'Chat called it', 'The perfect parry', 'Lore dump at 2am', 'Not the save point', 'One more turn'].map((t, i) => ({ url: '#', thumbnail: null, title: t, duration: 18 + i * 7, views: 120 + i * 97, creator: ['viewer42', 'elkz', 'nightowl'][i % 3] })) },
      videos: { videos: ['JRPG night', 'Story catch-up', 'Setup tour and Q&A'].map((t, i) => ({ url: '#', thumbnail: null, title: t, duration: 10800 - i * 1500, views: 400 - i * 60, createdAt: at(-2 - i * 2, 20) })) },
    };
    return Promise.resolve(data[path]);
  }
})();
