# Marketing release candidate — 29 October 2026

> Subsequent authorization and completed production release are recorded in
> PRODUCTION_RELEASE_2026-10-29.md. The candidate-stage statements below remain
> as historical evidence; consult the production record for current status.

Status: locally implemented and tested; not released or certified for promotion. Read LAUNCH_IMPLEMENTATION_PLAN.md and LAUNCH_ACCEPTANCE.md for the release sequence and required evidence. The original audit is preserved as a baseline rather than rewritten as if production had changed.

## Implemented

- Separate finite shared-network abuse ceilings from individual quotas; return database-derived remaining allowance.
- Deduplicate initial session/profile restoration and surface profile-loading failure.
- Derive named post/Echo attribution from the authenticated account; preserve anonymous posting; disable guest named composition, show read-only account attribution, remove inferred Instagram identity links, and retain full-length account handles.
- Exclude moderated replies from personal activity.
- Isolate scheduled selection, push, moderation and cleanup failures; time out provider calls and count alert delivery only after queue acknowledgement. Log missing providers and count claim exceptions as failures.
- Load GA only with explicit consent, suppress callback page events, remove query/hash/referrer data, disable collection on withdrawal, and allow only named engagement events, enumerated labels and bounded numeric metrics. Callback-to-home script loading has a regression test.
- Keep consent clear of navigation, fix compact Duel overflow, and label mobile bookmarks accessibly.
- Require every local migration in the production checker and fail on failed/overdue pending moderation alerts. Remove obsolete current-readiness statements from docs.

## Verification completed

| Evidence | Result |
|---|---|
| ESLint / TypeScript / diff whitespace | Pass |
| Unit suite | 101 tests / 11 files passed |
| Isolated PostgreSQL migrations, transaction and permission checks | 26 behavior checks passed; 13 local migrations applied |
| Controlled Chrome browser regression | 51 checks passed |
| Responsive pages | Wall, Duel, Corner, About, Privacy, Terms and signed-out moderation at 320, 390, 768 and 1440px; Duel also 360px |
| Browser identity/analytics tests | Initial profile fetched once; no tag before consent, one tag after acceptance, SPA tracking; all backend/Google requests intercepted |
| Simulated installation | 4 test groups passed; not physical installation |
| Production build / configured-server-secret scan | Pass; 40 public assets scanned |
| Runtime npm advisory scan | 0 known vulnerabilities at scan time |
| Independent review | Reviewed new rate/cron/analytics/attribution logic; found regressions were repaired and regression-tested |

The original production smoke checks on both domains passed during the audit. They describe the deployed baseline, not the unreleased candidate.

## Isolated workload evidence

10,000 local posts; each simulated session fetches feed, reads replies and reacts against a shared post. Counter totals matched the reaction ledger in all bursts.

| Queued sessions | SQL operations | Burst elapsed | p95 session | Errors |
|---:|---:|---:|---:|---:|
| 30 | 90 | 513ms | 504ms | 0 |
| 150 | 450 | 604ms | 595ms | 0 |
| 300 | 900 | 1,398ms | 1,379ms | 0 |

These measurements come from local single-engine WASM PostgreSQL, excluding edge execution, network, Supabase services, real authentication and plan limits. They establish isolated workload correctness, not 1k/5k/10k daily visitor capacity. Machine-dependent raw output is in ignored artifacts/isolated-load.json.

## Production blockers verified read-only

The strengthened production audit correctly exits unsuccessfully because migration 20261025010000 is absent from recorded live history. Public access tests still have zero failures. An October 25 moderation alert remains pending. Worker secret-name inspection lists moderator allowlists, Supabase service role and VAPID private key, but no moderation webhook or Telegram credentials. This verifies absence from the secret list; it does not independently inspect every possible plain-text runtime variable.

No production migrations, rows, security policies, settings or versions were changed. No push, commit or deployment was performed.

## Required next steps

Explicit authorization is needed to apply the reviewed missing migration, configure an approved moderation provider, push and deploy the candidate, and send a controlled test alert. Destination and credential setup must be agreed before sending anything. After release, complete real OAuth/mutation persistence, moderation receipt/recovery, physical Android/iOS/PWA/APK, GA property/DebugView, Search Console, support/deletion, monitoring/restore and representative isolated hosted-capacity acceptance.

AdSense prerequisites remain separate from approval. The release must not be promoted until required production acceptance passes and the supported traffic level is measured.
