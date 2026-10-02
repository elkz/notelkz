// Twitch Helix client using an app access token (client credentials).
// Only public data is read, so no user login or extra scopes are needed.
const HELIX = 'https://api.twitch.tv/helix';

export class TwitchClient {
  constructor({ clientId, clientSecret, fetch = globalThis.fetch }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetch = fetch;
    this.token = null;
    this.tokenExpires = 0;
  }

  async getToken(force = false) {
    if (!force && this.token && Date.now() < this.tokenExpires - 60_000) return this.token;
    const body = new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'client_credentials' });
    const res = await this.fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Twitch token request failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    this.token = json.access_token;
    this.tokenExpires = Date.now() + json.expires_in * 1000;
    return this.token;
  }

  async get(path, params = {}, { allow404 = false, retried = false } = {}) {
    const url = new URL(HELIX + path);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
    const res = await this.fetch(url, {
      headers: { 'Client-Id': this.clientId, Authorization: `Bearer ${await this.getToken()}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 && !retried) {
      await this.getToken(true);
      return this.get(path, params, { allow404, retried: true });
    }
    if (res.status === 404 && allow404) return null;
    if (!res.ok) throw new Error(`Twitch ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async getUser(login) {
    const json = await this.get('/users', { login });
    const u = json.data[0];
    if (!u) throw new Error(`Twitch user "${login}" not found`);
    return { id: u.id, login: u.login, name: u.display_name, avatar: u.profile_image_url };
  }

  async getStream(userId) {
    const json = await this.get('/streams', { user_id: userId });
    const s = json.data[0];
    if (!s) return { live: false };
    return {
      live: true,
      title: s.title,
      game: s.game_name || null,
      viewers: s.viewer_count,
      startedAt: s.started_at,
      thumbnail: s.thumbnail_url || null, // contains {width}x{height}
    };
  }

  /** Upcoming schedule segments. Twitch answers 404 when no schedule exists. */
  async getSchedule(userId) {
    const json = await this.get('/schedule', { broadcaster_id: userId, first: 25 }, { allow404: true });
    if (!json) return { segments: [], vacation: null };
    const d = json.data;
    return {
      vacation: d.vacation ? { start: d.vacation.start_time, end: d.vacation.end_time } : null,
      segments: (d.segments || []).map((s) => ({
        id: s.id,
        start: s.start_time,
        end: s.end_time || null,
        title: s.title || '',
        game: s.category?.name || null,
        recurring: !!s.is_recurring,
        cancelled: !!s.canceled_until,
      })),
    };
  }

  /** Clips created in the last `days` days, newest first. */
  async getClips(userId, days = 21, first = 20) {
    // Twitch defaults ended_at to a week after started_at, so both are set explicitly.
    const ended = new Date();
    const started = new Date(ended.getTime() - days * 864e5);
    const json = await this.get('/clips', { broadcaster_id: userId, started_at: started.toISOString(), ended_at: ended.toISOString(), first });
    return json.data
      .map((c) => ({
        id: c.id,
        url: c.url,
        title: c.title,
        thumbnail: c.thumbnail_url || null,
        views: c.view_count,
        duration: c.duration,
        creator: c.creator_name,
        createdAt: c.created_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getVideos(userId, first = 6) {
    const json = await this.get('/videos', { user_id: userId, type: 'archive', first });
    return json.data.map((v) => ({
      id: v.id,
      url: v.url,
      title: v.title,
      // An in-progress broadcast has an empty thumbnail.
      thumbnail: v.thumbnail_url ? v.thumbnail_url.replace('%{width}', '640').replace('%{height}', '360') : null,
      views: v.view_count,
      duration: parseTwitchDuration(v.duration),
      createdAt: v.created_at,
    }));
  }
}

/** "3h2m1s" → 10921 */
export function parseTwitchDuration(s = '') {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}
