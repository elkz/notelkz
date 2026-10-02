// Twitch → Discord sync. The planners are pure functions (easy to test);
// the apply* functions carry out a plan against the Discord API and update state.
import { createHash } from 'node:crypto';
import { EventStatus } from './discord.js';

const HOUR = 3600_000;
const DEFAULT_LENGTH = 3 * HOUR;

/* ───────────── Scheduled events ───────────── */

export function eventPayload(segment, { twitchUrl }) {
  const start = new Date(segment.start);
  const end = segment.end ? new Date(segment.end) : new Date(start.getTime() + DEFAULT_LENGTH);
  const name = (segment.title || 'Live on Twitch').slice(0, 100);
  const lines = [segment.game ? `Playing ${segment.game}.` : null, `Watch live at ${twitchUrl}`];
  return {
    name,
    description: lines.filter(Boolean).join('\n').slice(0, 1000),
    privacy_level: 2, // GUILD_ONLY — the only value Discord accepts
    entity_type: 3,   // EXTERNAL
    entity_metadata: { location: twitchUrl },
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: end.toISOString(),
  };
}

export const payloadHash = (p) => createHash('sha1')
  .update(JSON.stringify([p.name, p.description, p.scheduled_start_time, p.scheduled_end_time, p.entity_metadata.location]))
  .digest('hex').slice(0, 16);

/**
 * Work out what to change in Discord so its events match the Twitch schedule.
 * Twitch is the source of truth; only events this service created are touched.
 *
 * @param {object} o
 * @param {Array}  o.segments       normalised Twitch segments
 * @param {object} o.mapping        state.events: segmentId -> { eventId, hash, start, end }
 * @param {Array}  o.discordEvents  current guild scheduled events
 * @param {number} o.now            ms timestamp
 * @param {number} o.windowDays     how far ahead to mirror
 * @param {string} o.twitchUrl
 */
export function planEventSync({ segments, mapping, discordEvents, now, windowDays, twitchUrl }) {
  const plan = { create: [], update: [], remove: [], forget: [] };
  const byId = new Map(discordEvents.map((e) => [e.id, e]));
  const segById = new Map(segments.map((s) => [s.id, s]));
  const horizon = now + windowDays * 24 * HOUR;

  for (const seg of segments) {
    const start = Date.parse(seg.start);
    if (seg.cancelled || start <= now || start > horizon) continue;
    const payload = eventPayload(seg, { twitchUrl });
    const hash = payloadHash(payload);
    const known = mapping[seg.id];
    const event = known && byId.get(known.eventId);

    if (!event) {
      // New segment, or someone deleted the Discord event: (re)create it.
      plan.create.push({ segmentId: seg.id, payload, hash });
    } else if (event.status === EventStatus.SCHEDULED && known.hash !== hash) {
      plan.update.push({ segmentId: seg.id, eventId: event.id, payload, hash });
    }
  }

  for (const [segmentId, known] of Object.entries(mapping)) {
    const seg = segById.get(segmentId);
    const event = byId.get(known.eventId);
    if (!event || event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELED) {
      if (!seg || seg.cancelled || Date.parse(seg.start) <= now) plan.forget.push(segmentId);
      continue;
    }
    if (event.status !== EventStatus.SCHEDULED) continue; // ACTIVE: the live tracker will end it

    const start = Date.parse(event.scheduled_start_time);
    const end = Date.parse(event.scheduled_end_time || known.end || 0) || start + DEFAULT_LENGTH;
    if (seg && seg.cancelled) {
      plan.remove.push({ segmentId, eventId: event.id, reason: 'cancelled on Twitch' });
    } else if (!seg && start > now) {
      plan.remove.push({ segmentId, eventId: event.id, reason: 'removed from Twitch schedule' });
    } else if (start <= now && end < now) {
      plan.remove.push({ segmentId, eventId: event.id, reason: 'time passed without going live' });
    }
  }
  return plan;
}

export async function applyEventPlan(plan, { discord, guildId, state, log }) {
  for (const c of plan.create) {
    const ev = await discord.createEvent(guildId, c.payload);
    state.events[c.segmentId] = { eventId: ev.id, hash: c.hash, start: c.payload.scheduled_start_time, end: c.payload.scheduled_end_time };
    log.info(`Discord event created: "${c.payload.name}" ${c.payload.scheduled_start_time}`);
  }
  for (const u of plan.update) {
    await discord.modifyEvent(guildId, u.eventId, u.payload);
    state.events[u.segmentId] = { eventId: u.eventId, hash: u.hash, start: u.payload.scheduled_start_time, end: u.payload.scheduled_end_time };
    log.info(`Discord event updated: "${u.payload.name}"`);
  }
  for (const r of plan.remove) {
    try {
      await discord.deleteEvent(guildId, r.eventId);
    } catch (err) {
      if (err.status !== 404) throw err;
    }
    delete state.events[r.segmentId];
    log.info(`Discord event removed (${r.reason})`);
  }
  for (const id of plan.forget) delete state.events[id];
  return plan.create.length + plan.update.length + plan.remove.length + plan.forget.length;
}

/* ───────────── Live tracking ───────────── */

/**
 * When the stream starts, mark the closest scheduled event as started;
 * when it ends, mark that event as completed.
 */
export function planLiveTransition({ live, wasLive, activeEventId, mapping, discordEvents, now }) {
  if (live && !wasLive) {
    const ours = new Set(Object.values(mapping).map((m) => m.eventId));
    const candidates = discordEvents
      .filter((e) => ours.has(e.id) && e.status === EventStatus.SCHEDULED)
      .map((e) => ({ e, gap: Math.abs(Date.parse(e.scheduled_start_time) - now) }))
      .filter(({ e }) => {
        const start = Date.parse(e.scheduled_start_time);
        return start >= now - 2 * HOUR && start <= now + 1 * HOUR;
      })
      .sort((a, b) => a.gap - b.gap);
    return candidates.length ? { action: 'start', eventId: candidates[0].e.id } : { action: 'none' };
  }
  if (!live && wasLive && activeEventId) return { action: 'end', eventId: activeEventId };
  return { action: 'none' };
}

/* ───────────── Clips ───────────── */

/** Which clips to post. On first run (no seededAt) nothing is posted unless backfill is on. */
export function planClipPosts({ clips, posted, seededAt, backfill }) {
  const seen = new Set(posted);
  if (!seededAt && !backfill) return { post: [], markSeen: clips.map((c) => c.id) };
  const post = clips
    .filter((c) => !seen.has(c.id) && (backfill && !seededAt ? true : c.createdAt > seededAt))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { post, markSeen: [] };
}

const escapeMd = (s) => String(s).replace(/([\\*_~`|>#[\]()-])/g, '\\$1');

export function clipMessage(clip) {
  return {
    content: `✂️ **${escapeMd(clip.title)}** clipped by ${escapeMd(clip.creator)}\n${clip.url}`,
    allowed_mentions: { parse: [] }, // never ping anyone from a clip title
  };
}
