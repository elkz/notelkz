# notelkz.net

Personal site for **elkz**: live status, stream schedule, setup, portfolio and socials, plus a small service that keeps Twitch, the website and Discord in step.

```
content/          ← everything you edit day to day
  site.json         name, tagline, Twitch, socials, optional contact email
  about.md          bio (Markdown) and the History timeline
  games.json        games on the About page
  setup.json        gear lines and PC specs
  work/*.md         one file per portfolio project
site/             static site generator (Node, one dependency: marked)
  templates/        page templates
  assets/           main.css (design system) and main.js (live data)
  public/           fonts, logo, icons, share image
services/core/    Twitch API cache + Discord sync (Node, zero dependencies)
deploy/           docker-compose, nginx config
.github/workflows CI: build + upload the site, test + redeploy the service
```

## How it fits together

```
 Twitch API ──► core service (Docker, 127.0.0.1:8787) ──► Discord: events + clip posts
                     │
                     ▼  /api/status, /api/schedule, /api/clips, /api/videos
 nginx ── serves site/dist (static HTML) and proxies /api ──► visitors
```

- **The site is static.** Pages are built from `content/` at deploy time, so they're fast, cacheable and have nothing to hack. Live data is fetched in the browser from `/api`.
- **The core service** polls Twitch (live status every minute, schedule and clips every 10 minutes, past broadcasts every 30), keeps the results in memory for the site, and:
  - mirrors the next 14 days of your **Twitch schedule into Discord scheduled events**: it creates, updates and removes them as you change the schedule on Twitch;
  - **starts the matching Discord event when you go live and ends it when you stop**;
  - **posts new clips** to the Discord channel or thread you choose.
- Twitch is the source of truth. The bot only edits events it created itself, and it never pings anyone (`allowed_mentions` is empty).

## Editing content

Edit files in `content/` (the GitHub web editor works fine) and push to `main`. The site rebuilds and deploys in about a minute. A typo in a JSON file fails the build with a message naming the file, so the live site is never broken.

- **New project:** copy `content/work/notelkz-net.md`, rename it, and edit the frontmatter. `featured: true` puts it on the home page; `draft: true` hides it.
- **Images for projects:** put them in `site/public/img/work/` and reference them in Markdown: `![Description](/img/work/name.webp)`.
- **Schedule:** edit it on Twitch (Creator Dashboard → Settings → Stream → Schedule). The site and Discord follow within 10 minutes.

## Local development

```bash
cd site && npm install && npm run dev      # http://localhost:4321
# no service running? preview with sample data:
#   http://localhost:4321/?demo=live   or   ?demo=offline

cd services/core && cp .env.example .env   # add Twitch + Discord credentials
npm run dev                                # http://127.0.0.1:8787/api/health
npm test
```

## First-time server setup (Ubuntu 24.04)

**1. Twitch app.** Go to <https://dev.twitch.tv/console/apps> → Register. Use any OAuth redirect URL (`http://localhost`), category *Website Integration*. Copy the Client ID and generate a secret.

**2. Discord bot.** Go to <https://discord.com/developers/applications> → New Application → Bot → Reset Token. Invite it with this URL, replacing `APP_ID`:

```
https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot&permissions=17875653905408
```

That grants View Channels, Send Messages, Send Messages in Threads, Embed Links, Create Events and Manage Events. If the clips channel is private, give the bot access to it. No privileged intents are needed, because the bot only uses Discord's REST API.

**3. Code and service.**

```bash
sudo git clone https://github.com/elkz/notelkz /opt/notelkz && sudo chown -R $USER /opt/notelkz
cd /opt/notelkz/deploy
cp ../services/core/.env.example .env && nano .env     # fill in IDs, secret, token
docker compose up -d --build
curl -s 127.0.0.1:8787/api/health                      # should show twitch:true, discord:true
docker compose logs -f core                            # watch the first sync
```

On the first run, existing clips are marked as already seen so the channel doesn't get flooded. Set `DISCORD_BACKFILL_CLIPS=true` once if you want last week's clips posted.

**4. Web root and nginx.** notelkz.net currently points at WordPress, so back that up first, then:

```bash
sudo mkdir -p /var/www/notelkz.net && sudo chown $USER /var/www/notelkz.net
sudo cp nginx/notelkz-security.conf /etc/nginx/snippets/
sudo cp nginx/notelkz.net.conf /etc/nginx/sites-available/notelkz.net
sudo rm /etc/nginx/sites-enabled/<old-wordpress-site>        # whatever the WP config is called
sudo ln -s /etc/nginx/sites-available/notelkz.net /etc/nginx/sites-enabled/
sudo certbot certonly --nginx -d notelkz.net -d www.notelkz.net   # skip if certs already exist
sudo nginx -t && sudo systemctl reload nginx
```

`backlogged.notelkz.net` has its own server block, so it isn't affected.

**5. Deploys from GitHub.** Create a deploy key pair (`ssh-keygen -t ed25519 -f deploy`), add `deploy.pub` to `~/.ssh/authorized_keys` of a user who owns `/var/www/notelkz.net` and `/opt/notelkz` and can run `docker`. Then add these repository secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (the private key) and `DEPLOY_KNOWN_HOSTS` (from `ssh-keyscan -t ed25519 your-host`). Run **Deploy site** once from the Actions tab.

## Design notes

- **Concept: the elkz line.** The stag's own palette and your P22 Underground typeface, organised with the language of a transit diagram. The home page is a route map of the site. Setup is a set of gear "lines" that end at the PC. The About history is a line of stops.
- **One colour.** The ember of the stag's eyes (`#d68500`) is the only accent. It marks things that are alive or actionable: the line, live status, the main button and keyboard focus. Everything else uses the logo's greys.
- **Type.** P22 Underground Heavy for display, and Instrument Sans (open licence, self-hosted) for reading.
- **Motion.** One load sequence on the home page (stag, wordmark, then the line drawing down). The line fills as you scroll the route map in supporting browsers. Everything else moves only in response to hover or click. Reduced-motion preferences turn it all off.
- **Privacy.** No third-party requests until a visitor clicks to load the Twitch player, apart from Twitch thumbnail images. No cookies of our own, so no cookie banner is needed.

### Font licence

`P22UndergroundW01-Heavy` is a commercial webfont. It's in this repo because it was in the original, but **the repo is public, so anyone can download the font from it.** Check that your licence allows self-hosting, and consider making the repo private or moving the font to the server only.
