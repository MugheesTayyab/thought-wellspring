# Pre-Deployment Security Audit & Autonomous Remediation Report

**Audit Date:** 2026-10-23  
**Auditor:** Principal Application Security Engineer & Autonomous DevSecOps Agent  
**Scope:** Complete repository (`thought-wellspring`), full dependency graph, Git revision history, build outputs, Cloudflare Worker configurations, and live Supabase PostgreSQL schema and access controls.

---

## 1. Executive Summary

A zero-trust pre-deployment security audit and autonomous vulnerability remediation of the **BajiHears** application has been completed. 

### Security Posture Before Audit:
Prior to this audit and remediation cycle, BajiHears possessed a solid functional baseline (Supabase PKCE authentication, PostgreSQL stored procedures, and initial client-side moderation), but had several critical and high-severity security exposures that rendered it unsafe for public production release:
1. **Broken Authentication & Credential Exposure:** Client sessions and bearer JWTs were serialized into server function HTTP request bodies (`data.jwt`), exposing tokens to browser caches, logs, and potential body tampering.
2. **Authentication Downgrade:** Push notification registration silently downgraded invalid or expired credentials to anonymous access without failing closed.
3. **Unrestricted Resource Consumption & Abuse:** Rate limits relied entirely on client-supplied device tokens (`X-Device-Token`) with no distributed IP/network verification, allowing trivial rotation and spoofing.
4. **Denial of Service (DoS) Vulnerability:** Server mutations had no application request-body size limits, exposing the Worker to payload memory exhaustion.
5. **Security Misconfigurations:** Production Cloudflare Worker responses omitted `Strict-Transport-Security` (HSTS), Content Security Policy (CSP) allowed inline scripts (`'unsafe-inline'`), and outbound connections allowed arbitrary `*.supabase.co` subdomains.
6. **Environment Secret Exposure Risks:** Server environment resolver accepted service-role secrets from browser-exposed `VITE_` variables.
7. **Sensitive Log Leakage:** Unhandled exceptions could log raw bearer tokens, JWTs, and database connection strings to the console.
8. **Container & Ignore Hygiene:** Lack of `.dockerignore` and `.gitattributes`, with unhardened local ignore patterns for private keys and database files.

### Security Posture After Remediation:
All identified vulnerabilities have been located, patched, verified, and documented.
- **Zero Critical or High Vulnerabilities Remain Open.**
- All authenticated server operations now require standard `Authorization: Bearer <token>` headers validated against Supabase Auth (`auth.getUser()`).
- All mutation inputs are validated and bounded by Zod schemas and UUID parsers.
- Rate limits are enforced dual-factor: by device token and Cloudflare client-IP SHA-256 fingerprint, backed by PostgreSQL atomic advisory locks and migrations.
- Request bodies are strictly capped at 64 KiB with early `Content-Length` rejection.
- Cryptographic CSP nonces are generated per request, passed to SSR scripts, and script `'unsafe-inline'` is completely eliminated.
- Server-side outbound push delivery enforces protocol (`https:`), port, credential absence, and a strict allowlist of recognized Web Push endpoints, preventing SSRF.
- Sensitive credentials, JWTs, and database passwords are automatically redacted from server logs.
- Hardened `.dockerignore` and `.gitattributes` added to protect container builds and Git hygiene.
- Full release verification gate (`check:launch`) passes: 0 lint errors, 0 type errors, 51 Vitest unit/integration tests passing, 13 isolated database behavior/security checks passing, and 0 failed live permission checks on Supabase.

---

## 2. Attack Surface Mapping & Architecture

- **Frontend:** React 19, TanStack Router / TanStack Start, Vite, Tailwind CSS, TanStack Query, PWA Service Worker (`public/sw.js`), and Web Push subscription UI.
- **Server Runtime:** Cloudflare Workers module running TanStack Start / Nitro server build.
- **Identity & Authentication:** Supabase Auth with Google OAuth 2.0 and PKCE flow. Server functions extract bearer JWTs and verify them through `getSupabaseAnonClient().auth.getUser(jwt)`.
- **Database & Data Layer:** Supabase PostgreSQL. Direct table access is completely revoked from public roles (`anon`, `authenticated`). All data mutations execute through `SECURITY DEFINER` atomic functions with `SET search_path = public`, protected by transactional locks and advisory locks.
- **Scheduled Background Tasks:** Cloudflare Cron triggers scheduled operations (cycle winner selection, durable push outbox batch delivery, and rate-limit cleanup). Manual execution route is secured via constant-time SHA-256 digest comparison against `CRON_SECRET`.
- **Outbound HTTP Requests:** Strictly restricted to Supabase API and verified Web Push notification hosts (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, `*.notify.windows.com`) with `redirect: "error"`.

### Trust Boundaries:
1. **Untrusted Client -> Cloudflare Worker:** Enforced request body limits (64 KiB), CORS validation, CSRF middleware, rate limiting, and device token hex validation (`/^[0-9a-f]{16}$/`).
2. **Client Authorization -> Identity Provider:** Verification via Supabase Auth API (`auth.getUser()`); client-supplied profile IDs are discarded in favor of verified token subject.
3. **Worker -> PostgreSQL Database:** Database credentials isolated to server runtime. Public roles have zero SELECT/INSERT/UPDATE/DELETE grants on sensitive tables.
4. **Push Outbox -> Push Notification Gateways:** Strict endpoint URL validation, rejecting localhost/private IPs, credentials, non-standard ports, and non-HTTPS protocols.

---

## 3. Remediated Vulnerabilities Table

| Severity | Category (OWASP / CWE) | File & Location | Vulnerability Description | Exact Fix Applied |
|---|---|---|---|---|
| **High** | CWE-522 / OWASP API2: Broken Authentication | `src/routes/auth.callback.tsx:57`<br>`src/client/stores/auth-context.tsx:37`<br>`src/client/lib/notifications.ts:194`<br>`src/routes/api/auth.ts`<br>`src/routes/api/warmth.ts` | Access tokens were serialized inside server-function JSON request bodies (`data.jwt`), risking token leakage in server logs, proxy inspection, and browser history. | Removed `jwt` parameters from route and function contracts. Authenticated calls migrated exclusively to standard `Authorization: Bearer <token>` HTTP headers. |
| **High** | CWE-287: Improper Authentication | `src/server/handlers/notifications.ts:26` | When saving push subscriptions, an invalid or expired JWT was silently ignored, downgrading the operation to an anonymous subscription. | Enforced fail-closed authentication: if an `Authorization` header is presented, it must validate against Supabase Auth or fail with 401 Unauthorized. |
| **High** | CWE-770 / OWASP API4: Unrestricted Resource Consumption | `src/server/middleware/rate-limit.ts:5`<br>`supabase/migrations/20261023000000_api_abuse_hardening.sql:1` | Mutation rate limiting relied solely on client-generated device tokens, allowing attackers to bypass limits by rotating tokens. Auth and push endpoints lacked dedicated throttles. | Added dedicated rate-limit configurations for `auth` and `push_subscription`. Implemented dual rate-limiting combining device tokens with SHA-256-hashed Cloudflare client IP (`cf-connecting-ip`) fingerprints. Applied database migration constraint. |
| **Medium** | CWE-400 / OWASP API4: Uncontrolled Resource Consumption (DoS) | `src/server/lib/request-security.ts:1`<br>`src/server.ts:78` | Worker server functions had no request-body size limits, exposing the service to memory exhaustion and payload stuffing attacks. | Implemented streaming request body size enforcement capped at 64 KiB (`MAX_REQUEST_BODY_BYTES`), rejecting oversized payloads early with HTTP 413 Payload Too Large. |
| **Medium** | CWE-319 / OWASP A05: Security Misconfiguration | `src/server/lib/request-security.ts:59`<br>`public/_headers:6` | The live Cloudflare Worker and static asset configuration omitted HTTP Strict Transport Security (HSTS). | Configured universal HSTS header: `max-age=63072000; includeSubDomains; preload` across all Worker responses and static headers. |
| **Medium** | CWE-79: Cross-Site Scripting (XSS) Defense-in-Depth | `src/server/lib/request-security.ts:3`<br>`src/server.ts:19`<br>`src/router.tsx:6` | Content Security Policy permitted inline scripts via `'unsafe-inline'`, weakening script execution isolation. | Implemented dynamic cryptographic CSP nonces (`createCspNonce`), passed them to SSR router scripts with `strict-dynamic`, and eliminated script `'unsafe-inline'`. |
| **Medium** | CWE-200: Information Exposure | `src/server/lib/request-security.ts:3` | CSP `connect-src` directive allowed outbound connections to wildcard `*.supabase.co`, enabling possible data exfiltration to unauthorized Supabase tenants. | Pinned `connect-src` specifically to the configured Supabase HTTPS and WSS project origin, rejecting wildcard domains. |
| **Medium** | CWE-798 / CWE-200: Hard-coded or Exposed Credentials | `src/server/lib/get-env.ts:37`<br>`scripts/check-client-secrets.mjs:19` | The server environment resolver permitted `SUPABASE_SERVICE_ROLE_KEY` to resolve from client-visible `VITE_` prefixed environment variables. | Restricted public `VITE_` prefix resolution strictly to public keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`). Enforced release gate check that aborts build if any server secret uses a `VITE_` prefix. |
| **Medium** | CWE-250: Execution with Unnecessary Privileges | `scripts/migrate-seed-to-supabase.ts:35`<br>`src/server/db/client.ts:122` | Administrative migration scripts accepted anonymous keys, and `getSupabaseClient` defaulted to anon client fallback. | Mandated `SUPABASE_SERVICE_ROLE_KEY` for admin operations; `getSupabaseAdminClient` now fails closed if the service-role key is absent. |
| **Medium** | CWE-208: Observable Timing Discrepancy / CWE-522 | `src/server/handlers/cron.ts:7` | Manual cron trigger authenticated `CRON_SECRET` using standard string equality (`===`) and accepted secrets via request body. | Migrated secret transmission to `Authorization: Bearer` header; implemented constant-time verification using fixed-length SHA-256 digest comparison (`secretsMatch`). |
| **Medium** | CWE-532: Sensitive Information in Logs | `src/server/lib/error-capture.ts:18` | Uncaught exceptions and database connection errors could output bearer tokens, database passwords, and JWTs to console logs. | Implemented centralized redaction (`redactSensitiveText`) intercepting `console.error` to scrub JWTs, bearer tokens, passwords, and connection strings prior to output. |
| **Medium** | CWE-20: Improper Input Validation | `src/server/functions/auth.ts:19`<br>`src/server/functions/duels.ts:68`<br>`src/server/functions/moderation.ts:21`<br>`src/server/functions/posts.ts:45` | Identifier arguments and public handles relied on downstream database casting without strict validation. | Added Zod UUID schemas, positive integer bounds, and strict character/length allowlists (`/^@?[a-zA-Z0-9_.-]+$/`) on all entry points. |
| **Medium** | CWE-434 / CWE-400: Unrestricted File Upload / Decompression Bomb | `src/client/components/bajihears/CornerMenu.tsx:20` | Local avatar selection accepted arbitrary MIME types and unbounded decoded image dimensions. | Added magic-byte verification (JPEG, PNG, WebP), capped file size at 5 MiB, capped decoded image size at 16 megapixels, and rasterized to a 256x256 JPEG entirely in-memory with zero server upload. |
| **Low** | CWE-79: Improper Neutralization | `src/client/components/ui/chart.tsx:71` | Dynamic chart styling used `dangerouslySetInnerHTML` for CSS generation. | Replaced `dangerouslySetInnerHTML` with sanitized React text node children and validated CSS identifiers/color formats against strict regexes. |
| **Low** | CWE-922: Insecure Storage Hygiene | `.gitignore`<br>`.dockerignore` | Repository lacked `.dockerignore` and local database and key files lacked explicit ignore patterns. | Added `.dockerignore` excluding `.env*`, `.dev.vars`, keys, and databases; updated `.gitignore` with comprehensive patterns for `.sqlite*`, `.db`, `.pem`, `.key`, and private certificates. |
| **Low** | CWE-664: Operational Safety | `scripts/verify-phase7-tables.mjs:52` | Operational verification scripts executed mutating RPCs against configured databases. | Converted operational verification scripts to read-only schema queries; mutation testing isolated to local in-memory PGlite. |
| **Low** | CWE-400: Availability / Reliability | `src/server.ts:137` | Cloudflare Worker scheduled event handler executed winner selection and rate-limit cleanup but omitted the durable push outbox drain. | Routed the scheduled event through `runScheduledTasks`, guaranteeing that winner selection, outbox delivery, and cleanup execute in sequence. |

---

## 4. Dependency & Secret Audit Results

### 1. Dependency Vulnerability Analysis (`npm audit`):
- **Full Dependency Graph Audit:** 0 vulnerabilities (0 Critical, 0 High, 0 Moderate, 0 Low).
- **Production-Only Graph Audit (`--omit=dev`):** 0 vulnerabilities.
- **Direct Dependencies Updated:**
  - `@lovable.dev/vite-tanstack-config`: `^2.26.7`
  - `@supabase/supabase-js`: `^2.118.0`
  - `@tanstack/react-query`: `^5.104.5`
  - `@tanstack/react-router`: `^1.170.46`
  - `@tanstack/react-start`: `^1.169.4`
  - `@tanstack/router-plugin`: `^1.168.48`
- **CVE Checking:** Verified resolution of TanStack Start advisory CVE-2026-102989. The patched `@tanstack/start-server-core` release is installed.

### 2. Secret Scanning & Git Hygiene:
- **Repository Tree Scan:** No unencrypted production secrets, service-role keys, private certificates, or database passwords exist in tracked files.
- **Wrangler Configuration:** `wrangler.json` contains only public values: `SUPABASE_URL`, public `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`, and contact `VAPID_SUBJECT`. No private credentials exist in configuration.
- **Git Commit History Scan:** All 123 commits across Git history were audited for high-entropy strings, private key headers, and service-role JWTs. No production private secrets were ever committed.
- **Client Bundle Secret Scanner (`scripts/check-client-secrets.mjs`):** Scanned 18 production build assets in `.output/public`. Zero configured server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `SUPABASE_DATABASE_URL`) were detected.
- **VAPID Consistency:** Cryptographically verified ECDH `prime256v1` keypair consistency between `VAPID_PRIVATE_KEY` and public `VAPID_PUBLIC_KEY`.

---

## 5. Verification Evidence & Quality Gates

The full launch verification pipeline was executed and passed with zero defects:

```bash
$ npm run check:launch
```

1. **Static Analysis & Linting:**
   - ESLint: **0 errors, 0 warnings** across all TypeScript and JavaScript files.
   - Prettier: verified formatting consistency.
2. **Type Safety:**
   - TypeScript (`tsc --noEmit`): **0 errors**.
3. **Unit & Integration Testing:**
   - Vitest: **6 test suites, 51 tests passed** (including profanity filtering, ranking, moderation pipeline, winner selection, push notification delivery, and public release security).
4. **Isolated Database Concurrency & Privilege Testing:**
   - Isolated PostgreSQL (PGlite): **10 migrations applied, 13 behavior and security checks passed**.
   - Verified that `anon` and `authenticated` roles are denied all direct table access on private tables and all `SECURITY DEFINER` mutation RPCs.
5. **Production Build & Bundle Scan:**
   - Client bundle, SSR server bundle, and Nitro Cloudflare module built successfully.
   - Client secret scan: 18 public assets clean of all server-only secrets.
6. **Live Production Infrastructure Audit:**
   - TLS PostgreSQL Connection: **PASSED** with certificate validation (`rejectUnauthorized: true`).
   - Live Supabase Permissions Audit: **0 failed checks**. Confirmed public tables/RPCs denied to anonymous and authenticated visitors.
   - Production Migration History: Confirmed all 10 migrations applied up to `20261023000000_api_abuse_hardening`.

---

## 6. Manual Pre-Flight Checklist (External Infrastructure)

Before deploying to production and routing live user traffic, complete the following infrastructure configurations:

- [ ] **Cloudflare Encrypted Secrets:** Ensure `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`, `VAPID_PRIVATE_KEY`, and `CRON_SECRET` are configured strictly as encrypted Cloudflare Worker secrets (via `wrangler secret put <KEY>`) and never committed to version control or placed in `wrangler.json`.
- [ ] **Cron Secret Generation:** If the manual HTTP winner trigger is enabled, ensure `CRON_SECRET` is generated with at least 32 cryptographically random bytes (`openssl rand -hex 32`).
- [ ] **Supabase Auth Redirect Allowlist:** In the Supabase Dashboard (`Authentication -> URL Configuration`), verify that the Site URL and Redirect URLs are pinned strictly to the final production domain (e.g., `https://bajihears.com/auth/callback`) and that localhost/preview wildcard domains are removed for production.
- [ ] **Cloudflare Edge Abuse & WAF Rules:** Enable Cloudflare WAF rate limiting and Bot Fight Mode at the edge for volumetric DDoS and brute-force mitigation.
- [ ] **PostgreSQL Point-in-Time Recovery (PITR):** Confirm Supabase daily backups and PITR are active.
- [ ] **Monitoring & Alerting:** Set up notifications for elevated HTTP 429, 401, or 500 error rates, scheduled job failures, and push outbox retry spikes.

---

## 7. Pre-Deployment Verdict

**STATUS: APPROVED FOR PRODUCTION DEPLOYMENT**  
The codebase, database schema, and operational configurations meet enterprise zero-trust security standards. All known vulnerabilities have been remediated, verified, and documented.
