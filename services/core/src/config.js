// All configuration comes from environment variables (see .env.example).
const env = process.env;
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export const config = {
  port: num(env.PORT, 8787),
  host: env.HOST || '127.0.0.1',
  stateFile: env.STATE_FILE || './data/state.json',

  twitch: {
    clientId: env.TWITCH_CLIENT_ID || '',
    clientSecret: env.TWITCH_CLIENT_SECRET || '',
    login: (env.TWITCH_LOGIN || 'elkz').toLowerCase(),
  },

  lastfm: {
    apiKey: env.LASTFM_API_KEY || '',
    user: env.LASTFM_USER || 'notelkz',
  },

  discord: {
    token: env.DISCORD_BOT_TOKEN || '',
    guildId: env.DISCORD_GUILD_ID || '',
    // A text channel ID or a thread ID — both accept messages the same way.
    clipsChannelId: env.DISCORD_CLIPS_CHANNEL_ID || '',
    syncEvents: bool(env.DISCORD_SYNC_EVENTS, true),
    postClips: bool(env.DISCORD_POST_CLIPS, true),
    // Start the matching Discord event when the stream goes live, and end it when the stream ends.
    trackLive: bool(env.DISCORD_TRACK_LIVE, true),
    eventWindowDays: num(env.DISCORD_EVENT_WINDOW_DAYS, 14),
    // On first run, existing clips are marked as seen. Set true to post the last week's clips once.
    backfillClips: bool(env.DISCORD_BACKFILL_CLIPS, false),
  },

  intervals: {
    stream: num(env.POLL_STREAM_SECONDS, 60) * 1000,
    schedule: num(env.POLL_SCHEDULE_SECONDS, 600) * 1000,
    clips: num(env.POLL_CLIPS_SECONDS, 600) * 1000,
    videos: num(env.POLL_VIDEOS_SECONDS, 1800) * 1000,
    music: num(env.POLL_MUSIC_SECONDS, 30) * 1000,
  },
};

export const twitchEnabled = () => Boolean(config.twitch.clientId && config.twitch.clientSecret);
export const discordEnabled = () => Boolean(config.discord.token && config.discord.guildId);
