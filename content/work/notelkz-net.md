---
title: notelkz.net
summary: This site. A self-hosted creator hub with live Twitch data and a Discord bot that keeps stream events in step with the Twitch schedule.
year: 2026
status: Live
kind: Website + service
stack: [Node.js, Twitch API, Discord API, Nginx, Docker]
url: https://notelkz.net
featured: false
order: 4
---

A static site, built from Markdown and JSON in a git repo, plus one small Node service on my VPS.

- The service checks Twitch every minute, so the live status is never stale.
- My Twitch schedule is copied to Discord as server events, and new clips are posted to a channel automatically.
- The design is built around my stag logo and the P22 Underground typeface.
