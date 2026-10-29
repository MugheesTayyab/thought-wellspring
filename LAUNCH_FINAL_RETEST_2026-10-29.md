# BajiHears final retest — 29 October 2026

## What is verified

- Real Google login completed by the user; the Corner showed Google connected and the same account after reload. Full logout/second-account/deletion lifecycle remains a separate acceptance item.
- User reported that the phone website opens and installs successfully. Platform was not specified; this is not independent proof of both Android and iOS, push delivery or installed-app upgrades.
- Approved native moderation email configured using an existing verified, allowlisted recipient. The overdue notification was processed by the real minute cron and reached delivered. An authorized provider test reported delivered=1, queued=0, permanent_bounces=0. SMTP delivery does not certify inbox placement or moderator response time.
- Live offline recovery passed: only a generic reconnect page is cached, with no private feeds/accounts. Redirected cached responses are reconstructed before navigation fallback.
- Earlier production candidate 9904550 completed browser regressions in Chrome, Firefox and WebKit: 51 checks each. The later final-release rerun again failed: Chrome document connection resets, Firefox navigation aborted and WebKit delayed access-control errors. These failures are retained; earlier passes do not clear the current reliability gate. Fixtures block live writes and service workers; real offline behavior has its own suite.
- Isolated real hosted staging on the same Supabase Free/Nano/Singapore resource class, with all 13 migrations, 10,030 synthetic posts and seeded replies. Separate Worker/backend credentials, no email binding or cron, and fixed target guards. No production load test was run.
- A real staging voting failure exposed overly strict UUID validation for the six seeded Duel IDs. `z.guid()` preserves those identifiers and rejects malformed input. Two regression tests cover acceptance and rejection before DB access. Real staged votes persist and repeat votes are rejected.
- Public GitHub release metadata returned zero releases. Removed the misleading APK download offering; the supported install path is the home screen web app. No APK is certified or supplied.

## Hosted throughput evidence

Model: three-minute visits, 10% of daily visitors arriving over ten minutes. The load harness accelerates the corresponding arrival rate sixfold. These are anonymous API sessions, not simultaneous in-flight requests or full browser journeys.

| Modeled daily visitors | Test sessions / arrival window | API requests | Failed | p95 / p99 | Sampled max DB connections |
|---:|---:|---:|---:|---:|---:|
| 1,000 | 30 / 30 seconds | 142 | 0 | 625 / 781ms | 10 / 60 |
| 5,000 | 150 / 30 seconds | 710 | 0 | 618 / 779ms | 12 / 60 |
| 10,000 | 300 / 30 seconds | 1,420 | 0 | 580 / 662ms | 14 / 60 |
| 10,000 sustained model | 3,000 / 5 minutes | 14,050 | 0 | 578 / 662ms | 18 / 60 |

Every session completed; reaction totals matched their ledger after the run. Budgets: p95<2s, p99<5s, <1% unexpected failures, all sessions completed, sampled connections<=42/60. The sustained run measured 10 session arrivals/sec and approximately 47 API requests/sec. It excludes OAuth/profile/reward traffic, HTML/assets/rendering, analytics, scheduled jobs and email delivery. Sampling connections once per second can miss brief peaks. Single-region, five-minute evidence does not certify long-running daily or monthly capacity.

Raw local evidence: `artifacts/hosted-load-results.json`, `artifacts/hosted-soak-results.json`, browser screenshots, `artifacts/staging-project-overview.png`. These contain synthetic workload results and are ignored by Git. Reproduce using `npm run deploy:staging`, `npm run test:load:hosted` and `npm run test:load:soak` after approved staging setup. Do not aim these workloads at production.

## Important remaining limits

1. **HIGH — production recovery:** the live Supabase dashboard explicitly says the Free plan does not include project backups; production shows no backups. No verified independent production backup/restore procedure exists. A paid upgrade has not been purchased. Evidence: `artifacts/production-backup-status.png`. Configure recoverable backups and prove an isolated restore before treating user content as protected against loss.
2. **Capacity quota:** the actual Free organization includes 5GB uncached egress per billing period, 500MB database allowance and 50,000 monthly active users. The dashboard showed 0.03GB egress, 51MB database and 2 MAU, with delayed metering; staging shares organization quotas. Throughput is measured, sustainable quota capacity is not. Worker billing/subscription API access returns403; account settings report standard usage model, which alone does not establish the subscription limit. No plan or billing setting was changed.
3. **Analytics:** the user switched to the owning account, giving access to property 560675200 / stream 16198978114 / G-YK9LL21171. It reported no data and enhanced measurement enabled. Enhanced measurement was disabled and the saved off state verified by reopening the stream. The code queued plain arrays rather than Google's documented Arguments command protocol; the corrected client uses `push(arguments)`. The former live collection test timed out. The corrected local client received real Google204 acknowledgments, emitted one SPA view and stopped collection after withdrawal in both open tabs. Actual production collection and property receipt must still be verified after deployment. Existing cookies are not claimed to be deleted by withdrawal.
4. **HIGH — browser transport:** Chrome's network log shows TCP connects followed by an encrypted ClientHello and a reset during the TLS handshake (`-101`, Windows10054), before HTTP/application processing. Both published IPv4 addresses worked in isolated address-pinned diagnostics with certificate validation intact. ECH/network compatibility is being investigated; no production DNS, TLS or Cloudflare security setting was changed. This is not yet a confirmed application defect or a resolved reliability issue.
5. **Full acceptance scope:** both physical OSes, push/installed upgrades, full real-account lifecycle, support/privacy mailbox delivery and deletion, monitored outage/quota alerts and restore drills remain incomplete. Search Console ownership/indexing and AdSense publisher/content approval remain unverified. No ad-serving integration was introduced. Google alone decides AdSense approval.

## Accounting against the original 30 broad audit groups

This preserves the original group boundaries; a partially tested group stays unverified even when individual journeys now pass. **20 passed, 2 failed, 8 unverified.** Individual assertions and request counts must not be added to these groups.

Passed (20): lint; TypeScript; unit suite; isolated database suite; production public-access permissions; production required schema/RPC availability; published Originals count/order; custom-domain rendered smoke; workers.dev rendered smoke; production build; configured-secret scan; GitHub/source parity; controlled install behavior; five-width Duel fit; static SEO asset presence; legal/contact-page source presence; shared-network fairness repair; moderation notification processing; repaired source deployed; migration-history parity.

Failed (2): final browser regression/reliability gate; complete operational recovery/monitoring/support/deletion group — no production backup/verified restore is a demonstrated recovery gap; its other items are not all verified.

Unverified (8): complete real account lifecycle; all backend mutation journeys including authenticated/report/moderation paths; complete physical-device/private-browser/install/update matrix; exhaustive visual/accessibility/state inspection; sustainable target daily capacity including quota headroom; actual GA receipt and external privacy settings; Search Console indexing; AdSense account/content/policy readiness.

The observed attribution, removed-Echo visibility, shared-network quota, stale moderation notification, seeded-Duel validation, offline navigation and compact-layout defects have been repaired. No critical anonymous-identity disclosure was demonstrated. This bounded audit is not a certification of every possible vulnerability.
