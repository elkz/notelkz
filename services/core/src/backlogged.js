// Logged & Loaded game feed for the Game Tracker drawer: one list (by default your public "Stream games" list).
// Fetched server-side every few minutes; the last good copy is kept (in memory and on disk)
// so the page still has games to show if the feed is briefly unreachable.
// Only the fields the page uses are kept, and every link and image is checked
// against an allow-list of hosts before it can reach the page.

const IMAGE_HOSTS = new Set(['images.igdb.com']);

const text = (v, max = 120) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Accept only https URLs on an allowed host. Anything else becomes null. */
export function safeUrl(value, hosts) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && hosts.has(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

function game(item, linkHosts, i) {
  const year = Number.isInteger(item?.releaseYear) && item.releaseYear > 1950 && item.releaseYear < 2100 ? item.releaseYear : null;
  const hours = typeof item?.hoursPlayed === 'number' && Number.isFinite(item.hoursPlayed) && item.hoursPlayed > 0 ? Math.round(item.hoursPlayed * 10) / 10 : null;
  return {
    position: Number.isInteger(item?.position) ? item.position : i + 1,
    name: text(item?.name) || 'Untitled game',
    url: safeUrl(item?.url, linkHosts),
    cover: safeUrl(item?.coverSmall, IMAGE_HOSTS) || safeUrl(item?.cover, IMAGE_HOSTS),
    year,
    platforms: Array.isArray(item?.platforms) ? item.platforms.map((p) => text(p, 30)).filter(Boolean).slice(0, 4) : [],
    hours,
  };
}

/** The list the site shows: the first name in the feed URL's ?lists= (e.g. stream-games). */
export const listKey = (feedUrl) => (new URL(feedUrl).searchParams.get('lists') || '').split(',')[0].trim().toLowerCase();

/** Reduce the feed to { profile, title, games, feedUpdatedAt } for the one list we show. */
export function normaliseFeed(json, feedUrl, max = 50) {
  const key = listKey(feedUrl);
  if (!key) throw new Error('BACKLOGGED_FEED_URL has no ?lists= name');
  if (!json || typeof json !== 'object' || !json.lists || typeof json.lists !== 'object') throw new Error('Feed has no lists');
  // A wrong or private list name comes back in "missing"; an older Logged & Loaded just leaves it out.
  if ((Array.isArray(json.missing) && json.missing.includes(key)) || !Array.isArray(json.lists[key])) {
    throw new Error(`Logged & Loaded list "${key}" not found: check the name, and that the list is public`);
  }
  const linkHosts = new Set([new URL(feedUrl).hostname]);
  const games = json.lists[key].slice(0, max).map((item, i) => game(item, linkHosts, i)).sort((a, b) => a.position - b.position);
  return {
    profile: safeUrl(json.user?.profile, linkHosts),
    title: text(json.titles?.[key], 60) || 'Stream games',
    games,
    feedUpdatedAt: typeof json.updatedAt === 'string' ? json.updatedAt : null,
  };
}

export async function fetchGames({ url, fetch = globalThis.fetch }) {
  const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'notelkz.net/1.0' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Logged & Loaded feed failed: ${res.status}`);
  return normaliseFeed(await res.json(), url);
}
