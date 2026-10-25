# remry.ai

The marketing site for [Remry](https://github.com/remry-ai/remry): one static page, no build step.
Product claims come from Remry's README; keep them in step with it.

```
public/
├── index.html      the page
├── styles.css      light and dark themes (tokens on :root)
├── main.js         picks the visitor's download, the demo's pause button, analytics events
├── analytics.js    analytics hook (a no-op until a provider is switched on)
├── _headers        Cloudflare Pages headers: CSP and caching
├── images/         screenshots and the demo from remry/docs/images, resized, plus og.png
└── 404.html, robots.txt, sitemap.xml, favicons, icons/
```

## Pricing

Pro shows the founding price ($40 USD / $50 CAD a year, locked in while you renew) and the later
price ($60 USD / $80 CAD) as a future price, not struck through, since no one has paid it yet.

## Newsletter

The footer form submits `email` to `https://blog.jweatherby.dev/subscribe`, Substack's subscribe
page, with the address filled in. The hero's "Follow along" button links to that form
(`#subscribe`) and puts the cursor in the email box; share `remry.ai/#subscribe` for the same.

## Run it locally

```bash
npx serve public     # or: python3 -m http.server -d public
```

## Deploy

`.github/workflows/deploy.yml` deploys `public/` to the Cloudflare Pages project `remry-landing`
with Wrangler, creating the project on the first run. A push to `main` deploys production; any
other branch gets a preview URL. It uses two repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_KEY` (or `CLOUDFLARE_API_TOKEN`): a Cloudflare **API token** with *Account → Cloudflare Pages → Edit*
  (Wrangler reads it as `CLOUDFLARE_API_TOKEN`). A legacy Global API Key won't work here.

Once the project exists, attach the domain in the Cloudflare dashboard: Workers & Pages →
remry-landing → Custom domains → `remry.ai` (and `www.remry.ai`, redirecting to it).

## Analytics

Off by default. `public/analytics.js` explains how to switch on Cloudflare Web Analytics or
Plausible, and which hosts to add to the CSP in `public/_headers`. Download, newsletter and
Buy Pro clicks carry `data-track` names.

## Images

The screenshots and demos are recorded from the real app, not copied from Remry's README, so
they follow the current layout. `tools/demo/build.sh` remakes all of them:

1. It fills a throwaway notebook (`tools/demo/.data`) with a demo team, using `seed.py`.
2. It records each scene of the demo with Playwright: a prompt typed into a "You → Claude"
   bubble, the change made with the Remry CLI (what Claude does over MCP), then the result
   (`record.js`), at 2x with page loads left out. This runs once at desktop size (1080×675, so the
   app's text shows near full size on the page) and once at phone size (390×660),
   so phones get a real phone recording rather than a crop.
3. It takes the stills at both sizes (`shots.js`).
4. It writes everything the page uses into `public/images` (`images.py`).

It needs a Remry clone beside this repo (or `REMRY_REPO`) with `bun install` and
`bunx prisma generate` run, plus Playwright, ffmpeg and Python 3 with Pillow. Run it after a
UI change, check the images, and commit `public/images`.
