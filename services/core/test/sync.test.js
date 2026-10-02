import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planEventSync, applyEventPlan, planLiveTransition, planClipPosts, clipMessage, eventPayload, payloadHash } from '../src/sync.js';
import { parseTwitchDuration, TwitchClient } from '../src/twitch.js';
import { DiscordClient } from '../src/discord.js';

const H = 3600_000;
const now = Date.parse('2026-10-03T12:00:00Z');
const iso = (offsetH) => new Date(now + offsetH * H).toISOString();
const twitchUrl = 'https://www.twitch.tv/elkz';
const seg = (id, startH, extra = {}) => ({ id, start: iso(startH), end: iso(startH + 3), title: `Stream ${id}`, game: 'Wardogs', cancelled: false, ...extra });
const ev = (id, startH, status = 1) => ({ id, status, scheduled_start_time: iso(startH), scheduled_end_time: iso(startH + 3) });
const base = { now, windowDays: 14, twitchUrl };

test('creates events for upcoming segments inside the window only', () => {
  const plan = planEventSync({ ...base, segments: [seg('a', 5), seg('b', 24 * 20), seg('c', -1)], mapping: {}, discordEvents: [] });
  assert.deepEqual(plan.create.map((c) => c.segmentId), ['a']);
  assert.equal(plan.create[0].payload.entity_type, 3);
  assert.equal(plan.create[0].payload.entity_metadata.location, twitchUrl);
  assert.equal(plan.create[0].payload.description, 'Playing Wardogs.\nWatch live at https://www.twitch.tv/elkz');
});

test('leaves unchanged events alone and updates changed ones', () => {
  const s = seg('a', 5);
  const hash = payloadHash(eventPayload(s, { twitchUrl }));
  const same = planEventSync({ ...base, segments: [s], mapping: { a: { eventId: 'E1', hash } }, discordEvents: [ev('E1', 5)] });
  assert.equal(same.create.length + same.update.length + same.remove.length, 0);

  const moved = { ...s, title: 'New title' };
  const changed = planEventSync({ ...base, segments: [moved], mapping: { a: { eventId: 'E1', hash } }, discordEvents: [ev('E1', 5)] });
  assert.equal(changed.update.length, 1);
  assert.equal(changed.update[0].payload.name, 'New title');
});

test('recreates an event that was deleted in Discord', () => {
  const plan = planEventSync({ ...base, segments: [seg('a', 5)], mapping: { a: { eventId: 'GONE', hash: 'x' } }, discordEvents: [] });
  assert.equal(plan.create.length, 1);
});

test('removes events for cancelled or removed segments', () => {
  const mapping = { a: { eventId: 'E1', hash: 'h' }, b: { eventId: 'E2', hash: 'h' } };
  const plan = planEventSync({ ...base, segments: [seg('a', 5, { cancelled: true })], mapping, discordEvents: [ev('E1', 5), ev('E2', 30)] });
  assert.deepEqual(plan.remove.map((r) => r.reason).sort(), ['cancelled on Twitch', 'removed from Twitch schedule']);
});

test('cleans up past events that never went live, keeps ones in progress', () => {
  const mapping = { old: { eventId: 'E1', hash: 'h' }, now: { eventId: 'E2', hash: 'h' }, live: { eventId: 'E3', hash: 'h' } };
  const plan = planEventSync({ ...base, segments: [], mapping, discordEvents: [ev('E1', -6), ev('E2', -1), ev('E3', -1, 2)] });
  assert.deepEqual(plan.remove.map((r) => r.eventId), ['E1']);
});

test('forgets mappings for completed events', () => {
  const plan = planEventSync({ ...base, segments: [], mapping: { a: { eventId: 'E1', hash: 'h' } }, discordEvents: [ev('E1', -5, 3)] });
  assert.deepEqual(plan.forget, ['a']);
});

test('never touches events it did not create', () => {
  const plan = planEventSync({ ...base, segments: [], mapping: {}, discordEvents: [ev('SOMEONE_ELSES', 4)] });
  assert.equal(plan.remove.length, 0);
});

test('applyEventPlan records new event ids in state', async () => {
  const calls = [];
  const discord = { createEvent: async (g, p) => { calls.push(['create', p.name]); return { id: 'NEW' }; }, modifyEvent: async () => {}, deleteEvent: async () => {} };
  const state = { events: {} };
  const plan = planEventSync({ ...base, segments: [seg('a', 5)], mapping: {}, discordEvents: [] });
  await applyEventPlan(plan, { discord, guildId: 'G', state, log: { info() {} } });
  assert.equal(state.events.a.eventId, 'NEW');
  assert.deepEqual(calls, [['create', 'Stream a']]);
});

test('going live starts the nearest scheduled event; going offline ends it', () => {
  const mapping = { a: { eventId: 'E1' }, b: { eventId: 'E2' } };
  const events = [ev('E1', 0.25), ev('E2', 48), ev('NOT_OURS', 0)];
  assert.deepEqual(planLiveTransition({ live: true, wasLive: false, mapping, discordEvents: events, now }), { action: 'start', eventId: 'E1' });
  assert.deepEqual(planLiveTransition({ live: true, wasLive: false, mapping, discordEvents: [ev('E2', 48)], now }), { action: 'none' });
  assert.deepEqual(planLiveTransition({ live: false, wasLive: true, activeEventId: 'E1', mapping, discordEvents: [], now }), { action: 'end', eventId: 'E1' });
  assert.deepEqual(planLiveTransition({ live: true, wasLive: true, mapping, discordEvents: events, now }), { action: 'none' });
});

test('first run marks clips as seen instead of posting them', () => {
  const clips = [{ id: '1', createdAt: iso(-5) }, { id: '2', createdAt: iso(-1) }];
  assert.deepEqual(planClipPosts({ clips, posted: [], seededAt: null, backfill: false }), { post: [], markSeen: ['1', '2'] });
  assert.equal(planClipPosts({ clips, posted: [], seededAt: null, backfill: true }).post.length, 2);
});

test('later runs post only new clips, oldest first', () => {
  const clips = [{ id: '3', createdAt: iso(-0.1) }, { id: '2', createdAt: iso(-0.5) }, { id: '1', createdAt: iso(-5) }];
  const { post } = planClipPosts({ clips, posted: ['1'], seededAt: iso(-2), backfill: false });
  assert.deepEqual(post.map((c) => c.id), ['2', '3']);
});

test('clip messages escape markdown and never ping', () => {
  const m = clipMessage({ title: '@everyone *wow*', creator: 'a_b', url: 'https://clips.twitch.tv/x' });
  assert.equal(m.content, '✂️ **@everyone \\*wow\\*** clipped by a\\_b\nhttps://clips.twitch.tv/x');
  assert.deepEqual(m.allowed_mentions, { parse: [] });
});

test('parses Twitch durations', () => {
  assert.equal(parseTwitchDuration('3h2m1s'), 10921);
  assert.equal(parseTwitchDuration('45m'), 2700);
  assert.equal(parseTwitchDuration('12s'), 12);
});

test('Twitch client refreshes an expired token once', async () => {
  let tokenCalls = 0, apiCalls = 0;
  const fetch = async (url) => {
    if (String(url).includes('oauth2/token')) { tokenCalls++; return new Response(JSON.stringify({ access_token: `t${tokenCalls}`, expires_in: 3600 })); }
    apiCalls++;
    if (apiCalls === 1) return new Response('expired', { status: 401 });
    return new Response(JSON.stringify({ data: [{ id: '42', login: 'elkz', display_name: 'elkz', profile_image_url: '' }] }));
  };
  const t = new TwitchClient({ clientId: 'id', clientSecret: 's', fetch });
  assert.equal((await t.getUser('elkz')).id, '42');
  assert.equal(tokenCalls, 2);
});

test('Twitch schedule 404 means an empty schedule', async () => {
  const fetch = async (url) => String(url).includes('oauth2') ? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 })) : new Response('{}', { status: 404 });
  const t = new TwitchClient({ clientId: 'id', clientSecret: 's', fetch });
  assert.deepEqual(await t.getSchedule('42'), { segments: [], vacation: null });
});

test('Discord client waits and retries on rate limits', async () => {
  let n = 0; const slept = [];
  const fetch = async () => (++n === 1 ? new Response(JSON.stringify({ retry_after: 0.5 }), { status: 429 }) : new Response(JSON.stringify({ id: 'M' })));
  const d = new DiscordClient({ token: 't', fetch, sleep: async (ms) => slept.push(ms) });
  assert.deepEqual(await d.sendMessage('C', { content: 'hi' }), { id: 'M' });
  assert.deepEqual(slept, [600]);
});
