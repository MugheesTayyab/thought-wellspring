# Phase 05 — Release readiness and QA record

## Shared design and motion system

- Foundation: warm ivory canvas, white paper surfaces, ink copy, coral action state, and subordinate lilac/butter/sage accents.
- Type: DM Sans for interface/body text and Instrument Serif for reflective quotations.
- Surface language: 20–32px rounded paper cards, quiet borders, low shadows, and one primary action per area.
- Motion primitives:
  - `motion-note-in`: 240ms, small vertical settle for a placed/opened note.
  - `motion-panel-in`: 280ms, short bottom-sheet entrance.
  - `motion-progress`: 420ms width transition for verified progress/results only.
- The existing global `prefers-reduced-motion: reduce` rule reduces all animation and transitions to effectively static behavior.
- Interactive controls use visible global focus rings and 44px target helpers where space allows.

## Trust and microcopy audit

- Removed unsupported personality scores and “secretly knows you” claims.
- Removed mock Duel content and vote totals from the production data path.
- Removed instant unlock paths.
- Removed unimplemented gifts, follower promises, limited drops, leaderboard language, and streak pressure from active experiences.
- Removed claims that a Duel is daily when the backend only guarantees an active Duel.
- Guest/account, saved-data, and avatar copy distinguishes server-backed data from browser-local data.

## Verified in this revision

- Production client, SSR, and Cloudflare Nitro build: passed with `npm run build`.
- Targeted ESLint for the changed Phase 04/05 routes, hooks, stores, and components: passed.
- `git diff --check`: passed (line-ending notices only on Windows).
- Source audit confirms no active Read percentage or mock Duel fallback remains.
- Read includes loading, honest insufficient-data, editorial result, local save, copy, and share states.
- Duel includes loading, API error, no-active-duel, voting, selected, sparse-result, and real-result states.
- Corner includes loading, network error, zero-history, guest, signed-in, saved, and settings states.
- Ember supports Escape dismissal, explicit close, backdrop close, initial close-button focus, and body-scroll locking.

## Release cautions / unresolved validation

- Automated mobile screenshots and video were not produced in this environment. Do not treat source inspection as proof of iOS Safari, Android Chrome, keyboard, or safe-area behavior.
- Core Web Vitals were not measured against a deployed production URL; no LCP/INP/CLS achievement is claimed.
- Screen-reader passes on VoiceOver/TalkBack and 200% text scaling remain manual release checks.
- The Supabase report migration in `20261020000000_phase03_echo_reports.sql` must be applied to the production project for server-backed Echo reporting to work there.
- The build reports existing route-discovery warnings for helper modules under `src/routes/api`; these predate this visual rollout and do not fail the build.

## Recommended post-deploy smoke matrix

Test `/`, `/read`, `/duel`, `/corner`, the composer, and an Echo thread at 320×568, 360×740, 390×844, 430×932, and 768×1024. At minimum, confirm no horizontal scroll; bottom navigation and publish controls remain reachable; Escape/back closes sheets; vote rollback works offline; browser-local saves appear in Corner; reduced motion is static; and signed-in/guest copy matches actual persistence.
