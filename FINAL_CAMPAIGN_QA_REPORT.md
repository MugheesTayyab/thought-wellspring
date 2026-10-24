# BajiHears Final Campaign QA Report

**Date:** 2026-10-24 (Asia/Karachi)  
**Verdict:** **NOT READY**  
**Production URL:** `https://bajihears.app`  
**Repository HEAD:** `e31eadb41a404aaf90df111098dbcd0f8201be02`  
**Cloudflare production version:** `85059a31-93b4-48e6-955d-c668f99ba29f`, deployed 2026-10-24 14:02:41Z  
**Deployed commit:** inferred as `e31eadb` from matching deployment/commit time and live moderation release. The Worker has no embedded Git SHA, so this mapping is not cryptographically provable.

No commit, push, migration, seed import, production mutation, or deployment was performed. Existing content and the HTTP/3-off state were preserved. Production responses had no `Alt-Svc` header; browser automation also launched with QUIC disabled.

## Release-state gate

| Area | Status | Evidence |
|---|---|---|
| Moderation release | PASS | Production migration `20261024000000` is recorded; moderation tables/views exist; deployed Worker has moderator allowlist secrets; local authorization/retry/concurrency suites pass. |
| 30 Manus originals | FAIL | Production lacks migration `20261025000000` and `get_editorial_originals()`; live HTML has no Originals markers. Local CSV is exactly 30 ordered records and isolated import is idempotent with zero seeded reactions. |
| Mascot/PWA release | FAIL | Live `/brand.svg` still contains the old `bh` text; live `favicon-16x16.png` and `icon-192.png` return 404; live manifest only lists legacy icons. Correct assets exist and validate locally. |
| Local/staging/production distinction | PASS | Production is Cloudflare version above. The dirty local candidate contains editorial, brand, and QA fixes. No separately identifiable staging deployment exists. |
| Backup/restore gate | BLOCKED | No Supabase backup snapshot or completed restore drill was accessible. Production migration/import must not proceed until the owner records a recoverable backup and rollback checkpoint. |

## Acceptance matrix

| Scope | Status | What was actually verified |
|---|---|---|
| `/` first impression | PASS local / PASS limited production | Hero, Wall/Originals distinction, write CTA, footer, no horizontal overflow in controlled Chrome. Production live route loads without page errors/5xx. |
| Wall filters/sort/pagination | PASS code/tests / BLOCKED full live | Five category controls, sort and pagination paths inspected and exercised with fixtures; production mutation and growth-data pagination were not exercised. |
| Featured/deep links/back-forward | PASS | Controlled browser checks cover winner layout, `/read` redirect, shared post outside page one, navigation and refresh-safe paths. |
| Exactly 30 originals | PASS local / FAIL production | CSV validator, unit suite, PGlite import, and browser assert 30 ordered cards with `BajiHears Original · Fictional Story`; production schema/content is absent. |
| Cards/detail/share/save | PASS local | Editorial provenance is preserved on card, Echo sheet, quote/share, clipboard and saved Corner surfaces; browser save/deep-link flows pass. Native OS share sheet was not automatable. |
| Composer input | PASS local | Empty disabled; Unicode accepted; 280 accepted; 281 rejected; ordinary post acknowledgement passes. |
| Duplicate taps/cooldown | PASS after fix | Reproduced two requests from same-turn taps; synchronous in-flight guard now produces one request. Browser verifies visible 12-hour cooldown; DB verifies cooldown across linked browser tokens. |
| Reactions/Echoes/reports | PASS local | Reaction rollback, Echo acknowledgement, post/Echo report validation, duplicate/self report, quarantine thresholds, and hidden/rejected reads covered by unit/DB/browser suites. No production visitor data was mutated. |
| Duel/Corner/streaks/push UI | PASS local / BLOCKED native delivery | Duel at 320/360/390/768/1440, vote rollback/idempotency, saved Corner and local identity paths pass. Native push permission/delivery on iOS/Android was not available. |
| Google auth | PASS handoff / BLOCKED account lifecycle | Production reaches `accounts.google.com`; denied-login recovery passes locally. Real account redirect, persistence/expiry, logout, multi-tab, and moderator identity require owner-controlled test accounts. |
| `/admin/moderation` | PASS unit / BLOCKED live roles | Signed-out route renders restricted UI; unit tests prove 401 unauthenticated, 403 non-allowlisted, allowlisted authorization, no token leakage and action-state rules. Live moderator/non-moderator accounts were unavailable. |
| Telegram/webhook alerts | FAIL production config / PASS local fix | Cloudflare version has neither Telegram nor moderation webhook secrets. Found and fixed a bug that marked undelivered alerts delivered when no provider existed; new regression leaves rows pending. Production queue currently has zero rows. |
| PWA/icons/manifest/OG | PASS local / FAIL production | Local 16/32/180/192/512/maskable assets validate. OG generator corrected from an incorrectly declared 2400x1260 output to actual 1200x630. Production still serves old `bh` branding. |
| Privacy/Terms/About/contact | PASS static/live route | Routes load; support/privacy `mailto:` links are syntactically valid. Mailbox delivery was not tested. |
| SEO/robots/sitemap/canonical | PASS local / FAIL production canonical | Robots, sitemap and noindex for auth/admin pass. Fixed duplicate root canonical; local public routes now have one route-specific canonical and OG URL. Production still emits duplicate canonicals on legal routes and root canonicals on Duel/Corner. |
| HTTPS/security headers | PASS | HSTS preload, nonce CSP, frame denial, nosniff, restrictive permissions and referrer policy observed live. Public table/RPC privacy audit passes. |
| 404/500 | PASS 404 / BLOCKED production 500 | `/diagnostics` returns 404 and local error boundary is tested. A production 500 was not intentionally induced. |
| Chrome desktop/mobile/tablet | PASS controlled | Chrome headless at 320x568, 360x740, 390x844, 768x1024 and 1440x900; 21 checks, no controlled page errors. |
| Safari/iOS/Android/Instagram IAB | BLOCKED | No real devices or those browser engines were available. |
| Slow mobile/performance | FAIL measured | Production Lighthouse: performance 52, FCP 2.7s, LCP 5.4s, CLS 0.332, TBT 310ms. Final local candidate: performance 54, FCP 3.5s, LCP 4.7s, CLS 0.02, TBT 790ms; accessibility/best-practices/SEO 100. CLS is fixed, but LCP remains poor under simulation. |
| 1-minute cron/winner | PASS evidence / BLOCKED continuous observation | Wrangler config has `* * * * *`; production latest winner cycle ended 12:00Z and was processed at 12:00:58Z (`skipped_empty`). A 59-second tail captured no events, so continuous delivery/alerting is unproven. |
| Lease/retry/concurrency | PASS isolated | Disjoint concurrent claims, expired leases, stale-token rejection, retry scheduling and delivered immunity pass in isolated PostgreSQL. |
| 12h/24h/7d simulation | PASS isolated | 12h submission/account cooldown; 12h winner bounds; 24h report limit; 7d delivered/failed push cleanup are covered by DB/unit SQL behavior. |
| 30d/session expiry/restore | BLOCKED | No 30-day cleanup policy, JWT expiry clock simulation, Supabase restore drill, or production backup evidence was available. |
| Campaign traffic | BLOCKED | No production load test was run. Bundle is 622 KiB gzip Worker upload; modest browser/Lighthouse probes only. |

## Defects found and fixed locally

| Severity | Reproduction | Root fix and regression |
|---|---|---|
| HIGH | `npm audit --omit=dev` reported Zod memory exhaustion advisory. | Upgraded direct Zod dependency from 3.25.76 to patched 4.6.7; audit now reports zero production vulnerabilities; full suite passes. |
| HIGH | Two programmatic taps in one event turn called `apiSubmitPost` twice. | Added synchronous `submitInFlightRef`; browser regression asserts one request and then the 12-hour lock. |
| HIGH | With no Telegram/webhook config, cron claimed an alert and completed it as delivered. | Drain exits before claiming when no provider exists; regression asserts no queue RPC and pending retention. |
| MEDIUM | Production Lighthouse CLS 0.332; async winner/feed insertion moved the first card. | Added stable skeleton/reserved feed geometry; candidate CLS measures 0.02. |
| MEDIUM | Root canonical caused duplicates on legal pages and incorrect canonical on Duel/Corner. | Removed root canonical, added per-route canonical/OG URLs, and added static regression checks. |
| MEDIUM | OG metadata declared 1200x630 while generated file was 2400x1260. | Generator uses DPR 1; PNG IHDR regression verifies 1200x630. |
| MEDIUM | Lighthouse found invalid `aria-controls`, no main landmark, label/name mismatch and weak footer contrast. | Removed dangling ARIA reference, added `<main>`, matched reaction accessible names and raised footer contrast; candidate accessibility is 100. |

## Commands and results

- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm test -- --reporter=dot` — PASS, 9 files / 87 tests.
- `npm run test:database` — PASS, 12 migrations / 26 isolated PostgreSQL checks.
- `npm run test:browser` against final Wrangler candidate — PASS, 21 checks.
- `TEST_BASE_URL=https://bajihears.app npm run test:live` — PASS routes/assets/no page errors/no HTTP 5xx; OAuth handoff separately reached Google.
- `npm run build` — PASS.
- `node scripts/check-client-secrets.mjs` — PASS, 40 public assets scanned.
- `npm audit --omit=dev --audit-level=high` — PASS, 0 vulnerabilities.
- `npx wrangler deploy --dry-run` — PASS, 2.77 MiB raw / 622.21 KiB gzip upload; no deployment.
- `node scripts/validate-editorial-csv.mjs` and `node scripts/editorial-seed-manager.mjs --dry-run` — PASS, 30 exact rows, zero fabricated identity/engagement, transaction rolled back.
- `npm run check:production` initially passed moderation/RLS checks. The strengthened state check now correctly FAILS because production lacks migration `20261025000000` and `get_editorial_originals()`.
- Lighthouse artifacts: `artifacts/lighthouse-production-mobile.json` and `artifacts/lighthouse-candidate-final.json`.

## Known blockers and residual risk

Production does not contain the editorial schema/posts or approved mascot assets, the fixed candidate has not been committed/deployed, no recoverable Supabase backup/restore drill is evidenced, live role-based moderation and full signed-in auth are untested, no external moderation alert provider is configured, simulated mobile LCP remains 4.7s, and real iOS/Android/Instagram coverage is unavailable. These prevent a campaign-ready declaration.
