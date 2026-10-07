// notelkz.net: live status, schedule and drawers. Data comes from /api (the core service) and /data/*.json.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (t, p = {}, ...k) => { const n = document.createElement(t); for (const [a, v] of Object.entries(p)) a === 'text' ? (n.textContent = v) : a === 'class' ? (n.className = v) : n.setAttribute(a, v); n.append(...k.flat(Infinity).filter((x) => x != null && x !== false)); return n; };
  const L = 'en-GB';
  const fDay = new Intl.DateTimeFormat(L, { weekday: 'long' }), fDayS = new Intl.DateTimeFormat(L, { weekday: 'short' });
  const fTime = new Intl.DateTimeFormat(L, { hour: '2-digit', minute: '2-digit' }), fDate = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'long' });
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = (d) => Math.round((sod(d) - sod(new Date())) / 864e5);
  const when = (d) => { const n = days(d); const t = fTime.format(d); return n === 0 ? `today at ${t}` : n === 1 ? `tomorrow at ${t}` : n < 7 ? `${fDay.format(d)} at ${t}` : `${fDay.format(d)} ${fDate.format(d)} at ${t}`; };
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- data: manual override file, then the core service (/api), then demo ---------- */
  const demo = new URLSearchParams(location.search).get('demo');
  const get = (u) => fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const at = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const DEMO = {
    status: { live: demo === 'live', title: 'First playthrough, no spoilers', game: 'Octopath Traveler 0', viewers: 23, startedAt: new Date(Date.now() - 52 * 6e4).toISOString() },
    schedule: { vacation: demo === 'twitch-holiday' ? { start: at(-2, 0), end: at(9, 0) } : null, segments: [
      { start: at(1, 20, 30), end: at(1, 23, 30), title: 'Story night', game: 'Octopath Traveler 0' },
      { start: at(2, 20, 30), end: at(2, 23, 30), title: 'Horror Friday', game: 'Still Wakes the Deep' },
      { start: at(5, 15), end: at(5, 18), title: 'Weekend run', game: 'Octopath Traveler 0', cancelled: true },
      { start: at(8, 20, 30), end: at(8, 23, 30), title: 'Story night', game: 'Octopath Traveler 0' }] },
    override: demo === 'holiday' ? { mode: 'holiday', holiday: { until: at(12, 0).slice(0, 10), message: '' } } : { mode: 'auto' },
  };
  let status = null, schedule = null, override = { mode: 'auto' };

  async function load() {
    if (demo) { ({ status, schedule, override } = DEMO); music({ configured: true, nowPlaying: true, track: 'Midnight City', artist: 'M83' }); return render(); }
    const [o, s, sc, mu] = await Promise.allSettled([get('/data/status.json'), get('/api/status'), get('/api/schedule'), get('/api/music')]);
    if (mu.status === 'fulfilled') music(mu.value);
    if (o.status === 'fulfilled') override = o.value;
    if (s.status === 'fulfilled') status = s.value;
    if (sc.status === 'fulfilled') schedule = sc.value;
    render();
  }

  /* ---------- Last.fm now playing (via the core service, so the API key stays private) ---------- */
  function music(m) {
    const np = $('[data-np]');
    if (!m || !m.configured || !m.track) { np.hidden = true; return; }
    np.hidden = false;
    np.dataset.playing = String(!!m.nowPlaying);
    $('[data-np-label]').textContent = m.nowPlaying ? 'Listening to' : 'Last played';
    $('[data-np-track]').textContent = m.artist ? `${m.track} · ${m.artist}` : m.track;
    np.title = $('[data-np-track]').textContent;
  }

  /* ---------- states ---------- */
  let timer = 0;
  function render() {
    clearInterval(timer);
    const upcoming = (schedule?.segments || []).filter((x) => !x.cancelled && new Date(x.start) > new Date());
    const next = upcoming[0];
    const manualHoliday = override?.mode === 'holiday';
    const twitchHoliday = schedule?.vacation && new Date(schedule.vacation.end) > new Date();
    const live = !!status?.live;

    let state = 'unknown';
    if (manualHoliday || (twitchHoliday && !live)) state = 'holiday';
    else if (live) state = 'live';
    else if (next) state = 'next';
    else if (schedule) state = 'none';
    document.body.dataset.state = state;

    const S = $('[data-status]'), T = $('[data-title]'), P = $('[data-text]'), C = $('[data-count]'), B = $('[data-bar]'), W = $('[data-watch-label]');
    C.hidden = true; B.dataset.mode = ''; B.firstElementChild.style.width = ''; W.textContent = 'Watch on Twitch';

    if (state === 'holiday') {
      const until = manualHoliday ? (override.holiday?.until ? new Date(`${override.holiday.until}T12:00:00`) : null) : new Date(schedule.vacation.end);
      const from = manualHoliday ? null : new Date(schedule.vacation.start);
      S.textContent = 'On a break';
      T.textContent = 'Taking a break.';
      P.replaceChildren(override.holiday?.message || 'No streams for a little while. ', until ? el('span', {}, 'Back on ', el('strong', { text: `${fDay.format(until)} ${fDate.format(until)}` }), '.') : 'Back soon.');
      if (until) countdown(until);
      if (from && until) { B.dataset.mode = 'progress'; const k = Math.min(1, Math.max(0, (Date.now() - from) / (until - from))); B.firstElementChild.style.width = `${Math.round(k * 100)}%`; }
    } else if (state === 'live') {
      S.textContent = `Live now${status.viewers != null ? ` · ${status.viewers} watching` : ''}`;
      T.textContent = "We're live.";
      P.replaceChildren(el('strong', { text: status.game || 'Live on Twitch' }), status.title ? ` · ${status.title}` : '');
      W.textContent = 'Watch live now';
    } else if (state === 'next') {
      const d = new Date(next.start);
      S.textContent = `Offline · next stream ${fDayS.format(d)} ${fTime.format(d)}`;
      T.textContent = 'Next stream in';
      P.replaceChildren(el('strong', { text: next.title || 'Stream' }), next.game ? ` · ${next.game}, ` : ', ', when(d), '.');
      countdown(d);
    } else if (state === 'none') {
      S.textContent = 'Offline';
      T.textContent = 'No stream scheduled.';
      P.textContent = 'Follow on Twitch and you will get a notification the moment I go live.';
    } else {
      S.textContent = 'twitch.tv/elkz';
      T.textContent = 'Catch the next stream.';
      P.textContent = 'Follow on Twitch to get a notification when I go live.';
    }
  }
  function countdown(target) {
    const C = $('[data-count]'); C.hidden = false;
    const tick = () => { let s = Math.max(0, Math.floor((target - Date.now()) / 1000)); $('[data-d]').textContent = pad(Math.floor(s / 86400)); s %= 86400; $('[data-h]').textContent = pad(Math.floor(s / 3600)); $('[data-m]').textContent = pad(Math.floor((s % 3600) / 60)); $('[data-s]').textContent = pad(s % 60); if (target - Date.now() <= 0) { clearInterval(timer); setTimeout(load, 30000); } };
    tick(); timer = setInterval(tick, 1000);
  }

  /* ---------- drawers ---------- */
  /* Game Tracker: served by the core service from the Logged & Loaded feed (cached, last good copy kept) */
  const LL_PROFILE = 'https://backlogged.notelkz.net/u/elkz';
  let GAMES = null;
  const loadGames = () => get('/api/games').then((d) => (GAMES = d)).catch(() => { if (!GAMES) GAMES = { error: true }; });
  loadGames();
  let SETUP = [], FAME = null;
  get('/data/setup.json').then((d) => (SETUP = d.sections || [])).catch(() => {});
  get('/data/fame.json').then((d) => (FAME = d)).catch(() => {});
  const views = {
    schedule: ['Schedule', () => { const list = schedule?.segments || []; if (document.body.dataset.state === 'holiday') return el('p', { class: 'empty', text: 'On a break, so nothing is scheduled right now.' });
      return list.length ? el('div', {}, list.map((x) => { const d = new Date(x.start); return el('div', { class: 'item' }, el('span', {}, el('b', { text: `${fDayS.format(d)} ${fTime.format(d)}` }), el('small', { text: fDate.format(d) })), el('span', {}, el('b', { text: x.title || 'Stream' }), el('small', { text: x.game || '' })), x.cancelled ? el('span', { class: 'tag', text: 'Cancelled' }) : null); })) : el('p', { class: 'empty', text: 'Nothing scheduled yet.' }); }],
    setup: ['Setup', () => el('div', {}, SETUP.map((sec) => [el('p', { class: 'h3', text: sec.title }), sec.items.map((it) => el('div', { class: 'item' }, el('span', { text: it.label }), el('span', { text: it.value })))]))],
    games: ['Game Tracker', () => {
      const https = (u, prefix = 'https://') => (typeof u === 'string' && u.startsWith(prefix) ? u : null);
      const profile = https(GAMES?.profile) || LL_PROFILE;
      const source = el('a', { class: 'gt-source', href: profile, rel: 'noopener', text: 'Tracked on Logged & Loaded' });
      if (!GAMES || GAMES.error || GAMES.configured === false || !GAMES.lists) {
        return el('div', {}, el('p', { class: 'empty', text: "Couldn't load the game list just now. It's on Logged & Loaded in the meantime." }), source);
      }
      const row = (g, ordered) => {
        const meta = [g.year, (g.platforms || []).join(', '), g.hours != null ? `${g.hours} h played` : null].filter(Boolean).join(' · ');
        const cover = https(g.cover, 'https://images.igdb.com/')
          ? el('img', { class: 'gt-cover', src: g.cover, alt: '', loading: 'lazy', width: '44', height: '59' })
          : el('span', { class: 'gt-cover', 'aria-hidden': 'true' });
        const url = https(g.url);
        const title = url ? el('a', { class: 'gt-title', href: url, rel: 'noopener', text: g.name }) : el('span', { class: 'gt-title', text: g.name });
        return el('li', { class: `gt-item${ordered ? ' gt-item--ordered' : ''}` },
          ordered ? el('span', { class: 'gt-pos', text: String(g.position) }) : null,
          cover, el('span', { class: 'gt-text' }, title, meta ? el('small', { text: meta }) : null));
      };
      const section = (key, heading, ordered) => {
        const list = GAMES.lists[key] || [];
        return [el('p', { class: 'h3', text: heading }),
          list.length ? el(ordered ? 'ol' : 'ul', { class: 'gt-list' }, list.map((g) => row(g, ordered))) : el('p', { class: 'gt-note', text: 'Nothing here right now.' })];
      };
      return el('div', {},
        section('next', 'Up next', true), section('playing', 'Playing now', false), section('finished', 'Recently finished', false),
        GAMES.stale ? el('p', { class: 'gt-note', text: "Logged & Loaded didn't answer just now, so this is the last saved copy." }) : null,
        source);
    }],
    fame: ['Wall of Fame', () => FAME && FAME.entries?.length ? el('div', {}, FAME.intro ? el('p', { class: 'empty', text: FAME.intro }) : null, FAME.entries.map((e) => [el('p', { class: 'h3', text: e.title }), el('div', { class: 'item' }, el('span', {}, el('b', { text: e.name }), e.note ? el('small', { text: e.note }) : null), e.value ? el('span', { text: e.value }) : null)])) : el('p', { class: 'empty', text: 'Nobody on the wall yet.' })],
  };
  const dr = $('.drawer'); let opener;
  const open = (k, b) => { const [t, f] = views[k]; opener = b; $('[data-dt]').textContent = t; $('[data-db]').replaceChildren(f()); dr.hidden = false; requestAnimationFrame(() => document.body.classList.add('open')); $('.x').focus(); };
  const close = () => { document.body.classList.remove('open'); setTimeout(() => (dr.hidden = true), 450); opener?.focus(); };
  $$('[data-open]').forEach((b) => b.addEventListener('click', async () => { if (b.dataset.open === 'games') await Promise.race([loadGames(), new Promise((r) => setTimeout(r, 1500))]); open(b.dataset.open, b); }));
  $$('[data-close]').forEach((b) => b.addEventListener('click', close));
  addEventListener('keydown', (e) => e.key === 'Escape' && document.body.classList.contains('open') && close());

  load();
  setInterval(() => { if (!document.hidden && !demo) load(); }, 60000);
})();
