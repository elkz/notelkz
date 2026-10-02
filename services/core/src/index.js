// notelkz core service
//  - polls Twitch for live status, schedule, clips and past broadcasts
//  - serves them to the website at /api/*
//  - mirrors the Twitch schedule into Discord scheduled events
//  - posts new clips to a Discord channel or thread
import { config, twitchEnabled, discordEnabled } from './config.js';
import { log } from './log.js';
import { loadState, saveState } from './state.js';
import { TwitchClient } from './twitch.js';
import { DiscordClient } from './discord.js';
import { createServer } from './server.js';
import { planEventSync, applyEventPlan, planLiveTransition, planClipPosts, clipMessage } from './sync.js';
import { EventStatus } from './discord.js';

const twitchUrl = `https://www.twitch.tv/${config.twitch.login}`;
const cache = { status: null, schedule: null, clips: null, videos: null };
const lastRun = {};
const lastError = {};
const state = await loadState(config.stateFile);
const persist = () => saveState(config.stateFile, state).catch((e) => log.error('Saving state failed:', e));

const twitch = twitchEnabled() ? new TwitchClient(config.twitch) : null;
const discord = discordEnabled() ? new DiscordClient({ token: config.discord.token }) : null;
let user = null;

/* ---------- jobs ---------- */

async function pollStream() {
  const s = await twitch.getStream(user.id);
  cache.status = { configured: true, url: twitchUrl, ...s, updatedAt: new Date().toISOString() };

  if (discord && config.discord.trackLive && s.live !== state.live.wasLive) {
    const events = await discord.listEvents(config.discord.guildId);
    const t = planLiveTransition({
      live: s.live, wasLive: state.live.wasLive, activeEventId: state.live.activeEventId,
      mapping: state.events, discordEvents: events, now: Date.now(),
    });
    try {
      if (t.action === 'start') {
        await discord.modifyEvent(config.discord.guildId, t.eventId, { status: EventStatus.ACTIVE });
        state.live.activeEventId = t.eventId;
        log.info('Stream is live: Discord event started');
      } else if (t.action === 'end') {
        await discord.modifyEvent(config.discord.guildId, t.eventId, { status: EventStatus.COMPLETED });
        state.live.activeEventId = null;
        log.info('Stream ended: Discord event completed');
      }
    } catch (err) {
      // The event may have been edited or ended by hand; don't let that block live tracking.
      log.warn('Live event update skipped:', err);
      if (t.action === 'end') state.live.activeEventId = null;
    }
  }
  if (s.live !== state.live.wasLive) {
    log.info(s.live ? `Live: ${s.title}` : 'Offline');
    state.live.wasLive = s.live;
    persist();
  }
}

async function pollSchedule() {
  const sched = await twitch.getSchedule(user.id);
  cache.schedule = { ...sched, updatedAt: new Date().toISOString() };

  if (discord && config.discord.syncEvents) {
    const events = await discord.listEvents(config.discord.guildId);
    const plan = planEventSync({
      segments: sched.segments, mapping: state.events, discordEvents: events,
      now: Date.now(), windowDays: config.discord.eventWindowDays, twitchUrl,
    });
    try {
      await applyEventPlan(plan, { discord, guildId: config.discord.guildId, state, log });
    } finally {
      persist(); // keep whatever succeeded, even if a later call failed
    }
  }
}

async function pollClips() {
  const clips = await twitch.getClips(user.id);
  cache.clips = { clips, updatedAt: new Date().toISOString() };

  if (discord && config.discord.postClips && config.discord.clipsChannelId) {
    const { post, markSeen } = planClipPosts({
      clips, posted: state.clips.posted, seededAt: state.clips.seededAt, backfill: config.discord.backfillClips,
    });
    const firstRun = !state.clips.seededAt;
    state.clips.posted.push(...markSeen);
    for (const clip of post) {
      await discord.sendMessage(config.discord.clipsChannelId, clipMessage(clip));
      state.clips.posted.push(clip.id);
      log.info(`Clip posted to Discord: ${clip.title}`);
      persist();
    }
    if (firstRun) {
      state.clips.seededAt = new Date().toISOString();
      log.info(`Clip posting ready. ${markSeen.length} existing clips marked as already seen.`);
    }
    state.clips.posted = state.clips.posted.slice(-500);
    persist();
  }
}

async function pollVideos() {
  const videos = await twitch.getVideos(user.id);
  cache.videos = { videos, updatedAt: new Date().toISOString() };
}

function every(name, ms, job) {
  const run = async () => {
    try {
      await job();
      lastRun[name] = new Date().toISOString();
      delete lastError[name];
    } catch (err) {
      lastError[name] = err.message;
      log.error(`${name}:`, err);
    } finally {
      setTimeout(run, ms).unref?.();
    }
  };
  return run();
}

/* ---------- start ---------- */

const server = createServer(cache, () => ({
  ok: Object.keys(lastError).length === 0,
  twitch: twitchEnabled(),
  discord: discordEnabled(),
  user: user?.login ?? null,
  lastRun,
  lastError,
}));
server.listen(config.port, config.host, () => log.info(`API listening on http://${config.host}:${config.port}`));

if (!twitch) {
  log.warn('TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not set: serving empty data. See .env.example.');
  cache.status = { configured: false, live: false, url: twitchUrl };
  cache.schedule = { segments: [], vacation: null };
  cache.clips = { clips: [] };
  cache.videos = { videos: [] };
} else {
  if (!discord) log.warn('DISCORD_BOT_TOKEN / DISCORD_GUILD_ID not set: Discord sync is off.');
  for (let attempt = 1; !user; attempt++) {
    try {
      user = await twitch.getUser(config.twitch.login);
      log.info(`Tracking Twitch channel ${user.name} (${user.id})`);
    } catch (err) {
      const wait = Math.min(300, 5 * 2 ** attempt);
      log.error(`Twitch user lookup failed, retrying in ${wait}s:`, err);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
  every('stream', config.intervals.stream, pollStream);
  every('schedule', config.intervals.schedule, pollSchedule);
  every('clips', config.intervals.clips, pollClips);
  every('videos', config.intervals.videos, pollVideos);
}

const shutdown = async (sig) => {
  log.info(`${sig} received, shutting down`);
  server.close();
  await saveState(config.stateFile, state).catch(() => {});
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
