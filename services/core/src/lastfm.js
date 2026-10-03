// Last.fm "now playing" for the site header. The API key stays on the server.
const API = 'https://ws.audioscrobbler.com/2.0/';

/** Turn Last.fm's user.getrecenttracks response into what the page needs. */
export function parseRecentTrack(json) {
  const t = json?.recenttracks?.track?.[0];
  if (!t) return { track: null };
  const img = (t.image || []).find((i) => i.size === 'large') || (t.image || []).find((i) => i.size === 'medium');
  return {
    nowPlaying: t['@attr']?.nowplaying === 'true',
    track: t.name || null,
    artist: t.artist?.['#text'] || t.artist?.name || null,
    url: t.url || null,
    image: img?.['#text'] || null,
    playedAt: t.date?.uts ? new Date(Number(t.date.uts) * 1000).toISOString() : null,
  };
}

export async function getRecentTrack({ apiKey, user, fetch = globalThis.fetch }) {
  const url = new URL(API);
  url.search = new URLSearchParams({ method: 'user.getrecenttracks', user, api_key: apiKey, format: 'json', limit: '1' });
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'notelkz.net/1.0' } });
  if (!res.ok) throw new Error(`Last.fm failed: ${res.status} ${await res.text()}`);
  return parseRecentTrack(await res.json());
}
