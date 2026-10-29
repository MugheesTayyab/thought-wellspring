# Authorized production release — 29 October 2026

> Current status supersedes the historical release notes below. Application `a016376` is deployed as Worker `b44f81bf-6a46-45b1-a31d-b7538ca0318a`. Real moderation email delivery, user-completed Google login, user-reported phone installation, hosted staging throughput and actual GA property receipt have since passed. Approved free encrypted backup run 40826434462 and portable recovery of its downloaded artifact passed (43 tables, 16 policies). Recovery-code import into Google Password Manager succeeded. No paid plan was enabled. Final lint, TypeScript, 109 unit tests, production build/target/secret guards and read-only production schema/queue checks passed. Instagram embedded-browser handoff passed a 320px simulated test on the deployed version. Ordinary browser connection resets remain unresolved; see `LAUNCH_FINAL_RETEST_2026-10-29.md` for current counts and the strict NO launch decision. The text below records earlier observations and is not the current blocker list.

User authorized proceeding with the reviewed migration, push and deployment while minimizing further involvement. This supersedes the earlier local-only restriction for those release actions.

Rollback target recorded before release: Cloudflare Worker bajihears version e30eca93-6fca-42f9-a3a6-89580776f4ac (previous production deployment).

Migration 20261025010000_echo_permissions_hardening was applied transactionally. Function execution privileges were verified before recording history: service_role allowed, anon/authenticated denied. No posts, replies or user accounts were changed by this migration.

Pre-release gate passed: lint, TypeScript, 101 unit tests, 26 isolated PostgreSQL checks, production build and configured-secret scan. Previous controlled browser run passed 51 checks; simulated install suite passed four groups. Independent source review and isolated SQL burst results are recorded in RELEASE_CANDIDATE_2026-10-29.md.

No approved Telegram/webhook destination or credentials exist in local configuration or the Worker's secret list. Pending moderation alerts must remain queued rather than being marked delivered. Provider setup and real receipt verification remain an operational blocker, alongside the real-account/device and hosted-capacity acceptance items in LAUNCH_ACCEPTANCE.md. No new service account or recipient has been invented.

Deployment/version and post-release results are recorded after the release below.

## Deployment completed

- Application source commit pushed to main: 6ed110e46810ee89c57d569f91537fe761743766.
- Cloudflare production version: e7544698-a34f-4630-8374-065515669641.
- Worker upload and minute cron trigger deployment succeeded; measured Worker startup reported by deployment was 14ms (not a user-latency or capacity benchmark).
- Both bajihears.app and bajihears.mugheestayyab4.workers.dev passed post-deployment rendered smoke tests: Wall, Duel, Corner, 30 labeled Originals, signed-out moderation gate, redirect, disabled diagnostics, assets/service worker and no captured page/5xx errors in those visits.
- Post-migration production checks passed migration parity, required schema/RPCs and private-table privileges. The overall production gate correctly remains unsuccessful because the October 25 pending moderation alert is overdue.
- Deployed fixture-isolated browser tests verified 320px, 360px and 390px Duel layouts before/after votes. The wider deployed run repeatedly encountered ERR_CONNECTION_RESET during document navigation; it did not complete. Waiting for document readiness instead of all external resources reduced unnecessary waiting but did not eliminate resets. The earlier full local run passed 51 checks; do not substitute it for a completed deployed regression.

No public posts, votes, replies, accounts or reports were created by the smoke/regression tests. Mutation and identity requests in the regression were intercepted fixtures. No alert was sent to an invented recipient, and pending alerts were not deleted or marked delivered.

Current decision: do not start the marketing campaign yet. Remaining gates include an approved alert provider/recipient with real receipt, investigation of repeat-navigation resets, real OAuth/device acceptance and representative hosted-capacity evidence. The reviewed application fixes and missing migration are now in production; these remaining gaps are not hidden by a successful deployment.
