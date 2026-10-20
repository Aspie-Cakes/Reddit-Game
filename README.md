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

The build exports a static site into `out/`. There are no secrets, databases, APIs, or server functions to configure. Sessions are not saved or sent anywhere. The app works best in an active browser tab: background tabs, device sleep, and mobile power saving can throttle audio and timers. The session clock catches up when the browser runs again; missed spoken cues are consolidated.

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
