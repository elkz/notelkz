# notelkz.net

A one-page hub for **elkz** on Twitch: live status, countdown to the next stream, schedule, setup, game tracker, Wall of Fame, socials and Last.fm now playing.

```
web/                 the site (nginx serves this folder)
  index.html, app.css, app.js
  data/              ← edit these to change what the drawers show
    setup.json         Setup drawer
    fame.json          Wall of Fame
    status.json        holiday mode (see below)
services/core/       small Node service (no dependencies): reads Twitch, Last.fm and Logged & Loaded, serves /api
deploy/              nginx config, systemd unit, update script
```

## How it works

- The page asks `/api/status`, `/api/schedule` and `/api/music` every minute. The core service polls Twitch (live status every minute, schedule every 10 minutes) and Last.fm (every 30 seconds) and keeps the results in memory, so visitors never hit those APIs directly and no keys reach the browser.
- **Game Tracker** comes from your Logged & Loaded feed. The service fetches it every 5 minutes and keeps the last good copy (also saved to disk), so the drawer never breaks if Logged & Loaded is down. Change what you track on Logged & Loaded and the site follows within about 5 minutes.
- The page picks its state by itself: **live**, **next stream** (countdown), **nothing scheduled**, or **holiday**.
- **Holiday** turns on when your Twitch schedule is in vacation mode, or when `web/data/status.json` says `"mode": "holiday"`. Set `"until": "YYYY-MM-DD"` to show a return date and countdown; set `"mode": "auto"` to go back.
- Optional: with Discord settings in `.env`, the service also mirrors your Twitch schedule into Discord events and posts new clips to a channel (see `services/core/.env.example`).

## Editing

Edit any file in `web/data/` on GitHub (pencil icon → commit), then on the server:

```bash
sudo /var/www/notelkz/deploy/update.sh
```

Or edit directly on the server with `nano /var/www/notelkz/web/data/setup.json`; it shows on the next page load. (Commit the same change on GitHub too, or the next `git pull` will complain.)

Preview any state without being live: `/?demo=offline`, `/?demo=live`, `/?demo=holiday`, `/?demo=twitch-holiday`.

## Server setup (once)

```bash
git clone https://github.com/elkz/notelkz /var/www/notelkz
cp /var/www/notelkz/services/core/.env.example /var/www/notelkz/services/core/.env   # fill in TWITCH_* and LASTFM_*
chmod 644 /var/www/notelkz/services/core/.env
cp /var/www/notelkz/deploy/notelkz-core.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now notelkz-core
cp /var/www/notelkz/deploy/notelkz.net.conf /etc/nginx/sites-available/notelkz.net
ln -s /etc/nginx/sites-available/notelkz.net /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d notelkz.net -d www.notelkz.net
```

Service tests: `cd services/core && node --test`.

`P22UNDERGROUND.TTF` is a commercial webfont and this repository is public; the site doesn't use it.
