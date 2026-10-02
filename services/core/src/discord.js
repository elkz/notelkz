// Minimal Discord REST client. The bot only needs REST (no gateway connection):
// scheduled events and channel messages.
const API = 'https://discord.com/api/v10';

export const EventStatus = { SCHEDULED: 1, ACTIVE: 2, COMPLETED: 3, CANCELED: 4 };

export class DiscordError extends Error {
  constructor(status, body, route) {
    super(`Discord ${route} failed: ${status} ${body}`);
    this.status = status;
  }
}

export class DiscordClient {
  constructor({ token, fetch = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
    this.token = token;
    this.fetch = fetch;
    this.sleep = sleep;
  }

  async request(method, route, body, attempt = 0) {
    const res = await this.fetch(API + route, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        'User-Agent': 'DiscordBot (https://notelkz.net, 1.0)',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429 && attempt < 3) {
      const info = await res.json().catch(() => ({}));
      await this.sleep(Math.ceil((info.retry_after ?? 1) * 1000) + 100);
      return this.request(method, route, body, attempt + 1);
    }
    if (res.status === 204) return null;
    if (!res.ok) throw new DiscordError(res.status, await res.text(), `${method} ${route}`);
    return res.json();
  }

  listEvents(guildId) { return this.request('GET', `/guilds/${guildId}/scheduled-events`); }
  createEvent(guildId, payload) { return this.request('POST', `/guilds/${guildId}/scheduled-events`, payload); }
  modifyEvent(guildId, eventId, payload) { return this.request('PATCH', `/guilds/${guildId}/scheduled-events/${eventId}`, payload); }
  deleteEvent(guildId, eventId) { return this.request('DELETE', `/guilds/${guildId}/scheduled-events/${eventId}`); }
  sendMessage(channelId, payload) { return this.request('POST', `/channels/${channelId}/messages`, payload); }
}
