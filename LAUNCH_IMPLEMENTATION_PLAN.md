# Marketing launch implementation plan

Current implementation status (29 October): core security/UI/reliability fixes and Instagram browser handoff are deployed; Analytics receipt, moderation delivery, hosted isolated throughput and free encrypted backup/recovery are verified. The recovery code was imported into Google Password Manager with owner approval. Remaining acceptance is recorded in `LAUNCH_FINAL_RETEST_2026-10-29.md`: unresolved ordinary-network navigation resets, incomplete account/moderation/device lifecycle coverage, unattended operations and sustainable quota capacity. All work remains on free services; no blanket readiness certification is implied.

Objective: a tested release candidate with evidence for each launch gate. Local completion does not authorize production changes or establish real visitor capacity.

## 1. Protect users and preserve legitimate traffic

- Preserve strict individual quotas and atomic database enforcement; give shared networks separate, higher finite abuse ceilings. Keep failure closed and return accurate remaining/reset information.
- Prevent duplicate profile restoration and surface profile-loading failures. Derive public attribution from authenticated profiles; disable guest named posting and remove misleading editable attribution.
- Keep removed replies out of activity. Preserve anonymous account separation and prevent identity fields in analytics.
- Acceptance: regression tests for multiple visitors on one network, individual/network quota exhaustion, outage rejection, attribution spoofing, and sensitive callback URLs.

## 2. Make scheduled work resilient

- Isolate winner selection, push delivery, moderation delivery, and cleanup failures.
- Bound external alert request duration, make provider/configuration and claim failures visible, and count delivery as successful only after database acknowledgement.
- Acceptance: failure-injection tests prove moderation and cleanup still run after push failure and stale claims are not counted as delivered.
- Production follow-up: inspect the old pending alert, configure an approved provider, confirm a controlled alert is acknowledged, and verify the cron advances. Sending alerts and changing production bindings require authorization.

## 3. Improve privacy and mobile usability

- Load analytics only after explicit consent, exclude callback/query/hash data, disable automatic measurement of potentially sensitive links, and retain navigation page-view tests.
- Keep consent controls clear of navigation, accessible bookmarks, and compact small-screen Duel layout.
- Acceptance: browser regression across 320–1440px, composer validation/repeated taps, errors, saved notes, sharing, and simulated install guidance. Physical-device acceptance remains separate.

## 4. Build repeatable release evidence

- Require every local migration in the production migration-history checker rather than a manually maintained list.
- Add a deliberately isolated load harness with fixed localhost targets; measure representative staged traffic, errors, latency, and resource usage. A fixture-only/local database result cannot certify hosted capacity.
- Remove outdated readiness claims from documentation and publish an operator checklist for OAuth, analytics, Search Console, support/deletion, moderation staffing, backups/restore, capacity and APK provenance/update checks.
- Acceptance: lint, TypeScript, unit tests, isolated SQL tests, production build, public-secret scan, controlled browser regression, install tests, and independent second review.

## 5. Authorized release and final launch decision

After review: obtain explicit authorization for migration, production configuration, push and deployment. Record release identifier and rollback target; apply missing migrations using the normal migration system, configure provider/observability, deploy, and repeat read-only smoke checks on both domains. Exercise mutations with approved test accounts/content, confirm real Google OAuth and physical devices, and establish capacity in representative isolation before promotion.

Target acceptance: zero unresolved critical/high defects; completed required real-account/device checks; no leaked anonymous identity; moderation alert delivery confirmed; agreed burst workload meets measured latency/error/resource budgets; monitoring and rollback drill complete. Google AdSense approval is Google's decision and does not follow from passing this release suite.
