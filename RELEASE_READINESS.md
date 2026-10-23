# Public release audit — 23 October 2026

The implementation, production database hardening, Cloudflare secret synchronization,
and automated launch checks are complete. **The code is ready to deploy.** Final
acceptance still includes real Google OAuth, notification delivery, and physical-device
checks after deployment because those cannot be proven by controlled browser fixtures.

## Findings fixed, in implementation order

1. [x] Removed Read navigation and its personality-reading implementation. Old
       `/read` links redirect to the Wall. Removed unused mascot and fabricated
       community-presence components. Replaced branding, app icons, and share artwork
       with typography. Old image assets are archived under ignored `artifacts/`.
2. [x] Duel fits the viewport at 320×568, 360×740, 390×844, 768×1024, and 1440×900
       before/after voting. It has no nested scroll area. Enlarged text and unusually
       long content may use document scrolling so content remains accessible.
3. [x] Repaired `success`/`ok` authentication contract mismatches; enabled PKCE;
       surfaced callback/login/logout failures; guarded profile loading against stale
       sessions; cleared account query caches on sign-out. Live Google consent remains
       an external check.
4. [x] Account ownership comes from verified JWTs. A guest cannot request another
       account's activity or forge a post's account owner. Private activity avoids
       string-interpolated PostgREST filters. Anonymous public posts/replies hide their
       profile association and device identifiers.
5. [x] Added database permissions migration denying direct browser table writes,
       private table reads, and privileged RPC execution. Public content is projected
       through the server. The service role retains the required access. All nine
       migrations are now recorded and applied to the live project.
6. [x] Reactions, reply limits, voting, account linking, rewards, and purchases use
       database transactions. Rate limits fail closed during database errors. The
       12-hour posting rule is enforced across account devices in the database.
7. [x] Removed mock Duel fallbacks and local success for failed votes. Failed votes
       roll back and stay retryable. Backend feed errors show an error rather than
       pretending the community is empty. Fabricated guest statistics and fallback
       winner presentation were removed.
8. [x] Fixed push token handling and false subscription success. Restricted push
       endpoints to known HTTPS providers, validated keys, added request timeouts, and
       prevented redirects to arbitrary endpoints. A private VAPID key in a test
       fixture was replaced with dynamically generated test keys; the local production
       pair was rotated. The matching private key is published as a Cloudflare secret,
       and the release gate cryptographically validates the local key pair.
9. [x] Wired the actual Nitro/Cloudflare scheduled hook. Durable push fan-out drains
       25 recipients per invocation and retries failures, instead of dropping every
       recipient after 45. The queue is service-only. Manual cron triggers are denied
       when no secret is configured.
10. [x] Restricted mutation origins, disabled public diagnostics, protected response
        caching, added security headers, enabled browser zoom, and repaired stored
        identity/draft behavior when storage fails. Shared links load older posts by
        ID instead of depending on the first page already containing them. Browser-local
        Corner/Duel/Ember state waits for hydration; the conflicting daily-bonus popup
        was removed.
11. [x] Added unit/security, isolated PostgreSQL, browser, dependency, and public
        bundle checks. Updated vulnerable development dependencies. Documented exact
        environment, migrations, OAuth redirects, and deployment steps in README.

## Verification evidence

- TypeScript: passing with strict checks.
- Unit/security tests: 46 passing, including private ownership and fail-closed checks.
- Isolated PostgreSQL: all 9 migrations applied; 13 behavior/permission checks pass.
- Browser: viewport/voting, rollback, reactions, replies, saved notes, Read redirect,
  old shared links, composer, denied sign-in, and feed outage checks. Responses are
  controlled fixtures; these checks do **not** prove live OAuth/database operation.
- Production build: passing; generated worker contains the scheduled hook and
  durable push operations.
- Public assets: configured server secrets absent from the built browser bundle.
- Dependency audit: zero known vulnerabilities after updates.
- ESLint: passing with no errors or warnings under the project's scoped boundary rules.
- Production database: TLS connection, all nine migration records, required RPCs,
  service-role access, and denied browser access to private tables all verified.
- Cloudflare: required secret names exist and the matching rotated VAPID private key
  has been uploaded; Worker packaging dry-run passes.

## Post-deployment acceptance checks

- [x] Production database connectivity, migration history, private-table permissions,
      service-role access, and required RPCs verified by `npm run check:production`.
- [x] Matching rotated VAPID key pair validated and the private key uploaded to the
      Cloudflare Worker. A real notification still needs a subscribed device.
- [ ] Verify Supabase/Google provider settings, final Site URL, exact callback
      allowlist, successful login, profile linking, reload, and sign-out using a real
      account on the deployed domain.
- [ ] Run the README's live smoke test on a second browser and a phone. Confirm
      scheduled events execute, configure backups/alerts, and assign report review.

Reference: [Supabase database function permissions](https://supabase.com/docs/guides/database/functions),
[PKCE sessions](https://supabase.com/docs/guides/auth/sessions/pkce-flow), and
[verified PostgreSQL TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).
