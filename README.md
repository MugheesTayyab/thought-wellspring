# BajiHears

An anonymous thought wall with replies, reactions, saved notes, and a community Duel.
Built with React, TanStack Start, Supabase, and Cloudflare Workers.

The code and production database pass the automated launch gate. Read
[RELEASE_READINESS.md](RELEASE_READINESS.md) for the evidence and the short list of
post-deployment checks that still require a real account, device, or operator.

## Local development

Requires Node 24 and npm. Copy `.env.example` to `.env.local` and supply your own
Supabase values. Never commit `.env.local` or prefix a server secret with `VITE_`.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4175 --strictPort
```

## Verification

```sh
npm run check:release
npm run check:production
npm run check:launch
npm audit
```

For browser checks, start the development server at port 4175, then run
`npm run test:browser`. Google Chrome must be installed; set `TEST_BASE_URL` for
another local port. These checks use controlled API responses and make no public
posts. `npm run test:database` runs all migrations and transaction/permission checks
in an isolated PostgreSQL engine; it does not read credentials or touch Supabase.

`npm run check:production` verifies the TLS database connection, complete migration
history, required RPCs, live table permissions, server-role access, and OAuth provider
availability. `npm run check:launch` runs both the local release suite and those
read-only production checks. The bundled Supabase CA is used by default.

## Deployment

1. Confirm the Supabase API URL resolves and Google is enabled under Authentication
   → Providers. Set Authentication → URL Configuration → Site URL to the final
   public origin and allow the exact `https://YOUR-DOMAIN/auth/callback` redirect.
   Add the Supabase callback shown in the provider settings to Google Cloud's OAuth
   client. Test from a second browser/account.
2. Apply the SQL migrations in `supabase/migrations` in filename order. Existing
   installations need all three `20261022…` migrations, as well as any earlier
   migrations not yet applied. Use the Supabase migration workflow or SQL Editor;
   do not expose a migration endpoint in the app. These migrations close direct
   browser writes and add atomic submission, voting, and delivery operations.
3. Supply `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `VITE_VAPID_PUBLIC_KEY` at **build time**. The public VAPID key must match the
   worker's private key. The client deliberately has no hardcoded project fallback.
4. Set Cloudflare runtime secrets with `npx wrangler secret put`:
   `SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY`. The local VAPID pair was
   rotated during this audit because the old private key appeared in a test
   fixture. Use the new local pair; do not reuse the historical key. Never paste
   private keys into client config or this README. Existing subscribers can renew
   using Corner → Settings → Enable notifications.
5. Set runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`, and
   `VAPID_SUBJECT` in `wrangler.json` or your hosting configuration. Check the
   values match the build. `CRON_SECRET` is optional; without it the manual cron
   endpoint is disabled. Cloudflare's scheduled trigger does not use that endpoint.
6. Run `npm run check:launch`, then `npm run deploy` when ready. Keep the cron
   trigger enabled: the Nitro plugin handles the actual deployed Worker's scheduled
   hook. It checks winner selection idempotently and drains up to 25 queued push
   recipients per minute. Failed sends retry up to three attempts. Queue rows,
   subscription keys, account details, and device identifiers are server-only.
7. Verify the final link on desktop and phone: load Wall, post, reload, react,
   reply, report, save/unsave, vote once, revisit Duel, sign in, reload Corner,
   sign out, open a shared thought, and opt into a test notification. Confirm
   scheduled invocations and push queue progress in Cloudflare/Supabase.

If the final domain differs from the current Workers URL, update the Open Graph
URLs in `src/routes/__root.tsx` and the OAuth allowlist before building.

## Persistence and moderation

Posts, replies, votes, reports, account activity, and delivery jobs use Supabase.
Drafts, saved notes, photos, local handles, and cosmetic Ember points stay in the
browser. Signing out clears cached account queries. Anonymous public posts do not
expose their account link; email and private device identifiers are never projected
into the feed. No server balance is minted from browser-supplied points.

Review flagged content in Supabase's `moderation_queue` and `echo_reports`; these
are restricted to the server/admin. Before publishing widely, assign someone to
check reports and configure project backups and operational alerts. Device limits
are not a complete defense against distributed abuse: configure Cloudflare rate
limiting/abuse controls for your expected traffic.

The repository is linked to Lovable. Preserve published Git history; do not force
push, amend, squash, or rebase commits already synchronized to the connected branch.
