# BajiHears pre-launch audit — 29 October 2026

Historical baseline below. Subsequent authorized fixes, deployments, real Google login, user-confirmed phone installation, and hosted staging tests are recorded in `LAUNCH_FINAL_RETEST_2026-10-29.md` and `PRODUCTION_RELEASE_2026-10-29.md`. Do not use the original counts below as current status.

Scope: local source, isolated PostgreSQL tests, controlled Chrome UI fixtures, read-only production browser smoke checks on both domains, read-only Supabase schema/permission/aggregate inspection, and an independent agent's security review followed by a review of the fixes. No production rows, DNS, Cloudflare settings, database policies, deployment versions, Git commits, or remote branches were changed. Build output and local source changes are not deployed.

## Checklist accounting

30 grouped launch checks: **17 passed, 4 failed, 9 unverified**. These groups are not individual assertions; the separate automated totals below should not be added to this checklist.

Passed groups: lint; TypeScript; unit suite; isolated database suite; production public-access permissions; production required schema/RPC availability; published Originals count/order; custom-domain rendered smoke; workers.dev rendered smoke; production build; configured-secret scan; GitHub/starting-checkout commit parity; controlled install behavior; five-width Duel fit; static SEO asset presence; legal/contact-page source presence; controlled browser journey regression.

Failed gates: shared-network fairness under rate limiting; timely processing of the observed moderation notification; required source repairs available in production (local fixes deliberately unreleased); complete migration-history parity (final local migration absent from live history). Failure of migration parity does not by itself prove an exploitable permission gap.

Unverified groups: complete real Google authentication/account lifecycle; real backend mutation journeys and persistence; physical devices/other browser engines/private-mode matrix and installation/APK updates; exhaustive all-page responsive/accessibility/state inspection; representative capacity at all three target traffic levels; actual GA event receipt and consent/network privacy; Search Console indexing; AdSense account/content/policy readiness; operational monitoring/alert delivery/restore/support/deletion effectiveness.

## Evidence

- Lint and TypeScript checks passed. Vitest: 94 tests across 10 files passed after attribution fixes; 26 isolated PostgreSQL behavior/security tests passed against all 13 local migrations.
- Production build passed and 40 generated public assets passed the configured server-secret scanner. This scanner is not proof of absence of every possible secret.
- Both https://bajihears.app and https://bajihears.mugheestayyab4.workers.dev passed the read-only rendered smoke suite: Wall, Duel, Corner, exactly 30 fictional Originals, signed-out moderation gate, /read redirect, disabled diagnostics, manifest/icons/service worker, and absence of captured page errors or HTTP 5xx errors during those visits.
- Production Supabase audit: zero failed checks. Public private-table reads denied, privileged mutation RPCs absent from public API, required server tables available. Google provider enabled; that does not establish successful login/callback/account linking.
- Production has 30 published editorial posts, ordered 1–30. Source CSV specification tests pass; full human originality/provenance and policy review are not established by row counts.
- Live migration history ends at 20261025000000. Local 20261025010000_echo_permissions_hardening.sql is absent from that history. Anonymous Echo-table access was denied in the live audit, but complete deployed-migration equivalence remains unproven.
- Remote main and starting local HEAD match a44816e7d37dbc8e8f38662625a92933d207fa0c. No deployment build identifier was obtained, so GitHub-to-production code equivalence remains unverified.
- Controlled Duel fixtures fit 320x568, 360x740, 390x844, 768x1024, and 1440x900 after local layout repair. Chrome screenshots are in artifacts/browser/. These are fixtures, not physical Android/iOS tests or a complete all-page visual audit.
- Four controlled install groups passed: delayed native invitation, dismissal cooldown, simulated iPhone instructions/keyboard dismissal, standalone suppression. Browser events/user agents were simulated; real installation, APK integrity, and update behavior remain unverified.
- Final controlled browser regression passed all 21 checks, including vote rollback, reactions, Echo replies, saved notes, shared links, 30 Originals, Unicode/length validation, repeated-tap prevention, declined-auth recovery, and backend-outage display. All writes in this suite were intercepted fixtures. Final lint, TypeScript, unit suite, build, and secret scan passed after the local repairs.

## Defects and local repairs

1. HIGH, unresolved: rate-limit.ts applies the same action quota to each device and shared IP. Visitors behind a carrier/Wi-Fi network collectively hit 3 post attempts/hour, 10 reactions/hour, 5 reports/day, and 20 auth/profile requests per 15 minutes. This can block legitimate campaign traffic. Changing quota policy was deliberately left for explicit authorization. Profile restoration can also request a profile twice and silently ignore a failed result.
2. HIGH, fixed locally only: posts/Echoes accepted arbitrary client handles without checking ownership; cards could link spoofed guest attribution to another user's public profile. Attribution now comes from the verified account's profile, with guests allowed anonymous submissions. Two regression tests cover guest spoofing and authenticated attribution. Sign-in guidance uses a validation error and composer wording explains the requirement. This authenticates a BajiHears account handle, not an external Instagram identity.
3. HIGH, fixed locally only: personal activity fetched replies without a published-status filter, allowing removed Echoes to remain visible to recipients. The query now filters published replies.
4. HIGH operational concern, unresolved: production moderation_notifications contains one pending item dating from 2026-10-25T07:03:06Z. Delivery/escalation requires investigation; the aggregate alone does not prove all moderation is broken. No queue item was changed.
5. MEDIUM, fixed locally only: consent banner covered bottom navigation and intercepted Corner clicks. Screenshot and Playwright click failure confirmed this. It now sits above navigation with bounded scrolling.
6. LOW, fixed locally only: answered Duel overflowed the 320x568 viewport by 7px. Compact footer spacing fixes the measured overflow. Normal scrolling remains available for enlarged text.
7. LOW accessibility, fixed locally only: mobile bookmark button hid its visible text and lacked an explicit accessible label. Added its label. Corrected an ambiguous Echo test selector to target rendered reply text rather than matching the composer textarea too.

No critical identity disclosure was demonstrated. That is not a complete production privacy certification. Production still runs without these local fixes.

## Capacity

No visitor capacity is verified. There was no isolated deployment with representative production resources/seed volume and no account plan, current quota usage, CPU, latency, database connection, query-plan, or incident telemetry. Do not interpret isolated SQL correctness tests as load tests. No aggressive production load test was run.

Illustrative workload only: assume 10 dynamic requests/visitor, three-minute sessions, and 10% of daily visitors arriving in ten minutes:

| Daily visitors | Dynamic requests/day | Concurrent sessions during burst | Certified capacity |
|---:|---:|---:|---|
| 1,000 | 10,000 | 30 | Unverified |
| 5,000 | 50,000 | 150 | Unverified |
| 10,000 | 100,000 | 300 | Unverified |

These are demand estimates, not supported-visitor estimates. Daily averages conceal Instagram bursts. Feed reads issue posts and Echo queries; additional Originals/winner/Duel/profile requests add load. HTML/JSON responses use no-store, so browser caches do not provide shared feed caching. Current vendor limits could not be independently retrieved during this audit; no unverified plan limits are assumed.

## Analytics, policy, and operations

Source contains GA G-YK9LL21171, SPA page-view deduplication, consent defaults denying analytics/ad storage, a consent banner, sitemap.xml, robots.txt, ads.txt, Privacy, Terms, About, and support/privacy mail links. Unit checks pass, but live GA receipt/DebugView, consent network behavior, publisher ownership, Search Console indexing, support-mail delivery, and actual deletion handling are unverified. page_location currently uses the complete URL; sensitive query/fragment values should be assessed, particularly on auth callbacks. A parameter denylist is not a general guarantee against personal data in analytics.

AdSense technical prerequisites are partially present. Approval and policy readiness are not established: community content, moderation response, editorial provenance, actual ad integration, and publisher account status require verification. Only Google decides approval.

Remaining required evidence: complete Google login/logout/account linking with persistence; authorized staging journeys for posts/reactions/Relate/Echo/votes/reports/moderation; all-page layouts at all target widths and enlarged fonts with long/empty/loading/error content; Firefox/Safari and real Android/iOS/private mode; genuine PWA/APK install/update behavior; monitoring/alert delivery, backup restore and outage recovery; representative isolated burst testing at the three target traffic levels. Production mutation journeys were not exercised because production writes were explicitly forbidden.

Launch cannot be certified while high-priority issues remain in production and critical journeys/capacity lack evidence.
