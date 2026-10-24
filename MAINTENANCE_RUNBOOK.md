# BajiHears Maintenance Runbook & Operations Guide

**System Name:** BajiHears (`https://bajihears.app`)  
**Repository:** `MugheesTayyab/thought-wellspring` (Branch: `main`)  
**Deployment Infrastructure:** Cloudflare Workers (SSR via Nitro), Supabase PostgreSQL (`qsloqqvdunfuyqqdmgil`), Cloudflare CDN/DNS  
**Operational Status:** **LAUNCH READY · PRODUCTION RELEASE PROCEDURES DOCUMENTED**  
**Document Revision:** 2.0 (Post-Phase A Editorial & Phase B Brand Integration)

---

## 1. System Topology & Release Identifiers

### 1.1 Architecture & Component Stack
- **Edge Runtime:** Cloudflare Workers running Nitro SSR bundle (`.output/server/index.mjs`) with static asset binding to `.output/public`.
- **Database:** Supabase PostgreSQL 15+ in compliant cloud region with Row-Level Security (RLS), partial indexes, and atomic RPC functions.
- **Scheduled Triggers:** 1-minute Cloudflare cron (`* * * * *`) executing `runScheduledTasks` (driving the 12-hour Duel winner cycle, push notifications, and moderation alert delivery).
- **Authentication:** Zero-login anonymous client identity via cryptographically random 16-hex browser tokens (`useDeviceToken`), with optional Google OAuth account linking for cross-device state preservation.
- **CDN & Edge Security:** Cloudflare zone with HSTS Preload (`max-age=63072000`), Content Security Policy (CSP with nonces), Frame-Options DENY, and immutable asset caching for `/assets/*`.

### 1.2 Baseline Version & Release Ledger
Every production deployment must be logged in this ledger prior to traffic cutover:

| Release Parameter | Baseline Production (Active) | Target Launch Candidate (Ready) | Rollback Checkpoint |
| :--- | :--- | :--- | :--- |
| **Cloudflare Version ID** | `85059a31-93b4-48e6-955d-c668f99ba29f` | *Generated upon `wrangler deploy`* | `85059a31-93b4-48e6-955d-c668f99ba29f` |
| **Git Commit SHA** | `e31eadb41a404aaf90df111098dbcd0f8201be02` | `HEAD` (Includes Phase A, B & QA fixes) | `e31eadb41a404aaf90df111098dbcd0f8201be02` |
| **Database Migrations** | `20260924000000` .. `20261024000000` | `20260924000000` .. `20261025000000` | Rollback migration `20261025000000` |
| **Editorial Collection** | Not deployed (0 rows) | Exactly 30 Manus Originals (`BH-001`..`BH-030`) | Delete only `source_type = 'editorial'` |
| **Editorial CSV SHA-256** | N/A | `2aa7d7df8c209a246a52e03db1153befbbcdc78e0e7ce089ac14f1c92070e58f` | Verify before any production import |
| **Brand Identity** | Legacy `"bh"` typographic mark | Cheerful Avatar Badge, Wave Favicons, PWA | Revert `Logo.tsx` and `brand.svg` |

### 1.3 Strict Operational Invariants
1. **Lovable Git Constraint:** Never force-push, rebase, amend, or squash commits on the connected `main` branch. All git updates must be forward-only commits.
2. **HTTP/3 Setting:** Keep HTTP/3 disabled in the Cloudflare zone settings unless explicitly authorized and verified in a separate network test.
3. **Data Provenance:** Editorial posts must strictly have `source_type = 'editorial'`, `device_token = NULL`, `handle = NULL`, and `profile_id = NULL`. Never forge synthetic user IDs or fake engagement.
4. **Community Isolation:** The public community Wall feed must default to `source_type = 'community'`. Existing user confessions (~161 rows) must never be altered or mixed with fiction without explicit user filtering.

---

## 2. Ownership, On-Call Roster & Access Control

### 2.1 Operational Roles & Responsibilities

| Role | Primary Name & Contact | Backup Name & Contact | Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Owner & Lead Operator** | Mughees Tayyab (`mugheestayyab02@gmail.com`) | Secondary Admin (`admin@bajihears.com`) | Cloudflare deployment, Supabase migrations, DNS renewal, release approvals. |
| **Secondary On-Call Engineer** | Appointed Technical On-Call | Emergency Escalation Contact | Production incident triage, Worker rollback, database restore execution. |
| **Trust & Safety / Moderator** | Moderation Lead | Backup Moderator Account | Admin dashboard triage (`/admin/moderation`), Telegram alert monitoring, queue audit. |
| **Domain & DNS Officer** | Domain Administrator | System Owner | Cloudflare DNS, DNSSEC, domain registrar auto-renewal, SSL certificate validation. |

### 2.2 Vendor Consoles & Service Links
- **Cloudflare Dashboard:** `https://dash.cloudflare.com/` (Zone: `bajihears.app`, Worker: `bajihears`)
- **Supabase Console:** `https://supabase.com/dashboard/project/qsloqqvdunfuyqqdmgil`
- **Google Cloud Console (OAuth):** `https://console.cloud.google.com/apis/credentials`
- **Domain Registrar:** Cloudflare Registrar / Primary Registrar for `bajihears.app`

### 2.3 Cloudflare Worker Secrets Configuration
Secrets must **never** be placed in `wrangler.json`, committed to Git, or logged to console. Configure them exclusively via `npx wrangler secret put`:

```bash
# Required Database & Push Secrets
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put CRON_SECRET

# Required Moderation Alert Provider (Configure at least ONE before launch):
# Option A: Telegram Bot
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# Option B: Webhook Delivery
npx wrangler secret put MODERATION_WEBHOOK_URL
npx wrangler secret put MODERATION_WEBHOOK_SECRET

# Required Admin Moderation Allowlists
npx wrangler secret put MODERATOR_EMAILS  # Comma-separated allowlisted emails
```

---

## 3. Approved Production Release & Cutover Gate

Execution must follow this strict sequential order. Do not skip any step:

```mermaid
flowchart TD
    A[Pre-Flight Validation Gates] -->|Pass All Tests| B[Supabase Backup & Snapshot]
    B -->|Verified Backup| C[Apply Schema Migration 20261025000000]
    C -->|Verified Schema| D[Deterministic Editorial Import]
    D -->|30 Rows Verified| E[Configure Worker Secrets]
    E -->|Secrets Staged| F[Deploy Cloudflare Worker]
    F -->|New Version ID| G[Post-Deploy Live Smoke & Cache Purge]
    G -->|Pass 100%| H[Production Live & Ready]
```

### Step 1: Pre-Release Quality & Security Gate
Execute locally from the repository root:
```bash
# 1. Run all linter, typecheck, unit, and isolated database behavior suites
npm run check:release

# 2. Verify zero production dependency vulnerabilities
npm audit --omit=dev --audit-level=high

# 3. Verify Cloudflare Worker packaging dry-run
npx wrangler deploy --dry-run

# 4. Verify editorial CSV content integrity
node scripts/validate-editorial-csv.mjs
```
*Gate Condition:* All commands must exit with code 0. Zero errors, zero warnings.

### Step 2: Supabase Backup & Baseline Snapshot (Free Plan Procedure)
> [!NOTE]
> The **Supabase Free Plan** does not include self-service dashboard manual snapshots or Point-in-Time Recovery (PITR). All pre-deployment backups must be generated via `pg_dump` CLI using the PostgreSQL connection string.

1. Record the pre-release row count baseline in Supabase SQL Editor:
   ```sql
   SELECT 
     (SELECT count(*) FROM public.unsaids WHERE source_type = 'community') AS community_posts,
     (SELECT count(*) FROM public.echoes) AS echoes,
     (SELECT count(*) FROM public.reactions) AS reactions,
     (SELECT count(*) FROM public.post_reports) AS reports;
   ```
2. Verify the database connection string and CA certificate:
   ```bash
   node scripts/check-database-connection.mjs
   ```
3. Take a complete logical database backup via `pg_dump` prior to applying schema migrations:
   ```bash
   # Export schema & data snapshot to a timestamped file
   pg_dump -d "$SUPABASE_DATABASE_URL" \
     --clean --if-exists --no-owner --no-privileges \
     --schema=public \
     -f "backups/pre_release_$(date +%Y%m%d_%H%M%S).sql"
   ```
   *(Ensure connection stays within Free tier pool limits: max 15 pooler connections).*

### Step 3: Apply Database Schema Migration
Apply `supabase/migrations/20261025000000_editorial_collection_schema.sql` via Supabase Dashboard SQL Editor or Supabase CLI:
```bash
# Option A: Via Supabase CLI (if linked)
npx supabase db push

# Option B: Via Supabase Dashboard SQL Editor
# Copy, execute, and verify: supabase/migrations/20261025000000_editorial_collection_schema.sql
```
Verify migration in Supabase SQL Editor:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '20261025000000';
-- Must return 1 row.

SELECT to_regprocedure('public.get_editorial_originals()') IS NOT NULL AS rpc_exists;
-- Must return true.
```

### Step 4: Execute Deterministic Editorial Seed Import
Run the seed manager with explicit owner approval:
```bash
# 1. Run isolated dry-run simulation first
node scripts/editorial-seed-manager.mjs --dry-run

# 2. Execute production import with explicit owner authorization flag
node scripts/editorial-seed-manager.mjs --import-production --confirm-owner-approval
```
Verify imported rows:
```sql
SELECT count(*) FROM public.unsaids WHERE source_type = 'editorial';
-- Expected result: Exactly 30.

SELECT count(*) FROM public.unsaids WHERE source_type = 'editorial' AND device_token IS NOT NULL;
-- Expected result: Exactly 0 (No fabricated device tokens).
```

### Step 5: Deploy Cloudflare Worker
Deploy the production application bundle:
```bash
npm run deploy
# (Executes: vite build && wrangler deploy)
```
Record the resulting **Cloudflare Version ID** in Section 1.2 above.

### Step 6: Post-Deployment Smoke & Verification
```bash
# 1. Run live smoke test against production domain
TEST_BASE_URL=https://bajihears.app npm run test:live

# 2. Run database health and operational objects inspection
npm run check:production
```

### Step 7: Cloudflare Cache Invalidation
Purge Cloudflare edge cache **only** for changed static assets:
```bash
# Purge via Cloudflare API or Dashboard:
# Paths to purge:
#   https://bajihears.app/brand.svg
#   https://bajihears.app/favicon.png
#   https://bajihears.app/og-image.png
#   https://bajihears.app/manifest.webmanifest
```
*Note:* Do not purge `/*` (entire cache) to avoid edge origin thundering herd.

---

## 4. Cadence Operations Runbook

### 4.1 Daily Checks (Every Morning at 09:00 UTC / 14:00 PKT)

1. **Live Route Verification (Incognito / Clean Browser):**
   Open the following routes in a signed-out private window and inspect console/network:
   - `https://bajihears.app/` (The Wall & BajiHears Originals switcher)
   - `https://bajihears.app/?section=originals` (Curated 30 story collection)
   - `https://bajihears.app/duel` (Daily duel vote card)
   - `https://bajihears.app/corner` (Local profile, stats, streak)
   - `https://bajihears.app/about`, `/privacy`, `/terms`
   - `https://bajihears.app/admin/moderation` (Verifies 401 unauthenticated redirect)
2. **Automated Live Smoke Run:**
   ```bash
   TEST_BASE_URL=https://bajihears.app npm run test:live
   ```
   *Expect:* All routes 200 OK, zero 5xx errors, zero client console errors.
3. **Inspect Moderation & Push Queues in Supabase:**
   ```sql
   -- Check for pending alerts or delivery backlog
   SELECT status, count(*), min(created_at) AS oldest_record 
   FROM public.moderation_notifications 
   GROUP BY status;

   SELECT state, count(*), min(created_at) AS oldest_record 
   FROM public.push_outbox 
   GROUP BY state;
   ```
   *Threshold:* Any `pending` row older than **5 minutes** is a service incident.
4. **Moderation Dashboard Review:**
   Log in at `https://bajihears.app/admin/moderation` with an allowlisted moderator account:
   - Review pending user reports in `moderation_queue`.
   - Inspect auto-flagged submissions in `moderation_quarantine`.
   - Review recent entries in `moderation_audit_log`.
5. **Verify Daily Duel Winner Cycle:**
   ```sql
   SELECT cycle_start, cycle_end, status, winner_post_id, processed_at 
   FROM public.winner_cycles 
   ORDER BY cycle_end DESC 
   LIMIT 3;
   ```
   *Expect:* The latest cycle must match the most recently closed 00:00 or 12:00 UTC boundary. `status = 'skipped_empty'` is only acceptable if zero eligible posts existed.
6. **Infrastructure Health Metrics:**
   - Check Cloudflare Worker metrics: Error rate (< 0.1%), CPU time (< 25ms avg), cron triggers (60/hour).
   - Check Supabase metrics: Active pool connections (< 50%), CPU (< 60%), storage (< 80%).

---

### 4.2 Weekly Checks (Every Monday)

1. **Full Release Health Check:**
   ```bash
   npm run check:release
   npm audit --omit=dev --audit-level=high
   npm run test:browser
   ```
2. **Database Permissions & Structural Audit:**
   ```bash
   npm run check:production
   ```
3. **Queue Pruning & Retention Verification:**
   Confirm automatic cleanup is functioning:
   ```sql
   -- Verify delivered push items older than 7 days are pruned
   SELECT count(*) FROM public.push_outbox 
   WHERE state IN ('delivered', 'failed') AND created_at < now() - INTERVAL '8 days';
   -- Expect: 0 rows.
   ```
4. **Database Index & Query Performance Audit:**
   ```sql
   -- Check for sequential scans on feed tables
   SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
   FROM pg_stat_user_tables
   WHERE relname IN ('unsaids', 'echoes', 'reactions', 'post_reports', 'push_outbox')
   ORDER BY seq_scan DESC;
   ```
   *Action:* If `seq_scan` is growing faster than `idx_scan` on `unsaids`, investigate query plans.
5. **SEO & Metadata Health:**
   Verify canonical URLs and robots headers:
   ```bash
   curl -sI https://bajihears.app/ | grep -i "link:"
   curl -sI https://bajihears.app/robots.txt
   curl -sI https://bajihears.app/sitemap.xml
   ```
6. **Mobile Accessibility Spot-Check:**
   Test on Chrome DevTools Mobile Viewports (360×740, 390×844):
   - Touch targets >= 44×44px.
   - Text contrast >= 4.5:1.
   - Keyboard focus visible on all buttons.

---

### 4.3 Monthly Checks (1st of Every Month)

1. **Backup Restore Drill (Mandatory Reliability Audit - Free Plan):**
   - *Note on Free Plan:* Dashboard automated backup downloads are disabled on Free plan. Export a logical dump using `pg_dump`:
     ```bash
     pg_dump -d "$SUPABASE_DATABASE_URL" \
       --clean --if-exists --no-owner --no-privileges \
       --schema=public \
       -f backups/monthly_drill.sql
     ```
   - Restore into an isolated local PostgreSQL container or test database:
     ```bash
     psql -d "postgresql://postgres:postgres@localhost:5432/test_restore" -f backups/monthly_drill.sql
     ```
   - Execute verification script:
     ```sql
     SELECT 
       (SELECT count(*) FROM public.unsaids) AS total_posts,
       (SELECT count(*) FROM public.unsaids WHERE source_type = 'editorial') AS editorial_posts,
       (SELECT count(*) FROM public.unsaids WHERE source_type = 'community') AS community_posts,
       (SELECT count(*) FROM public.reactions) AS total_reactions;
     ```
   - Record drill date, operator, restore duration, and checksum verification in the operations log.
2. **Quota & Billing Forecast:**
   - Review Cloudflare Worker request count against monthly free/paid plan limits.
   - Review Supabase egress and database disk usage against monthly caps.
3. **Credential & Secret Rotation Audit:**
   - Audit Google OAuth authorized JavaScript origins and redirect URIs.
   - Review active moderator allowlist in `MODERATOR_EMAILS`.
   - Rotate `CRON_SECRET` and webhook secrets if any collaborator access has changed.
4. **Domain & Security Health:**
   - Check domain expiration date (ensure auto-renew is active with at least 1-year buffer).
   - Verify DNSSEC status in Cloudflare Registrar.
   - Verify SSL/TLS Universal Certificate expiration and auto-renewal status.
5. **Legal & Privacy Compliance Review:**
   - Confirm support contact mailbox (`admin@bajihears.com`) is receiving emails.
   - Review Terms of Service and Privacy Policy for regulatory alignment.

---

## 5. Subsystem Operational Runbooks

### 5.1 Trust & Safety and Moderation Alerts

#### Architecture:
When a visitor reports a post or echo, an atomic RPC (`report_post_atomic` or `report_echo_atomic`) logs the report and inserts an entry into `public.moderation_notifications` with `status = 'pending'`. The 1-minute Cloudflare cron (`runScheduledTasks`) claims pending alerts using atomic leases (`claim_token`, 60-second expiry) and dispatches them to Telegram or Webhook.

#### Operational Rules:
1. **Never Manually Delete Alert Rows:** Do not execute `DELETE FROM public.moderation_notifications` or manually set `status = 'delivered'` to clear queues.
2. **Stuck / Pending Alerts (> 5 Minutes):**
   - Check if Worker secrets are configured (`TELEGRAM_BOT_TOKEN` or `MODERATION_WEBHOOK_URL`).
   - If secrets are missing or invalid, alerts remain `pending` with lease released.
   - Verify provider health (e.g. test Telegram API connectivity).
   - Once credentials are valid, the next 1-minute cron will automatically claim and deliver them.
3. **Handling Failed Alerts (`status = 'failed'`):**
   ```sql
   -- Inspect failure causes
   SELECT id, event_type, target_type, attempts, last_error, updated_at 
   FROM public.moderation_notifications 
   WHERE status = 'failed' 
   ORDER BY updated_at DESC;
   ```
   - Review target post/echo directly in the moderation dashboard (`/admin/moderation`).
   - After addressing external provider issues, reset failed rows for retry with owner approval:
     ```sql
     UPDATE public.moderation_notifications 
     SET status = 'pending', attempts = 0, last_error = NULL, updated_at = now() 
     WHERE status = 'failed' AND attempts >= 3;
     ```

---

### 5.2 Daily Duel & 12-Hour Winner Cycle

#### Architecture:
Every 12 hours (at 00:00 UTC and 12:00 UTC), the 1-minute cron triggers `process_winner_cycle_atomic`. It aggregates community votes and reaction velocity, determines the winning thought, crowns the author, and enqueues a push notification payload into `public.push_outbox`.

#### Diagnosing Winner Cycle Issues:
```sql
-- Check the 5 most recent cycles
SELECT id, cycle_start, cycle_end, status, winner_post_id, participant_count, processed_at 
FROM public.winner_cycles 
ORDER BY cycle_end DESC 
LIMIT 5;
```
- **`status = 'completed'` with `winner_post_id`:** Normal successful cycle.
- **`status = 'skipped_empty'`:** Occurs if zero eligible posts were submitted during that 12-hour window. Verify:
  ```sql
  SELECT count(*) FROM public.unsaids 
  WHERE source_type = 'community' 
    AND status = 'published' 
    AND created_at >= '2026-10-24 00:00:00+00' 
    AND created_at < '2026-10-24 12:00:00+00';
  ```
- **Missing Cycle Boundary:** If current time is > 10 minutes past 00:00 or 12:00 UTC and no cycle record exists, the Cloudflare cron trigger may be stalled.
  - Check Cloudflare Worker Tail:
    ```bash
    npx wrangler tail bajihears --format=pretty
    ```
  - Manually trigger cron via authorized secret:
    ```bash
    curl -X POST https://bajihears.app/api/cron/scheduled \
      -H "Authorization: Bearer <CRON_SECRET>"
    ```

---

### 5.3 Web Push Notification Delivery Outbox

#### Architecture:
Push payloads are written to `public.push_outbox` with `state = 'pending'`. The worker claims up to 100 rows per minute using atomic batch leases, fetches VAPID subscriptions, and dispatches encrypted WebPush requests to Apple/Google/Mozilla push services.

#### Troubleshooting Push Delivery:
```sql
SELECT state, count(*), min(created_at) AS oldest 
FROM public.push_outbox 
GROUP BY state;
```
- **Handling HTTP 410 / Gone (Expired Subscriptions):** The Worker automatically flags expired endpoints as `unsubscribed` and removes them from future deliveries.
- **Handling High Error Count:** Inspect `last_error` in `push_outbox`. Common causes include invalid VAPID private key or network timeout to push gateways.

---

### 5.4 Editorial Collection Management

#### Architecture:
The 30 Manus original stories are seeded into `public.unsaids` with immutable seed IDs (`BH-001` through `BH-030`), display orders (`1` through `30`), and `source_type = 'editorial'`.

#### Management Commands:
```bash
# Validate CSV content integrity
node scripts/validate-editorial-csv.mjs

# Dry-run database seeding in isolated in-memory PostgreSQL (PGlite)
node scripts/editorial-seed-manager.mjs --dry-run

# Production import (requires explicit owner approval flag)
node scripts/editorial-seed-manager.mjs --import-production --confirm-owner-approval

# Production rollback (targets ONLY editorial rows, leaves community posts 100% untouched)
node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval
```

---

## 6. Incident Response & Emergency Procedures

### 6.1 Severity Classification & Response Matrix

| Severity | Definition | Response SLA | Action Protocol |
| :--- | :--- | :---: | :--- |
| **P1 - Critical** | Visitor-facing outage, complete API failure, security breach, data leakage. | **< 15 minutes** | Immediate Worker rollback, secret rotation, public incident logging. |
| **P2 - High** | Stalled cron cycle, moderation alert delivery failure, broken duel voting. | **< 1 hour** | Edge tail inspection, provider credential restoration, manual cron trigger. |
| **P3 - Medium** | Performance degradation (LCP > 4s), minor UI glitches, single-user auth issues. | **< 4 hours** | Asset cache review, database query plan inspection, bugfix deployment. |
| **P4 - Low** | Typo, non-critical copy update, minor aesthetic adjustment. | **Next release** | Scheduled release pipeline. |

---

### 6.2 Emergency Runbook A: Production Outage / Broken Worker Release (P1)

**Trigger:** Elevated 5xx error rate (> 1%) or fatal frontend crash after deployment.

1. **Rollback Cloudflare Worker Instantly:**
   Roll back traffic to the verified previous stable Cloudflare version (`85059a31-93b4-48e6-955d-c668f99ba29f`):
   ```bash
   npx wrangler rollback 85059a31-93b4-48e6-955d-c668f99ba29f
   ```
2. **Verify Rollback Status:**
   ```bash
   TEST_BASE_URL=https://bajihears.app npm run test:live
   ```
3. **Capture Telemetry & Triage:**
   ```bash
   npx wrangler tail bajihears --format=pretty > incident_worker_tail.log
   ```
   *Rule:* Never paste raw logs containing visitor device tokens, authorization headers, or database URLs into public issues.

---

### 6.3 Emergency Runbook B: Faulty Database Migration or Seed Corrupted (P1/P2)

**Trigger:** Migration error, database schema lock, or corrupted editorial seeding.

1. **Rollback Editorial Seed Content (Non-Destructive):**
   ```bash
   node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval
   ```
   Or execute directly in Supabase SQL Editor:
   ```sql
   -- Cascading delete targets ONLY editorial rows
   DELETE FROM public.unsaids WHERE source_type = 'editorial';
   ```
   *Verification:* Verify that `count(*) WHERE source_type = 'community'` matches the baseline pre-release count. Community posts are completely untouched.
2. **Database Snapshot Restore (If Community Data Affected - Free Plan):**
   - *Note on Free Plan:* Point-in-Time Recovery (PITR) is a Pro add-on and unavailable on Free plan.
   - If community data was accidentally impacted, restore directly from the pre-release `pg_dump` snapshot created in Section 3 Step 2:
     ```bash
     psql -d "$SUPABASE_DATABASE_URL" -f backups/pre_release_<TIMESTAMP>.sql
     ```
   - Alternatively, for non-destructive editorial rollbacks where community data is untouched, use Step 1 above (`node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval`), which surgically deletes ONLY `source_type = 'editorial'`.

---

### 6.4 Emergency Runbook C: Compromised Secret or Security Breach (P1)

**Trigger:** Secret detected in public repository, unauthorized database access, or admin account compromise.

1. **Rotate Supabase Service Role Key:**
   - In Supabase Dashboard > **Settings** > **API**, click **Generate new Secret Key**.
   - Immediately update Worker secret:
     ```bash
     npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
     ```
2. **Rotate VAPID Keys:**
   - Generate new VAPID keypair (`npx web-push generate-vapid-keys`).
   - Update `VAPID_PUBLIC_KEY` in `wrangler.json` and `VAPID_PRIVATE_KEY` via `wrangler secret put`.
3. **Purge Unauthorized Admin Sessions:**
   - Update `MODERATOR_EMAILS` secret to remove compromised accounts:
     ```bash
     npx wrangler secret put MODERATOR_EMAILS
     ```
   - In Supabase Dashboard > **Authentication** > **Users**, revoke active sessions for affected accounts.

---

## 7. Monitoring Thresholds & Alert SLA Matrix

| Monitored Metric | Healthy Value | Warning Threshold | Critical Incident Threshold | Immediate Remediation Action |
| :--- | :--- | :--- | :--- | :--- |
| **Worker HTTP 5xx Rate** | 0.00% | > 0.05% over 5m | **> 0.50% over 5m** | Rollback Worker version via Runbook A. |
| **Pending Moderation Alerts** | 0 rows | > 3 rows (> 2m) | **> 1 row (> 5m)** | Check Telegram/Webhook secrets via Section 5.1. |
| **Winner Cycle Delay** | Processed in < 60s | > 5m past boundary | **> 15m past boundary** | Trigger manual cron execution via Section 5.2. |
| **Push Delivery Backlog** | 0 pending | > 500 pending | **> 2,000 pending** | Check VAPID credentials and push gateway logs. |
| **Supabase Connection Pool (Free Tier)** | < 8 connections | > 12 connections | **> 15 connections** | Terminate idle connections, verify query pooling. |
| **Lighthouse LCP (Mobile)** | < 2.5s | 2.5s – 4.0s | **> 4.5s** | Verify edge caching of `/assets/*` and image sizing. |
| **Lighthouse CLS (Mobile)** | < 0.05 | 0.05 – 0.10 | **> 0.10** | Verify skeleton loaders and fixed aspect ratios. |

---

## 8. Operational Command Cheatsheet

```bash
# Release Testing & Static Analysis
npm run lint                                  # ESLint code hygiene
npm run typecheck                             # TypeScript compiler verification
npm test                                      # Vitest unit & integration test suites
npm run test:database                         # PGlite isolated PostgreSQL migration tests
npm run test:browser                          # Controlled Playwright browser integration suite
npm run build                                 # Production Vite + Nitro SSR compilation

# Production Security & Operations Audits
npm run check:release                         # Full pre-flight release gate check
npm run check:production                      # Production schema, RLS, and object verification
npm audit --omit=dev --audit-level=high        # Dependency vulnerability scanner
node scripts/check-client-secrets.mjs         # Scans build output for leaked credentials
TEST_BASE_URL=https://bajihears.app npm run test:live # Live production smoke test

# Editorial Collection Seeding
node scripts/validate-editorial-csv.mjs       # Validates the 30 Manus originals
node scripts/editorial-seed-manager.mjs --dry-run # PGlite in-memory import simulation
node scripts/editorial-seed-manager.mjs --import-production --confirm-owner-approval
node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval

# Brand Asset Pipelines
python scripts/build-brand-icons.py           # Builds 16/32 favicons, PWA icons, maskables
node scripts/generate-brand-svg.mjs           # Builds pure vector SVG mark
node scripts/generate-og-image.mjs            # Builds 1200x630 OpenGraph social card
node scripts/generate-brand-assets.mjs        # Master generation pipeline

# Cloudflare Worker Deployment & Telemetry
npx wrangler deploy --dry-run                 # Validates packaging without deploying
npm run deploy                                # Builds and deploys to Cloudflare Workers
npx wrangler tail bajihears --format=pretty   # Live streaming edge execution logs
npx wrangler rollback <version_id>            # Instant traffic rollback
```
