# Aria’s House

A responsive, local-only rhythm studio built with Next.js App Router, React, TypeScript, and Tailwind CSS. Aria is an original illustrated adult AI character (25+). Her guidance is scripted and spoken using the browser’s text-to-speech engine; no external AI API or account is required.

## Development

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the development server on port 3000. Click **Begin your session** to unlock browser audio. Speech availability and voices vary by browser/device. Metronome audio and Aria speech can be muted independently. Use headphones at a comfortable volume.

```sh
npm test
npm run build
npm run typecheck
```

The build exports a static site into `out/`. The rhythm studio needs no secrets or database. The Reddit viewer uses the included Cloudflare Worker API; see the Reddit section below. Session state is not sent anywhere. The app works best in an active browser tab: background tabs, device sleep, and mobile power saving can throttle audio and timers. The session clock catches up when the browser runs again; missed spoken cues are consolidated.

## Controls

- Base tempo: 30–200 BPM, with slider and ±5 buttons.
- Patterns: steady; faster/slower over session progress; random per beat; smooth wave; chaos with wider random variation.
- Energy: balanced, crescendo (+30 BPM over a session), decrescendo (−30 BPM). Pattern and energy changes combine and remain bounded to 30–200 BPM.
- Difficulty presets: gentle (60), balanced (80), intense (110). Tempo remains adjustable.
- Sessions: 5–60 minutes, pause/resume preserving elapsed time, stop resetting the clock, and automatic completion.
- Aria delivers a fresh instruction every two minutes. **Let Aria lead** additionally cycles rhythm patterns. Disabling it keeps spoken guidance and manual rhythm control.
- Reduced-motion preferences disable character animation.

## Cloudflare Pages deployment

1. Push this repository’s `main` branch to GitHub.
2. In Cloudflare, choose **Workers & Pages → Create → Pages → Connect to Git** and authorize access to `Aspie-Cakes/Reddit-Game`.
3. Select production branch `main`, root directory `/`, build command `npm run build`, and output directory `out`.
4. Set `NODE_VERSION` to `24` if the build image uses an older runtime. No Next.js Workers adapter is needed: this is a static export. If selecting a preset, use **Next.js (Static HTML Export)** or configure the values manually.
5. Deploy. Cloudflare supplies the deployment URL; optionally add a custom domain in the project settings.

Do not use a server-rendered Next.js preset or `next start` for this export. For a local production check, run `npx serve out` after building. `_headers` is copied into the export for Cloudflare security headers.

## Cloudflare Workers deployment (the existing connected project)

The Next.js static export runs on Cloudflare Workers Static Assets, with a small Worker serving the Reddit API. The checked-in `wrangler.jsonc` explicitly selects `out/`, so Wrangler does not auto-migrate Next.js to OpenNext. The `worker/index.ts` entry point serves `/api/reddit` and passes other requests to the static assets binding. No Next.js server adapter is required.

For the connected **reddit-game** Worker, use these build settings:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version: `24`

Save the settings and retry deployment using the latest `main` commit. The asset directory is specified in `wrangler.jsonc`; do not select `.next` or run an OpenNext build. Keep the existing Pages instructions above if deploying through Pages instead.

To check the deployment bundle without publishing:

```sh
npm run deploy:check
```

To preview the Cloudflare static-assets runtime locally:

```sh
npm run preview:cloudflare
```

To deploy manually, authenticate Wrangler with your Cloudflare account and run `npm run deploy`. Cloudflare's connected Git build supplies its own deployment authentication. Do not store tokens in the repository.

If a build log shows `opennextjs-cloudflare build` followed by a missing `.next/standalone/.next/server/pages-manifest.json`, the project was auto-detected as a server application. The explicit static-assets configuration fixes that mismatch. Deployment is only confirmed once Cloudflare reports success and provides a working URL.

## Reddit photo and video shuffle

The default communities are r/RubyJay, r/LilyBrooksOBriant, r/mckennagracelove, r/Anna_cathcart, r/XochitlGomezStan, r/MiyaCech, and r/MomonaTamada. Edit the community list in the Reddit room; it is saved only in that browser. Loading contacts Reddit and media hosts. No Reddit account login is collected from visitors.

The viewer loads up to 100 current hot posts per community, chooses a community uniformly and then a random supported media item, and changes every 15 seconds. It avoids immediate repeats when another item is available. This is a shuffle of the loaded pool, not the full community archive. Pause and Next controls are independent of the rhythm session. Videos autoplay muted and are replaced at 15 seconds even when longer; controls allow manual playback and sound. Reddit fallback video streams often do not include an audio track. Images, GIFs, galleries, and Reddit-hosted MP4s are supported; third-party video embeds are not.

**Deploy the complete app as the configured Cloudflare Worker.** Static Pages or a plain static file server cannot run `/api/reddit`. For local development with real Reddit data, run `npm run preview:cloudflare`; `npm run dev` alone provides the UI without the API. The browser reports access failures and keeps usable communities when some fail.

Reddit public API access is not guaranteed. During development, Reddit returned HTTP 403 with “blocked by network security”; live data could not be verified from this environment. No access restrictions are bypassed. If Cloudflare is also denied, obtain approved Reddit API access for the intended usage. For an approved confidential Reddit application, set these **encrypted secrets** in the Cloudflare Worker’s Settings → Variables and Secrets:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`

Or use `npx wrangler secret put REDDIT_CLIENT_ID` and `npx wrangler secret put REDDIT_CLIENT_SECRET` from an authenticated terminal. Never put values in Git, the frontend, or chat. The Worker uses application-only OAuth client credentials, caches the short-lived token, and reads from `oauth.reddit.com`. Public access is used only when both credentials are absent. A partial credential configuration does not enable OAuth. Reddit approval, subreddit restrictions, rate limits, and removed posts can still prevent access. No credentials are bundled or fabricated.

For local OAuth testing, put those names and your values in an ignored `.dev.vars` file. Mocked tests verify extraction, request validation, access errors, OAuth routing, and 15-second shuffle behavior; they do not establish live Reddit access.

## Future music

No music or remote audio is bundled or loaded. `lib/music.ts` defines `MusicProvider` and `MusicTrack`; a future licensed Suno catalog can implement the provider and add a player without changing the metronome. Track playback, licensing, and any authentication are intentionally left for that integration.

## Structure

- `app/page.tsx`: accessible session UI, Web Audio ticks, speech, and lifecycle.
- `app/globals.css`: responsive visual system and reduced-motion support.
- `lib/rhythm.ts`: bounded tempo calculations and time formatting.
- `lib/rhythm.test.ts`: deterministic rhythm regression tests.
- `tests/session.spec.ts`: browser coverage for session controls and completion.

## Browser tests

Build first, then run the tests against the static export (Python 3 serves it locally):

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

If Chromium is already installed, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. The tests cover both desktop and mobile layouts, controls, pause timing, two-minute pattern changes, and session completion.
