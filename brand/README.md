# notelkz brand kit

Everything here uses the same background as notelkz.net (`web/app.css`): base `#0b0c0b` with two soft glows.

| Mood | Top-right glow | Bottom-left glow | Use for |
|---|---|---|---|
| default | green `rgba(0,255,100,.2)` | Twitch purple `rgba(145,70,255,.2)` | offline screen, panels, banner, most scenes |
| live | stronger green `.3` | stronger purple `.28` | starting soon, live scenes |
| holiday | amber `rgba(255,176,64,.2)` | teal `rgba(0,200,180,.14)` | break / vacation screen |

Type: Inter (in `web/fonts/`), weight 850 for headlines with tight letter-spacing (-0.04em), 600 for buttons, uppercase 700 with wide spacing for small labels. Accent green `#00ff64`, holiday amber `#ffb040`, Twitch `#9146ff`, Discord `#5865f2`.

## Files

- `backgrounds/<mood>/scene-1920x1080.png`: stream scenes and the Twitch offline (video player) banner
- `backgrounds/<mood>/profile-banner-1200x480.png`: Twitch profile banner
- `panels/*.png`: 640×200 About / Schedule / Setup / Game Tracker / Wall of Fame / Discord / Socials / Throne, plus `blank.png`
- 4K (3840×2160) scenes aren't committed; regenerate them with `node brand/render.mjs` (needs Playwright).

To add a panel or size, edit the lists at the top of `render.mjs` and run it again.
