/*
 * ─────────────────────────────────────────────────────────────
 *  notelkz.net — site content
 *  Everything personal lives here. Edit this file, refresh, done.
 *  Anything left empty ("" or []) is simply hidden on the page.
 * ─────────────────────────────────────────────────────────────
 */
window.SITE = {
  name: "notelkz",
  tagline: "Streamer · Gamer · Maker",
  intro:
    "Hey, I'm notelkz. I stream games, chat with good people and build things on the side. Pull up a seat.",

  // Your Twitch username — powers the live player and the LIVE badge.
  twitch: "notelkz",

  // Shown as buttons in the header and the Contact section.
  // `color` is the accent stripe — pick any CSS colour.
  socials: [
    { label: "Twitch",  url: "https://twitch.tv/notelkz",          color: "#9146ff" },
    { label: "YouTube", url: "https://youtube.com/@notelkz",       color: "#e32017" },
    { label: "X",       url: "https://x.com/notelkz",              color: "#a0a5a9" },
    { label: "Discord", url: "https://discord.gg/your-invite",     color: "#5865f2" },
    { label: "GitHub",  url: "https://github.com/elkz",            color: "#f3a9bb" },
  ],

  // Weekly timetable. `time` is free text, so include your timezone.
  schedule: [
    { day: "Monday",    time: "19:00 – 23:00 UK", what: "Variety night" },
    { day: "Wednesday", time: "19:00 – 23:00 UK", what: "Main game" },
    { day: "Friday",    time: "20:00 – late UK",  what: "Community games" },
    { day: "Sunday",    time: "14:00 – 18:00 UK", what: "Chill / building stuff" },
  ],

  about: [
    "Write a couple of paragraphs about yourself here — who you are, what you stream, and what people can expect when they turn up.",
    "This section is also a good place for setup details, the games you're into, or anything else you want people to know.",
  ],

  // Quick facts shown beside the About text.
  facts: [
    { label: "Based in",   value: "United Kingdom" },
    { label: "Streaming",  value: "Since 20XX" },
    { label: "Main games", value: "Add yours" },
  ],

  // Portfolio. `tags` are optional; `url` makes the card clickable.
  projects: [
    {
      title: "notelkz.net",
      blurb: "This site. Hand-built, no framework, styled after the London Underground.",
      tags: ["HTML", "CSS", "JS"],
      url: "https://github.com/elkz/notelkz",
    },
    {
      title: "Project two",
      blurb: "Describe something you've made — overlays, mods, videos, art, code, anything.",
      tags: ["Placeholder"],
      url: "",
    },
    {
      title: "Project three",
      blurb: "Each card can link out to a repo, a video or a write-up.",
      tags: ["Placeholder"],
      url: "",
    },
  ],

  email: "", // e.g. "hello@notelkz.net" — leave empty to hide
};
