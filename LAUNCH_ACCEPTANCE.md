# Release acceptance and operator handoff

The authorized fixes have been deployed. Current acceptance evidence and remaining gaps are recorded in `LAUNCH_FINAL_RETEST_2026-10-29.md`; the checklist below retains the full acceptance scope. Passing staging throughput does not establish monthly quota headroom or disaster recovery.

## Local verification

Run `npm run check:release`, `npm run test:load:isolated`, then start Vite on localhost:4175 and run `npm run test:browser`. Run `TEST_BASE_URL=http://127.0.0.1:4175 npm run test:install` using your shell's environment-variable syntax. Browser fixtures intercept mutations and analytics. They do not validate live account/Google/notification delivery. The isolated workload harness never loads credentials or makes network requests; its timings describe local single-engine WASM SQL, not Cloudflare/Supabase capacity.

Network quotas retain per-device limits; aggregate network ceilings are 300 posts/hour, 3,000 reactions/hour, 1,000 Echoes/30 minutes, 500 reports/day, 1,000 vote attempts/hour, 600 account requests/15 minutes and 300 subscription attempts/hour. They are provisional finite abuse guards, not evidence of supported capacity. Adjust only after staging traffic measurements. No shared public feed cache was introduced: moderation removals should become visible without a stale edge copy.

## Production release authorization required

1. Review the diff and select a known-good deployed rollback version. Record the account/zone, deployment ID, Git commit, and expected migration list. The audit baseline is a44816e7d37dbc8e8f38662625a92933d207fa0c; Git parity does not establish deployed build parity.
2. Apply missing local migrations through Supabase's normal migration tooling. Do not mark migration history as applied without verifying the actual SQL. The audit found 20261025010000 missing. Never run a database seed/import as a health check.
3. Configure an approved moderation destination and recipient. Send one explicitly authorized test alert; verify its queue row reaches delivered, a moderator receives it, and failed delivery retries/escalates. Investigate the October 25 pending item; do not delete it to make the checker pass. Staff the moderation dashboard during promotion.
4. Configure monitored Cloudflare/Supabase error, resource and queue-age alerts, confirm provider plan/limits/current usage, backup retention and an isolated restore drill. Verify the minute cron runs and independent tasks recover after a failure. The production checker now rejects incomplete migration history and failed/overdue pending moderation alerts.
5. Deploy the reviewed release using the normal workflow, without rewriting published Git history. Record the exact version and repeat `npm run check:production` and `npm run test:live` against both domains. Publish/push/deploy changes only after explicit authorization.

## Human/account/device acceptance

- Google login, declined login, callback, account linking, reload, logout, second account on a shared browser, and fresh private session; no previous account activity or anonymous author identity visible.
- Authorized test content: anonymous and named post, reload, reaction/Relate, Echo, single vote and repeat vote, report, moderator removal, shared older post, save/unsave and browser-storage loss. Named attribution must match the BajiHears account; no Instagram identity ownership is implied. Confirm removed Echoes disappear from recipients' activity.
- Android Chrome and iOS Safari on real devices: install, launch, push opt-in where supported, installed-app upgrade, offline/error recovery, 200% text, long content, and every dialog above the keyboard. Separately verify APK source, signing, permissions, release provenance, installation and manual update path.
- GA G-YK9LL21171: no tag request before consent; acceptance loads once, SPA navigation records once, refusal/withdrawal disables collection, callback credentials absent. Check live DebugView and cookies. Disable GA enhanced automatic history/form/outbound-link measurement in the property; explicit sanitized page tracking is provided by the app, and automatic link/form measurement could include user content. Confirm this external property setting rather than assuming code can enforce it.
- Search Console ownership, submitted sitemap and actual indexing; ads.txt publisher ownership. Confirm support/privacy mailboxes deliver and complete a test deletion request. Review all editorial/community content and moderation coverage before enabling ads. Google alone determines AdSense approval.

## Representative traffic test

Use an isolated Cloudflare/Supabase project with equivalent plan/settings/indexes, representative content volume and test accounts. Confirm no production URLs/keys/queues are reachable. Model three-minute sessions with 10% of daily visitors arriving over ten minutes: approximately 30/150/300 concurrent sessions for 1k/5k/10k daily visitors. Measure actual API counts rather than assuming ten per visitor.

Proposed acceptance budgets: mutation/feed p95 under 2 seconds, p99 under 5 seconds, under 1% unexpected failures, no lost/duplicate votes/reactions/posts, no privacy violations, queue delivery within 5 minutes, and at least 30% resource/quota headroom at the agreed target. Test sustained bursts, dependency failure and recovery. Do not apply these loads to production. A passing local SQL run cannot close this gate.

Launch only after required acceptance items have evidence, high-severity defects are closed in the deployed version, and the approved workload passes on representative resources.
