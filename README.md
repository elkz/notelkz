# notelkz.net

Personal streamer hub + portfolio. Plain HTML/CSS/JS — no framework, no build step.

## Editing content

Everything personal (name, socials, schedule, about, projects, email) lives in
**`js/config.js`**. Edit it and refresh. Empty fields/lists are hidden automatically.

## Running locally

The Twitch player refuses to load from `file://`, so serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Structure

```
index.html          page skeleton
css/style.css       all styling (tube-map theme, colours at the top)
js/config.js        your content
js/main.js          renders config + Twitch player / live badge
assets/fonts/       P22 Underground Heavy (woff2 + ttf)
assets/favicon.svg  roundel icon
```

## Deploying

Any static host works (GitHub Pages, Cloudflare Pages, Netlify). For GitHub Pages:
Settings → Pages → deploy from branch `main` / root, set custom domain `notelkz.net`,
then point the domain's DNS away from the WordPress host to GitHub Pages.
