# BajiHears — Exhaustive Production Implementation Plan
*Every detail. Nothing omitted. Optimized for bulk client-facing traffic.*

---

> [!IMPORTANT]
> This plan is written against commit `8bd417f` of your exact codebase.
> Every function, file, and mock comment referenced is real and traceable.
> **No code appears in this document — only precise conceptual specifications.**

---

## Reading Guide

```
🔴 Needs from you (dashboard work, credentials, decisions)
🟢 Agent does this (no input needed from you)
⚠️  Common failure point — pay extra attention
📦  New file or folder being created
✏️  Existing file being modified
```

---

# PART ONE — FOLDER RESTRUCTURE

> Done first, before any phase begins. Establishes the architecture all phases build on.

---

## Why Restructure

The current `src/lib/` folder contains everything: mock data, types, localStorage helpers,
business logic, scoring algorithms, and context providers — all mixed together.
For a production codebase with a backend layer, this creates three critical problems:

1. Server functions would accidentally import browser APIs (localStorage, window) and crash
2. There is no clear boundary between "what the client knows" and "what the server trusts"
3. Any developer (or future agent session) cannot instantly understand what runs where

The restructure solves this permanently with physical folder separation.

---

## Target Folder Map

```
src/
│
├── routes/                          [UNCHANGED — TanStack requires this location]
│   ├── __root.tsx
│   ├── index.tsx
│   ├── duel.tsx
│   ├── read.tsx
│   └── corner.tsx
│
├── client/                          [Everything the browser downloads and runs]
│   │
│   ├── components/
│   │   ├── bajihears/               [All 24 existing components move here]
│   │   ├── ui/                      [Future reusable base components]
│   │   └── layouts/                 [Shell wrappers, header atoms]
│   │
│   ├── hooks/                       [React hooks used by UI only]
│   │   ├── use-mobile.tsx           [Existing — move from src/hooks/]
│   │   ├── use-wall.ts              [New — wall feed query + mutations]
│   │   ├── use-duel.ts              [New — duel fetch + vote]
│   │   ├── use-winner.ts            [New — winner card data]
│   │   ├── use-auth.ts              [New — session state]
│   │   └── use-warmth-sync.ts       [New — warmth ↔ Supabase bridge]
│   │
│   ├── stores/                      [Client-side state — move from src/lib/]
│   │   ├── warmth-context.tsx       [Existing warmth-context.tsx — move here]
│   │   └── auth-context.tsx         [New — session + profile state]
│   │
│   └── styles/
│       └── styles.css               [Existing — move from src/]
│
├── server/                          [Runs on Cloudflare Worker — zero browser APIs]
│   │
│   ├── functions/                   [TanStack createServerFn — the API surface]
│   │   ├── posts.ts                 [submitPost, fetchWall, fetchWinner, reactToPost, addEcho]
│   │   ├── duels.ts                 [fetchDuels, voteOnDuel]
│   │   ├── warmth.ts                [syncWarmth, awardServerWarmth, fetchProfile]
│   │   ├── auth.ts                  [migrateGuest, updateProfile]
│   │   ├── moderation.ts            [reportPost, adminReview]
│   │   └── notifications.ts        [storePushSubscription, sendPushToAll]
│   │
│   ├── db/                          [Database access — only imported by server/functions/]
│   │   ├── client.ts                [Admin + anon Supabase client factory]
│   │   ├── unsaids.ts               [All query functions for unsaids table]
│   │   ├── profiles.ts              [All query functions for profiles table]
│   │   ├── reactions.ts             [Reaction upsert/delete queries]
│   │   ├── echoes.ts                [Echo insert/fetch queries]
│   │   └── duels.ts                 [Duel + duel_votes queries]
│   │
│   ├── jobs/                        [Cloudflare Cron handlers]
│   │   ├── winner-selection.ts      [12h cron — scores and crowns winner]
│   │   └── push-dispatch.ts         [Called after winner selection — sends push]
│   │
│   ├── middleware/                  [Request-level guards]
│   │   ├── rate-limit.ts            [Per-device post + action rate limits]
│   │   ├── device-token.ts          [Validates device_token format + existence]
│   │   └── csrf.ts                  [CSRF check — TanStack has this built in]
│   │
│   └── lib/                         [Server-only utilities — no browser APIs]
│       ├── spam-filter.ts           [Server mirror of client spam patterns]
│       ├── scoring.ts               [Post + winner scoring algorithm]
│       ├── seed-migration.ts        [One-time script to insert seedData into DB]
│       └── vapid.ts                 [VAPID push library wrapper]
│
└── shared/                          [Imported by BOTH client and server — no side effects]
    │
    ├── types/                       [Pure TypeScript interfaces]
    │   ├── unsaid.ts                [Unsaid, Echo, ReactionKey types]
    │   ├── profile.ts               [BajiIdentity, BajiProfile types]
    │   ├── duel.ts                  [Duel, DuelOption, AnsweredDuelRecord types]
    │   └── warmth.ts                [TierInfo, WarmthLogEntry, ActionType types]
    │
    ├── constants/                   [Pure values — no imports]
    │   ├── categories.ts            [CATEGORIES array]
    │   ├── presets.ts               [PRESETS, EXCLUSIVE_PRESETS arrays]
    │   ├── reactions.ts             [REACTIONS array]
    │   ├── warmth.ts                [TIERS, AWARD_VALUES, GIFT_MILESTONES, DAILY_PASSIVE_CAP]
    │   └── cycle.ts                 [CYCLE_MS, LOCKOUT_MS, MAX_LEN, MIN_LEN]
    │
    └── validators/                  [Input validation — used to verify user input]
        ├── post.ts                  [Text length, category membership]
        └── echo.ts                  [Echo text length]
```

### Migration Rules for Existing Files

| Existing File | Destination | Notes |
|---|---|---|
| `src/lib/bajihears.ts` | Split: types → `shared/types/`, mocks → deleted, localStorage helpers → `client/stores/`, scoring → `server/lib/scoring.ts`, formatting utils → `shared/constants/` |
| `src/lib/warmth.ts` | Split: types → `shared/types/warmth.ts`, constants → `shared/constants/warmth.ts`, `claimDailyBonus` → `server/functions/warmth.ts` |
| `src/lib/warmth-context.tsx` | Move to `client/stores/warmth-context.tsx` |
| `src/lib/identity.ts` | Split: types → `shared/types/profile.ts`, generation logic → `client/stores/`, server mirror → `server/middleware/device-token.ts` |
| `src/lib/spamFilter.ts` | Copy to `server/lib/spam-filter.ts`; client version stays for UX feedback only |
| `src/lib/notifications.ts` | Split: permission/SW code → `client/`, server delivery → `server/lib/vapid.ts` |
| `src/lib/seedData.ts` | Moves to `server/lib/seed-migration.ts` — runs once, then the file is deleted post-migration |
| `src/lib/warmthStore.ts` | Types → `shared/types/`, constants → `shared/constants/`, purchase validation → `server/functions/warmth.ts` |
| `src/lib/bajiRead.ts` | Stays in `client/` — it's a client-side personality scoring engine using local behavior data |
| `src/lib/haptics.ts` | Move to `client/lib/haptics.ts` — browser-only |
| `src/lib/utils.ts` | Move to `shared/` |
| `src/components/bajihears/` | Move all 24 files to `src/client/components/bajihears/` |
| `src/hooks/use-mobile.tsx` | Move to `src/client/hooks/` |

### The Import Rule (Enforced Forever)

```
server/  →  can import from: shared/  only
client/  →  can import from: shared/, client/  only
routes/  →  can import from: client/, shared/, server/functions/ (for createServerFn calls)
shared/  →  cannot import from anywhere
```

If a server file imports from `client/`, the Worker build will fail because browser APIs
(`localStorage`, `window`, `navigator`) are not available in the Worker runtime.

---

# PART TWO — THE PHASES

---

## PHASE 0 — Pre-flight & Secrets Foundation

**Who:** You entirely. Agent cannot click through dashboards.
**Estimated time:** 60–75 minutes.
**Must complete before:** Any code work begins.

---

### Step 0-A — Create Supabase Project

**Where:** [supabase.com/dashboard](https://supabase.com/dashboard) → New Project

**Exact settings to use:**
- Organization: your personal org or create one
- Project name: `bajihears` (lowercase, no spaces)
- Database password: generate a strong one — **save it in a password manager**
- Region: **Southeast Asia (Singapore)** or **South Asia (Mumbai)** — whichever is closer to your users (Pakistan audience → Singapore is fine, Mumbai might not be available on free tier — use Singapore)
- Plan: Free tier

**After project creates (takes ~2 minutes), collect these four values:**
1. `Project URL` — looks like `https://abcdefghijkl.supabase.co`
2. `anon (public) key` — starts with `eyJ`, found under Settings → API
3. `service_role key` — also under Settings → API — **treat this like a password**
4. `Connection string (Transaction)` — under Settings → Database → Connection pooling → Transaction mode → copy the full URI

**Settings to change in Supabase:**
- Authentication → Settings → Email → Disable "Confirm email" toggle
- Authentication → Settings → Email → Disable "Secure email change" toggle
- Authentication → URL Configuration → Site URL → set to your Cloudflare Pages URL (you'll fill this after Step 0-C)
- Authentication → URL Configuration → Redirect URLs → add your Cloudflare Pages URL + `/auth/callback`

> 🔴 **You need to share with me:** The Project URL and anon key only.
> Never share the service_role key in chat. Put it directly into Cloudflare Secrets.

---

### Step 0-B — Connect Supabase MCP in Antigravity

**Where:** Antigravity → Settings → MCP Servers → Add Server

**Config to enter:**
- Server name: `supabase`
- MCP endpoint: Supabase's official MCP URL (find under Supabase Dashboard → Integrations → MCP or use the public endpoint `mcp.supabase.com`)
- Authentication: your `service_role key`

**Verification:** After adding, in a new Antigravity chat, type:
*"List all tables in my Supabase database"*

Expected response: it lists `auth.users` and a few default Supabase internal tables.
If it times out or errors → the service_role key is wrong or MCP config URL is off.

> ⚠️ **Common failure:** Copying the `anon key` instead of `service_role key` into MCP.
> MCP needs the service role key to have full access. The anon key will give permission errors.

---

### Step 0-C — Create Cloudflare Pages Project

**Where:** [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create application → Pages → Connect to Git

**Exact settings:**
- Git provider: GitHub → select `MugheesTayyab/thought-wellspring`
- Production branch: `main`
- Build system version: v2
- Build command: `npm run build`
- Build output directory: `.output/public`
- Root directory: `/` (leave blank)

**After project creates:**
- Copy the assigned `*.pages.dev` URL — you need it for Step 0-D and for Supabase Auth settings

> ⚠️ **Common failure:** Setting the output directory to `dist` (that's Vite default, not TanStack Start).
> Your project's nitro build outputs to `.output/public`.

---

### Step 0-D — Google Cloud OAuth Setup

**Where:** [console.cloud.google.com](https://console.cloud.google.com)

**Exact steps:**
1. Create a new project OR select an existing one
2. APIs & Services → OAuth consent screen → External → Fill in:
   - App name: `BajiHears`
   - User support email: your email
   - Developer contact email: your email
   - Authorized domain: `supabase.co`
   - Save and continue through scopes (no special scopes needed — just default email + profile)
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Name: `BajiHears Web`
   - Authorized JavaScript origins: `https://abcdefghijkl.supabase.co`
   - Authorized redirect URIs — add BOTH:
     - `https://abcdefghijkl.supabase.co/auth/v1/callback`
     - `https://your-project.pages.dev/auth/callback`
   - Create → copy `Client ID` and `Client Secret`

**Then in Supabase:**
- Authentication → Providers → Google → Enable
- Paste Client ID and Client Secret
- Save

> ⚠️ **Common failure:** The redirect URI must match character-for-character.
> If your Supabase project URL ends with a `/`, include it in both places or neither.

> ⚠️ **Common failure:** OAuth consent screen must be in "Testing" or "Production" status.
> In Testing, only whitelisted emails work. For public launch, submit for production.

---

### Step 0-E — Create `.env.local` File

**Who:** Agent creates the file, you fill in the actual values.

**Variables the file contains:**
- `VITE_SUPABASE_URL` — your Project URL
- `VITE_SUPABASE_ANON_KEY` — your anon key
- `SUPABASE_SERVICE_ROLE_KEY` — your service role key (server-side only, never `VITE_` prefix)
- `VITE_SUPABASE_REDIRECT_URL` — your `*.pages.dev/auth/callback` URL

**What gets added to `.gitignore`:**
- `.env.local` must already be in `.gitignore` — verify this before committing anything

> 🔴 **What I need from you:** After you fill in `.env.local`, tell me "env is ready" so I can start Phase 1.

---

## PHASE 1 — Supabase Schema + Row-Level Security

**Who:** Agent via MCP.
**Estimated time:** Agent runs in one session.
**You:** Review tables in Supabase dashboard after agent says done.

---

### Overview of the Six Tables

The full data model is designed upfront. No surprise `ALTER TABLE` statements later.
Tables are created in dependency order (no table references a table that doesn't exist yet).

---

### Table 1 — `profiles`

**Purpose:** Stores every user's identity. Linked to Supabase Auth's built-in `auth.users` table.
Anonymous users don't have a row here until they sign up with Google.
Device tokens are stored here after a guest converts to an account.

**Columns and their rationale:**

- `id` — UUID, primary key, foreign key to `auth.users(id)`. When a user deletes their Google account, Supabase Auth cascades the delete to this row automatically.
- `handle` — text, unique. The user's display name (e.g., `chaiwala_99`). Generated from the existing `PREFIXES + SUFFIXES` logic in `identity.ts` at account creation time. Unique constraint prevents collisions.
- `avatar_seed` — integer 1–500. Maps to a pre-generated avatar style. Not a URL — just a number, keeping the row small.
- `member_since` — date. Set once at row creation. Never updated.
- `device_token` — text, unique, nullable. The 16-character hex token from `identity.ts`. Nullable because a brand-new account (no prior anonymous use) doesn't have one. Set when a guest converts.
- `visit_streak` — integer. Incremented daily by a server function when user visits. Resets if gap exceeds 48 hours.
- `last_visit` — date. Updated on each visit. Used to calculate streak continuity.
- `streak_freeze_used` — boolean. Whether the user has ever used their one streak freeze. Defaults false. Prevents streak reset once.
- `total_actions` — integer. Incremented by every reaction, echo, post, duel vote. Used by the `tabs_unlocked` logic. Never decremented.
- `warmth_total` — integer. Running sum of all warmth earned. Used for tier display, store purchases, Baji Read unlock.
- `warmth_log` — JSONB array of last 50 warmth events. Structure: `{id, action, amount, label, timestamp}` — mirrors `WarmthLogEntry` type exactly.
- `purchased_items` — text array of store item IDs the user has bought. e.g., `['deep_read', 'pin_post']`.
- `tabs_unlocked` — JSONB object `{duel: boolean, read: boolean}`. Set by server function when `total_actions` crosses the threshold (3 for duel, 5 for read).
- `push_subscription` — JSONB, nullable. The full Web Push subscription object (endpoint + keys). Stored when user grants notification permission.
- `created_at` / `updated_at` — timestamps. `updated_at` auto-updates via a Postgres trigger.

**Indexes:** Primary key index on `id`. Unique index on `handle`. Unique index on `device_token`.

**Trigger:** `updated_at` column auto-updates to `now()` on every `UPDATE` via a Postgres trigger function. This trigger is created once and reused across all tables that have `updated_at`.

---

### Table 2 — `unsaids`

**Purpose:** The Wall. Every post ever submitted. Status field controls visibility.
The most frequently read table — every page load queries it.

**Columns and their rationale:**

- `id` — UUID, gen_random_uuid(). Not sequential integers — sequential IDs leak post volume.
- `text` — text. The actual post. DB-level constraint: 3 to 280 characters. This mirrors `MIN_LEN` and `MAX_LEN` from your existing `bajihears.ts`.
- `handle` — text, nullable. Null means anonymous. Not a foreign key — anonymous posts have no profile.
- `device_token` — text, not null. Every post must be traceable to a device, even anonymous ones. This is how rate limiting, veto prevention, and moderation work without accounts.
- `profile_id` — UUID, nullable, foreign key to `profiles(id)` with `ON DELETE SET NULL`. If a user deletes their account, their posts remain but become fully anonymous.
- `category` — text. One of the five categories from `CATEGORIES` constant. DB-level CHECK constraint enforces valid values.
- `preset` — text. One of the preset keys from `PRESETS` or `EXCLUSIVE_PRESETS`. Controls sharing card appearance.
- `status` — text with CHECK constraint. Only four valid values: `pending`, `published`, `review`, `rejected`. All posts start as `pending`. Server function promotes to `published` after spam check passes.
- `pending_until` — timestamptz, nullable. Reserved for future feature: hold a post until a specific time before it appears.
- `veto_count` — integer, default 0. Reports received. Incremented by `moderation.ts` server function.
- `vetoed_by` — text array. Device tokens of reporters. Prevents the same device from reporting twice. Not a separate join table — kept here for query simplicity at this scale.
- `is_winner` — boolean, default false. Set to true by the 12h cron job winner selection.
- `winner_cycle` — timestamptz, nullable. Which 12h cycle this post won. Used to prevent selecting the same winner twice and to fetch the current winner efficiently.
- `pinned_until` — timestamptz, nullable. If a user spends warmth to "Pin to Top", this is set. Feed query uses this to boost position.
- `reactions` — JSONB object `{heart: int, sad: int, fire: int, hug: int}`. Denormalized counter. Fast to read without a join. Updated atomically by a server function using a Postgres `UPDATE ... SET reactions = jsonb_set(...)` call, not a read-modify-write from the application layer.
- `created_at` / `updated_at` — timestamps, with `updated_at` trigger.

**Indexes:**
- `(status, created_at DESC)` — the primary index used by every wall feed query
- `(category, status, created_at DESC)` — used by category filter queries
- `(is_winner, winner_cycle DESC)` — used by `fetchWinner` to get the latest winner instantly
- `(device_token)` — used by rate limit checks in `submitPost`
- `(pinned_until)` — used to surface pinned posts in feed ordering

---

### Table 3 — `echoes`

**Purpose:** Comments on wall posts. Separate table (not a JSONB array on `unsaids`) because
echoes need their own timestamps, handles, and future features (likes on echoes, nested replies).

**Columns:**
- `id` — UUID
- `unsaid_id` — UUID, foreign key to `unsaids(id)` with `ON DELETE CASCADE`. If a post is deleted, its echoes are deleted automatically.
- `text` — text, 1–200 characters. Shorter than a post — echoes are reactions, not new posts.
- `handle` — text, nullable. Anonymous or named.
- `device_token` — text, not null. Same traceability requirement as posts.
- `profile_id` — UUID, nullable, foreign key to `profiles(id)` with `ON DELETE SET NULL`.
- `created_at` — timestamptz.

**Indexes:** `(unsaid_id, created_at)` — used to fetch echoes for a post in time order.

---

### Table 4 — `reactions`

**Purpose:** The source of truth for "has this device already reacted to this post with this key?"
The `reactions` JSONB column on `unsaids` stores the COUNT. This table stores WHO reacted.
Both are needed: the count column for fast reads without joining, this table for deduplication.

**Columns:**
- `id` — UUID
- `unsaid_id` — UUID, foreign key to `unsaids(id)` with `ON DELETE CASCADE`
- `device_token` — text, not null
- `reaction_key` — text, CHECK constraint for `heart`, `sad`, `fire`, `hug`
- `created_at` — timestamptz

**Unique constraint:** `(unsaid_id, device_token, reaction_key)` — the DB itself prevents double reactions. No application-level deduplication needed.

**Index:** `(unsaid_id)` — used when fetching a post's existing reactions for a given device.

---

### Table 5 — `duels`

**Purpose:** The content for The Duel page. Currently `MOCK_DUELS` in `bajihears.ts`.
These get seeded from `MOCK_DUELS` into the database and future duels are added via the Supabase dashboard.

**Columns:**
- `id` — UUID
- `format` — text, CHECK constraint: `self-relate` or `head-to-head`
- `prompt` — text, nullable. The question above the two options.
- `option_a_text` / `option_b_text` — text. The two choices. (Flat columns, not nested JSONB, for easier Supabase dashboard editing.)
- `option_a_handle` / `option_b_handle` — text, nullable. Attribution if the text came from a real post.
- `option_a_category` / `option_b_category` — text, nullable.
- `votes_a` / `votes_b` — integer. Denormalized vote counters. Same pattern as `reactions` on `unsaids`.
- `active` — boolean. When false, this duel no longer appears in the rotation.
- `created_at` — timestamptz.

**Index:** `(active, created_at DESC)` — for fetching active duels in order.

---

### Table 6 — `duel_votes`

**Purpose:** Prevents a device from voting on the same duel twice. Same pattern as `reactions`.

**Columns:**
- `id` — UUID
- `duel_id` — UUID, foreign key to `duels(id)` with `ON DELETE CASCADE`
- `device_token` — text, not null
- `choice_index` — integer, CHECK constraint: 0 or 1
- `created_at` — timestamptz

**Unique constraint:** `(duel_id, device_token)` — one vote per device per duel.

---

### Row-Level Security Design

**Philosophy for BajiHears:** Most operations are done via server functions that use the `service_role` key (which bypasses RLS entirely). RLS is a safety net — if someone calls the Supabase API directly with the `anon` key, RLS is the last line of defense.

**`profiles` RLS:**
- SELECT: anyone can read any profile (needed for Community Regulars, handle display)
- INSERT: only `auth.uid() = id` — you can only create your own profile row
- UPDATE: only `auth.uid() = id` — you can only update your own row
- DELETE: disabled — profiles are not deleted through the app

**`unsaids` RLS:**
- SELECT: only `status = 'published'` rows are visible. Review/rejected/pending posts are invisible to anon callers.
- INSERT: allowed with `true` check — but server function is the only real caller, and it validates everything before inserting
- UPDATE: disabled for anon callers — only the service_role (server function) updates posts
- DELETE: disabled entirely through the API

**`echoes` RLS:**
- SELECT: `true` — all echoes on published posts are visible
- INSERT: `true` — server function validates before inserting
- UPDATE/DELETE: disabled

**`reactions` RLS:**
- SELECT: `true`
- INSERT: `true` — UNIQUE constraint handles deduplication
- DELETE: only if `device_token` matches — so a device can un-react its own reaction

**`duels` RLS:**
- SELECT: `true` where `active = true`
- INSERT/UPDATE/DELETE: disabled — only via Supabase dashboard (content management)

**`duel_votes` RLS:**
- SELECT: `true`
- INSERT: `true` — server function validates, UNIQUE constraint deduplicates

---

### Postgres Triggers

**`set_updated_at` function:** A Postgres function that sets `updated_at = now()` on any `UPDATE` operation.

**Applied to:** `profiles`, `unsaids` — the two tables where tracking modification time matters.

---

### Verification Steps for You

After agent completes Phase 1, open Supabase → Table Editor and confirm:
- All 6 tables exist with the column names matching the above spec
- RLS is shown as "Enabled" on each table (green indicator in Supabase UI)
- Run in the SQL Editor: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` — should return all 6 table names
- Run: `SELECT COUNT(*) FROM profiles` — should return 0

> 🔴 **What I need from you after Phase 1:** A screenshot or confirmation that all 6 tables exist and RLS is enabled.

---

## PHASE 2 — Backend API Layer (Server Functions)

**Who:** Agent.
**Estimated time:** One long agent session.
**Prerequisite:** Phase 1 complete. `.env.local` filled in.

---

### Architecture Decision

Every data mutation and privileged read goes through a TanStack Start `createServerFn`.
The client never calls Supabase directly for mutations. Reads can use the anon client directly
for public data (published posts list), but all writes must go through server functions.

**Reason:** Server functions run on the Cloudflare Worker, where `SUPABASE_SERVICE_ROLE_KEY`
is available as an environment variable. The service role key bypasses RLS, which means:
- Spam validation is in the same code that does the insert — it cannot be separated
- Rate limiting reads the DB with full access — cannot be faked by a modified request
- Reaction counter updates are atomic DB operations — no race conditions

---

### `server/db/client.ts` — Supabase Client Factory

**Two clients, two purposes:**

The admin client is initialized with the service role key and the transaction pooler connection string (not the direct connection). Transaction pooler is mandatory for Cloudflare Workers because Workers cannot maintain long-lived database connections — every Worker invocation is stateless.

The anon client is initialized with the anon key and used for public read queries that don't need elevated permissions. This client respects RLS.

**Why transaction pooler:** Cloudflare Workers have a hard limit on open TCP connections. The transaction pooler (pgbouncer mode 6543 port) is designed for short-lived connections — each query gets a connection from the pool and releases it immediately. The session pooler (5432) holds a connection for the lifetime of a session, which doesn't work for stateless Workers.

---

### `server/functions/posts.ts` — Wall Post Operations

**`submitPost` — the most security-critical function:**

Receives: text, handle (optional), category, preset, device_token

Validation chain (in this exact order — each step is a hard stop if it fails):
1. Device token format check — must be 16 hex characters, matching the format `identity.ts` generates. Rejects fabricated tokens.
2. Rate limit check — query the `unsaids` table for posts from this `device_token` in the last 60 minutes. If count ≥ 3, reject with a specific error code and the minutes until the window resets.
3. Text length check — must be between 3 and 280 characters (mirrors `MIN_LEN`, `MAX_LEN`).
4. Category membership check — must be one of the five valid categories from `CATEGORIES`.
5. Server-side spam patterns — re-run all patterns from `server/lib/spam-filter.ts`. This is the server mirror of `client/lib/spamFilter.ts`. Client-side filter is for UX feedback only.
6. Harder content patterns — a second pattern set that the client doesn't have (more aggressive, catches phone numbers in other formats, Urdu profanity patterns, etc.)
7. HTML/script injection strip — strip any `<`, `>`, `&` characters that could be rendered as HTML.

If all checks pass:
- Set `status = 'published'` for clean posts
- Set `status = 'review'` for posts that pass basic spam but match secondary patterns
- Insert into `unsaids` table
- Return the created post object to the client

Error response format (consistent for all server functions):
- `{ success: false, code: 'RATE_LIMITED', message: '...', data: { waitMinutes: 23 } }`
- `{ success: false, code: 'SPAM_DETECTED', message: '...', data: null }`
- `{ success: true, code: 'OK', data: { post: {...} } }`

**`fetchWall` — cursor-paginated wall feed:**

Receives: `filters` (array of Category), `cursor` (UUID or null for first page), `deviceToken`

Returns:
- Array of `published` posts, ordered by: pinned posts first (where `pinned_until > now()`), then by `created_at DESC`, with a secondary sort by score for the top 10 posts
- For each post, includes whether the calling device has reacted (a left join to `reactions` on `device_token`)
- `nextCursor` — the `id` of the last post in the page, used to fetch the next page
- Page size: 8 posts

Why cursor not offset: With offset-based pagination, page 3 becomes slower as the table grows because the DB must scan and discard rows 1–16 before returning rows 17–24. Cursor-based pagination always uses the index efficiently regardless of table size.

**`fetchWinner` — current cycle's winner:**

Receives: nothing

Logic:
1. Query `unsaids` where `is_winner = true`, order by `winner_cycle DESC`, limit 1
2. If no winner exists in DB yet → return the hardcoded `WINNER` fallback from your existing code
3. Include all echoes for the winner post

Cache behavior: Response includes a `Cache-Control: max-age=300` header so Cloudflare's edge caches it for 5 minutes, reducing DB load from the hero card.

**`reactToPost` — atomic reaction toggle:**

Receives: `unsaidId`, `reactionKey`, `deviceToken`

Logic (all in one DB transaction):
1. Attempt `INSERT INTO reactions (unsaid_id, device_token, reaction_key)` 
2. If it succeeds (no existing row) → also run `UPDATE unsaids SET reactions = jsonb_set(reactions, '{heart}', (reactions->>'heart')::int + 1)` for the relevant key
3. If it fails with unique violation (already reacted) → DELETE the row, then UPDATE the counter with `-1`
4. Return the new count for that reaction key

Why a transaction: Without a transaction, a race condition can occur where two requests both read the counter, both increment, and one update is lost.

**`addEcho` — comment on a post:**

Receives: `unsaidId`, `text`, `deviceToken`, `handle` (optional)

Validation:
- Text: 1–200 characters
- Spam patterns (lighter set — echoes are shorter, different patterns apply)
- Rate limit: max 10 echoes per device per hour

Returns: The created echo object.

---

### `server/functions/duels.ts` — Duel Operations

**`fetchDuels` — list of active duels:**

Receives: `deviceToken`

Returns: All active duels with `votes_a`, `votes_b`, and whether the calling device has already voted on each (`hasVoted: boolean`, `userChoice: 0 | 1 | null`).

**`voteOnDuel` — cast a vote:**

Receives: `duelId`, `choiceIndex` (0 or 1), `deviceToken`

Logic (one transaction):
1. INSERT into `duel_votes` — if unique constraint violation → device already voted, return existing vote
2. If new vote: UPDATE `duels` to increment `votes_a` or `votes_b` based on `choiceIndex`
3. Return updated vote totals

Note: The simulated percentage skew (`generateSplit` in your current `warmth.ts`) is replaced with real DB vote counts. Real votes are more compelling than simulated ones, and you now have real data.

---

### `server/functions/warmth.ts` — Warmth Persistence

**`syncWarmth` — client → server merge:**

Receives: `deviceToken`, `localWarmth` (the amount stored in localStorage)

Logic:
- Upsert a profile row for this device token if none exists
- Set `warmth_total = GREATEST(warmth_total, localWarmth)` — always take the higher value, never reduce
- Return the authoritative server total

**When called:** Every time the app loads and a session is detected. Never called anonymously — only after device_token is established.

**`awardServerWarmth` — server-side warmth event:**

Receives: `deviceToken`, `action`, `amount`, `label`

Called by server functions after a successful mutation (post submitted, echo added, duel voted). Appends to `warmth_log` JSONB array (capped at 50 entries), increments `warmth_total`.

Note: Client-side warmth awards still happen immediately for UX responsiveness. Server-side awards are the authoritative record. On next app load, `syncWarmth` reconciles them.

---

### `server/functions/auth.ts` — Account Management

**`migrateGuestToAccount` — the carry-over function:**

Receives: `authUserId`, `deviceToken`, `localWarmth`, `localHandle`

Called immediately after a user's first Google sign-in, before any other page action.

Logic (in order):
1. Check if a profile row already exists for `authUserId` — if yes, this is a returning signed-in user, skip migration
2. Check if `deviceToken` is already linked to a different profile — if yes, the device was already migrated, link but don't duplicate warmth
3. Insert profile row with `id = authUserId`, `device_token = deviceToken`, `handle = localHandle`, `warmth_total = localWarmth`
4. Return the new profile

**`updateProfile` — handle + call sign changes:**

Receives: `authUserId`, `handle` (optional), `callSign` (optional)

Validates handle uniqueness against the `profiles` table before updating. Returns error if handle taken.

---

### `server/functions/moderation.ts` — Report Handling

**`reportPost` — flag a post:**

Receives: `unsaidId`, `deviceToken`

Logic:
1. Check `vetoed_by` array — if `deviceToken` is already in it, return "already reported"
2. Check if post's `device_token` matches reporter's `deviceToken` — cannot report your own post
3. Append `deviceToken` to `vetoed_by`, increment `veto_count`
4. If new `veto_count >= 5` AND `echoes count < 3` → set `status = 'review'` (echoes count is a popularity signal — highly echoed posts get more scrutiny before hiding)
5. Return updated veto count

**The 5-report threshold:** Lower than your current client-side `REPORT_THRESHOLD = 3` because real reports from real devices are more meaningful than localStorage flags. 5 unique device tokens is harder to fake.

---

### `server/functions/notifications.ts` — Push Management

**`storePushSubscription` — save user's push endpoint:**

Receives: `deviceToken`, `pushSubscriptionJSON`

Updates `profiles.push_subscription` with the serialized subscription object.

**`sendPushToAll` — broadcast notification:**

Called by the winner cron job. Fetches all profiles where `push_subscription IS NOT NULL`, sends a push notification to each endpoint using the VAPID library.

> ⚠️ **Cloudflare Worker limit:** Free tier Workers have a 10ms CPU time limit per request.
> Sending push to many subscribers in a single Worker invocation may hit this.
> Solution: chunk subscribers into batches of 20, use `waitUntil()` for non-blocking dispatch.

---

## PHASE 3 — Auth: Google OAuth + Zero-Loss Guest Carry-Over

**Who:** Agent for code. You for two OAuth settings changes.
**Estimated time:** One session.
**Prerequisite:** Phase 0-D complete (Google OAuth configured in Supabase).

---

### The Auth State Machine

There are exactly three states a user can be in:

**State 1 — Pure Anonymous**
- No Supabase session
- Identity: `device_token` in localStorage
- All actions work: post, react, echo, vote
- UI: Shows auto-generated handle + avatar in header
- Warmth: Stored in localStorage only

**State 2 — Returning Guest (no account)**
- No Supabase session
- Device token exists from previous visit
- Identity continuity via `device_token`
- App loads prior reactions, warmth, history from localStorage

**State 3 — Authenticated Account**
- Active Supabase session (JWT in localStorage, managed by Supabase client)
- Identity: `auth.users.id` + linked `device_token` in `profiles`
- Warmth: Stored in `profiles.warmth_total`, synced to client on load
- UI: Shows real Google avatar + handle from profile

---

### The Sign-In Flow (Step by Step)

1. User taps "Sign in with Google" in the Corner Menu
2. Client reads current `device_token` from localStorage and stores it in `sessionStorage` under a temporary key (so it survives the redirect but not future sessions)
3. Call `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`
4. Browser redirects to Google → user approves → Google redirects to Supabase → Supabase processes → redirects to `/auth/callback`
5. The `/auth/callback` route reads the session from the URL hash, calls `supabase.auth.exchangeCodeForSession()`
6. Route reads back the stored `device_token` from `sessionStorage`
7. Calls the `migrateGuestToAccount` server function with `authUserId`, `deviceToken`, `localWarmth`, `localHandle`
8. Server creates profile row (or detects existing account)
9. Route redirects to `/` (Wall feed)
10. `onAuthStateChange` in the root component fires → updates auth context with the new session
11. `useWarmth` hook calls `syncWarmth` → gets authoritative server warmth total
12. Header re-renders showing Google avatar + real handle

---

### The `/auth/callback` Route

A new TanStack Start route at `src/routes/auth.callback.tsx`.

This route has no visible UI — it's a redirect handler. It shows a brief "Signing you in..." message with the BajiIntroSplash logo while the session exchange and migration happen. Then it navigates to `/`.

If the session exchange fails (user cancelled, network error, token expired):
- Show an error state with a "Try again" button that restarts the Google OAuth flow
- Log the error via `error-capture.ts`

---

### `src/client/stores/auth-context.tsx` — New Auth State Store

A React context provider that lives alongside `warmth-context.tsx`.

**Provides:**
- `session` — the Supabase session object or null
- `profile` — the `profiles` row for the signed-in user, or null
- `isLoading` — true while the initial session check is running (prevents flash of wrong state)
- `signInWithGoogle()` — initiates the OAuth flow
- `signOut()` — clears session + navigates to `/`
- `isAuthenticated` — boolean derived from session existence

**Initialization sequence:**
1. On mount, call `supabase.auth.getSession()` to check for existing session
2. Set `isLoading = true` during this check
3. Set session + profile when resolved
4. Subscribe to `supabase.auth.onAuthStateChange` for future sign-in/sign-out events
5. Set `isLoading = false`

The `isLoading` flag prevents a flash where the header briefly shows "anonymous" before confirming the user is actually signed in.

---

### Header Changes in `CornerMenu.tsx`

When `isAuthenticated = false` (anonymous):
- Show current auto-generated avatar + handle (existing behavior)
- Add a subtle "Sign in" link — not a modal, not a forced prompt, just an unobtrusive option

When `isAuthenticated = true`:
- Show Google profile photo as the avatar (within the existing avatar circle)
- Show profile handle
- Menu options: Share, Adjust Profile, Sign Out

The sign-in option is intentionally understated. BajiHears's value proposition is zero-friction anonymous posting. Sign-in is opt-in for users who want persistence across devices.

---

### What Happens to localStorage After Sign-In

Nothing is deleted. `device_token` stays in localStorage.
If the user signs out, the app falls back to anonymous mode using the same token.
This means signing out doesn't lose your history — you go back to State 2 (Returning Guest).

Only if a user explicitly clears browser data does their anonymous identity reset.

---

### Guest Carry-Over Conflict Scenarios

**Scenario A — First-time sign-up, prior anonymous usage:**
Normal flow above. Profile gets their local warmth and device_token.

**Scenario B — Signing in on a new device:**
No `device_token` in sessionStorage from this device.
Server creates a fresh profile with `device_token = null`. Warmth starts at 0 on this device.
Next session, `syncWarmth` will pull the authoritative total from the server.

**Scenario C — Same Google account, second device, prior anonymous usage on that device:**
The `device_token` from the second device is not yet in `profiles`.
Server function checks: does this `device_token` already belong to another `profiles` row?
If no → link it, migrate warmth (take GREATEST).
If yes → this device was previously anonymous and is now being claimed by this account.
Return error to client with message: "This device was already linked to a different account."

> ⚠️ **This is the one edge case that needs a user-facing decision.**
> The simplest resolution: first account to claim a device_token wins.

> 🔴 **What I need from you:** Which behavior you prefer for Scenario C.
> Recommendation: first-claimer wins. Second account sees fresh start on this device.

---

## PHASE 4 — Real Data Wiring (Replace All Mocks)

**Who:** Agent.
**Estimated time:** The longest session — touches every route and many components.
**Prerequisite:** Phases 1, 2, 3 complete.

---

### The Principle

Every UI component that currently reads from localStorage or from a MOCK_ constant
gets replaced with a TanStack Query hook that calls a server function.
The component itself doesn't need to know where data comes from — that's the hook's job.

---

### New Hooks in `client/hooks/`

**`use-wall.ts`**

Manages the wall feed. Uses `useInfiniteQuery` (TanStack Query) to fetch pages from `fetchWall`.

Behavior:
- First page loads immediately on component mount
- Each subsequent page loads when the intersection sentinel enters the viewport (existing pattern preserved)
- Filters (category selection) are part of the query key — changing filters resets to page 1
- Optimistic updates for reactions and echoes: UI updates instantly, server confirms in background, rolls back on error
- Stale time: 2 minutes — fresh data is prioritized but a very brief network interruption doesn't cause a blank feed

**Optimistic reaction flow:**
1. User taps a reaction emoji
2. Hook immediately updates the local query cache — the count changes visually
3. Mutation is called against the server function
4. On success: nothing to do, cache already has the right value
5. On error: roll back the cache to the snapshot taken in step 1, show a brief toast "Couldn't save — try again"

**`use-winner.ts`**

Fetches the current cycle winner with `useQuery`. Stale time: 5 minutes (winner changes every 12 hours — no need to re-fetch aggressively). Falls back to the hardcoded `WINNER` constant if the query fails.

**`use-duel.ts`**

Fetches active duels and the calling device's vote history. Manages the vote mutation.

The vote mutation:
1. Immediately marks the duel as "answered" in the cache (shows percentage bars)
2. Calls `voteOnDuel` server function
3. Updates cache with real vote totals from server response
4. Awards warmth client-side (the existing `awardWarmth` from warmth context)
5. Server function simultaneously calls `awardServerWarmth` so the award is also persisted

**`use-warmth-sync.ts`**

Called once on app load, after auth context resolves.
If authenticated → calls `syncWarmth` with `localWarmth` from localStorage.
Server returns authoritative total → if server total > local → update local state.
This handles the case where the same user accumulated warmth on a different device.

---

### Files With MOCK_ constants that get deleted

These exports from the current `bajihears.ts` are removed after Phase 4:
- `MOCK_UNSAIDS` — replaced by `fetchWall` server function
- `MOCK_DUELS` — replaced by `fetchDuels` server function
- `WINNER` object — replaced by `fetchWinner` server function
- `initializeWall()` — replaced by seed data in Supabase (Phase 4 includes a one-time migration)
- `readUnsaids()` / `writeUnsaids()` — no longer used
- `getWinner()` (the localStorage-cached version) — removed

What stays in the shared layer:
- All TypeScript type definitions
- `scorePost()` and `getSortedFeed()` — moved to `server/lib/scoring.ts`, used by the server feed algorithm
- Formatting utilities: `relativeTime`, `compactCount`, `formatCountdown`, `stripHandle`, etc. — moved to `shared/`
- `generateShareCode`, `buildShareUrl` — moved to `shared/`

---

### `src/routes/index.tsx` Changes

The `load` callback (which currently sets `MOCK_UNSAIDS`) is removed.
`shown` state management (the slice of visible posts) is removed — TanStack Query's `useInfiniteQuery` manages this.
The infinite scroll sentinel still works exactly as before — it now calls `fetchNextPage` from the query hook instead of incrementing `visible`.

Winner card still appears at the top, but now data comes from `use-winner.ts`.
Writing box behavior is unchanged — it still calls the `onSubmit` handler, which now calls the `submitPost` server function instead of doing a local state update.

After a successful post:
- Invalidate the `wall` query key so the feed refreshes
- The new post appears when the query re-fetches
- No optimistic post insertion for new posts (it's complex and the 400ms re-fetch is fast enough)

---

### `src/routes/duel.tsx` Changes

`MOCK_DUELS[currentIndex]` replaced with the array from `use-duel.ts`.
`readAnsweredDuels()` / `writeAnsweredDuels()` replaced with the hook's answer record.
The "Duels Answered" footer count now reads from the hook's data.

---

### `src/routes/read.tsx` Changes

The Baji Read engine (`computeBajiRead` in `bajiRead.ts`) stays client-side — it computes an archetype from local behavioral signals. This is intentional: it's private personalization that doesn't need to be stored.

However, the inputs change:
- `readMyReactions()` — now comes from the wall query cache, not localStorage
- `readMyEchoes()` — same
- `readAnsweredDuels()` — now comes from the duel hook
- `totalWarmth` — now comes from the sync'd server total via `useWarmth`

The `bonusUnlocked` (spending 30 Warmth for the deeper insight line) gets stored in the profile:
- Spending warmth calls `spendWarmth` client-side AND calls `awardServerWarmth` with a negative amount
- The `bonusUnlocked` flag is saved to `profiles.purchased_items` via `server/functions/warmth.ts`

---

### Seed Data Migration

`src/lib/seedData.ts` contains approximately 200 seed posts (57KB file).
These are inserted into the `unsaids` Supabase table as a one-time operation.

Migration script behavior:
- Reads all entries from `SEED_DATA`
- Maps them to the `unsaids` table schema (adding `device_token = 'seed-device-001'`, `status = 'published'`)
- Inserts in batches of 50 (Supabase has insert limits per request)
- Sets a flag in Supabase (a `app_config` table key-value pair) so the script never runs twice

After migration: `seedData.ts` is deleted and the `server/lib/seed-migration.ts` script is archived.

---

## PHASE 5 — Server-Side Spam + Multi-Tier Moderation

**Who:** Agent.
**Estimated time:** One compact session.
**Prerequisite:** Phase 2 complete.

---

### Why the Client Filter Alone Is Insufficient

The client spam filter in `spamFilter.ts` provides UX feedback — it tells the user immediately
if their post will be rejected. But it runs in the browser, where it can be disabled or
bypassed by anyone who calls the `submitPost` server function directly with a crafted request.

The server must validate everything independently.

---

### The Three-Tier Moderation System

**Tier 1 — Auto-Approve (status: `published`):**
Post passes all spam patterns. No URLs, no phone numbers, no blocking patterns, no word repetition above threshold, minimum word count met. Goes live immediately.

**Tier 2 — Auto-Review (status: `review`):**
Post passes basic patterns but matches secondary patterns: contains Urdu profanity terms, contains phrases commonly used in spam (follow requests, shoutouts, advertising), mentions of usernames that look like handles to off-platform services.
Invisible from feed. Visible in Supabase dashboard to you. You manually set to `published` or `rejected`.

**Tier 3 — Auto-Reject (status: `rejected`):**
Post contains clear violations: phone numbers (all Pakistani formats including international +92, local 03), any URL pattern, script injection attempts. Rejected immediately, never goes to review queue.

---

### Rate Limiting (Server-Enforced)

**Post rate limit:** 3 posts per device_token per 60-minute rolling window.
Implemented as a DB query on `unsaids` — no Redis, no external service.
The window is rolling (not hour-aligned) — every new post pushes the window forward.

**Echo rate limit:** 10 echoes per device per 60-minute window.

**Reaction rate limit:** No per-reaction limit (reactions should feel unlimited). But the `reactions` table's UNIQUE constraint prevents double reactions — no DB spam possible.

**Report rate limit:** A device can only report a post once (enforced by `vetoed_by` array check). A device cannot report more than 10 posts per day (prevents mass-reporting attacks).

---

### The Moderation Dashboard (Supabase as Admin UI)

You review flagged posts directly in the Supabase Table Editor.
Filter `unsaids` by `status = 'review'` to see the queue.
To approve a post: edit the row, set `status = 'published'`.
To reject: set `status = 'rejected'`.

No custom admin UI is built. Supabase's Table Editor is sufficient for this volume.

---

### The `vetoed_by` vs. Separate Reports Table Decision

Storing reporter tokens in an array on the post row is simpler and faster to query than a separate `reports` table. The downside: if you later need to show individual report reasons or reporter history, you'd need to add a table. At current scale, the array is correct.

When `veto_count >= 5`, the DB write also emits a Supabase realtime event
that you could subscribe to from an admin page later. This is a forward-compatible design.

---

## PHASE 6 — Winner Pipeline + Scheduled Scoring

**Who:** Agent for logic. You for one Cloudflare setting.
**Estimated time:** Compact session.
**Prerequisite:** Phase 2 complete.

---

### Why a 12-Hour Cron

Your `CYCLE_MS = 12 * 3600 * 1000` is already defined. The Cloudflare Cron runs at exactly the same interval, aligned to UTC midnight and noon.

Cron expression: `0 0,12 * * *` — fires at 00:00 and 12:00 UTC daily.

---

### Winner Selection Algorithm (Detailed)

The cron function:

1. Determines the start and end timestamps of the just-closed cycle (the 12 hours before the cron fired)
2. Queries `unsaids` for all posts where:
   - `status = 'published'`
   - `created_at` is within the cycle window
   - `is_winner = false` (don't re-crown an existing winner)
3. For each post, computes a score using the existing `scorePost` logic from your `bajihears.ts` (which becomes `server/lib/scoring.ts`):
   - `heart * 2.5` + `fire * 2.0` + `hug * 2.0` + `sad * 1.5` + `echo_count * 4`
   - Decay: the score is multiplied by `0.5^(age_hours / 8)` so newer posts with fewer reactions can still beat old posts with many reactions if the old post has decayed enough
4. Sorts by score descending
5. Takes the top post

6. Updates that post: `is_winner = true`, `winner_cycle = <cycle_start_timestamp>`
7. Generates a "hook line" — currently this is a hardcoded set of rotating phrases (e.g., "This one left everyone speechless.", "The whole wall felt this."). The cron picks one based on the day of the week.
8. Stores the hook line in a new `winner_hook` text column on the `unsaids` table (added during this phase)
9. Calls `push-dispatch.ts` to send push notifications

**Idempotency guard:** At step 1, query if any post already has `is_winner = true` with `winner_cycle` in the current cycle window. If one exists, the cron exits immediately without doing anything. Running the cron twice produces exactly one winner.

**No eligible posts fallback:** If zero posts were published during the cycle, the cron skips winner selection. The previous winner stays displayed until a new one is selected.

---

### `fetchWinner` Server Function Update

After Phase 6, `fetchWinner` queries by `is_winner = true` ordered by `winner_cycle DESC` limit 1.
It returns the `winner_hook` text along with the post object.

The response is cached at the Cloudflare edge for 5 minutes (`Cache-Control: s-maxage=300, stale-while-revalidate=3600`). This means up to 300 simultaneous users can load the page without a single DB read — Cloudflare serves them all from edge cache.

---

### Manual Winner Override

You (the admin) can manually set `is_winner = true` on any post directly in the Supabase Table Editor. Set the `winner_cycle` to the current cycle timestamp. The cron's idempotency check will see this and skip auto-selection for that cycle.

Useful for: curating a particularly meaningful post even if it wasn't the highest-scored.

---

### 🔴 What I need from you for Phase 6

Cloudflare Dashboard → Workers & Pages → your project → Settings → Functions → Cron Triggers.
Add: `0 0,12 * * *`

The trigger calls a Cloudflare Durable Object or a Worker route that your codebase exposes.
Agent will configure the exact route path. You just add the cron expression in the dashboard.

---

## PHASE 7 — Real Push Notification Delivery

**Who:** Agent for code. You for VAPID key generation.
**Estimated time:** Compact session.
**Prerequisite:** Phase 3 complete (push subscriptions need to be linked to profiles).

---

### Current State vs. Target

Currently: `public/sw.js` is registered. `notifications.ts` requests permission. Permission is stored in `localStorage` under `bh:pushPromptShown`. No server receives the subscription. No notification is ever sent.

Target: Subscriptions stored in `profiles.push_subscription`. Cron sends push after winner selection. Service worker shows branded notification.

---

### Step 7-A — VAPID Key Generation

VAPID (Voluntary Application Server Identification) is how web push works securely.
You need a public/private key pair, generated once, used forever.

**How to generate:**
Run `npx web-push generate-vapid-keys` in your terminal (project root directory).
This outputs two long base64 strings: the public key and the private key.

Save them:
- `VAPID_PUBLIC_KEY` → goes into Cloudflare Pages → Settings → Environment Variables (not a secret, safe to be in client JS)
- `VAPID_PRIVATE_KEY` → goes into Cloudflare Pages → Settings → **Secrets** (encrypted, server-only)

> ⚠️ If you lose the private key, all existing subscriptions become invalid and users must re-subscribe.
> Store the private key in your password manager in addition to Cloudflare Secrets.

> 🔴 **What I need from you:** Run the command, then tell me the public key. Keep the private key to yourself and paste it into Cloudflare Secrets.

---

### Step 7-B — Subscription Storage Flow

When the user sees `PushPermissionSheet.tsx` and grants permission:
1. Client calls `requestPushPermission()` (existing in `notifications.ts`) → gets permission
2. Client calls `navigator.serviceWorker.ready` → gets the service worker registration
3. Client calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`
4. This returns a `PushSubscription` object with `endpoint`, `keys.p256dh`, and `keys.auth`
5. Client calls `storePushSubscription` server function with the serialized subscription
6. Server function stores it in `profiles.push_subscription` for the current device_token

For anonymous users (no profile): subscription is stored in a new lightweight table called `anonymous_subscriptions` with `(device_token, push_subscription, created_at)`. This allows sending winner notifications to anonymous users too.

---

### Step 7-C — Notification Content

Every winner selection triggers a push to all subscribers.

Notification payload (defined in `server/jobs/push-dispatch.ts`):
- `title`: `"The new winner is in ✨"`
- `body`: The winning post's text, truncated to 120 characters
- `icon`: `/favicon.png`
- `badge`: `/favicon.png`
- `url`: `/` (opens the wall on tap)
- `tag`: `winner-notification` (prevents stacking multiple notifications if user doesn't clear previous one)

---

### Step 7-D — Updated `public/sw.js`

The service worker gains a `push` event handler. When a push arrives:
1. Parse the notification payload from the push event data
2. Show the notification using `self.registration.showNotification(title, options)`
3. Add a `notificationclick` handler: when user taps notification, open (or focus) the app at `/`

> ⚠️ The service worker file must be at exactly `/sw.js` (public root). Currently it is. Do not move it.
> The SW scope must cover the entire origin (no path prefix). Your current `register('/sw.js')` is correct.

---

## PHASE 8 — Cloudflare Pages Deploy + Smoke Test

**Who:** Agent for config. You for environment variables + testing.
**Estimated time:** 45-60 minutes including your testing.
**Prerequisite:** All prior phases complete.

---

### Build Verification (Before First Deploy)

Agent runs `npm run build` locally and confirms:
- Build exits with code 0
- No TypeScript errors
- No missing imports across the new folder structure
- The `.output/public` directory is populated
- The `.output/server` directory is populated (SSR bundle)

---

### Cloudflare Pages Environment Variables

You add these in the Cloudflare Dashboard → Pages → your project → Settings → Environment Variables.

**Production Variables (plain text, safe to see in build logs):**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
- `VITE_SUPABASE_REDIRECT_URL` — `https://your-project.pages.dev/auth/callback`
- `VAPID_PUBLIC_KEY` — your VAPID public key

**Production Secrets (encrypted, never shown after saving):**
- `SUPABASE_SERVICE_ROLE_KEY` — your service role key
- `VAPID_PRIVATE_KEY` — your VAPID private key

> ⚠️ After adding secrets, you must trigger a new deploy for the Worker to pick them up.
> Change a file → commit → push → Cloudflare auto-deploys.

---

### Post-Deploy Build Verification

Agent checks the Cloudflare Pages deployment log for:
- No build errors
- Worker bundle size under 1MB (Cloudflare free tier limit — your current server bundle is ~1.4MB compressed, agent will split if needed)
- All routes respond (agent makes HTTP requests to the deployed URL)

---

### Your Smoke Test Checklist

Run this on your phone (not desktop — mobile Safari is the real test):

**Anonymous flow:**
- [ ] Open `https://your-project.pages.dev` — BajiIntroSplash plays 3 seconds, transitions to Wall
- [ ] Winner card is visible at top with real post text from DB (not the hardcoded WINNER object)
- [ ] Write a post → submit → loading state appears → post shows in feed within 1-2 seconds
- [ ] React to any post → emoji count changes instantly → does NOT reset on page refresh (server persisted)
- [ ] Add an echo → appears under post → does NOT disappear on refresh
- [ ] Navigate to Duel → vote → see real vote percentages (not simulated)
- [ ] Perform 5 actions → navigate to Read → archetype unlocks
- [ ] Open in a new Incognito tab → can browse, react, post — NO forced sign-in prompt

**Auth flow:**
- [ ] Tap "Sign in with Google" → redirected → Google sign-in screen appears
- [ ] Sign in → redirected back to app → header shows Google avatar + your handle
- [ ] Refresh the page → still logged in (session persisted)
- [ ] Check Supabase dashboard → your profile row exists in `profiles` table
- [ ] Check that warmth total in app matches `warmth_total` in your `profiles` row

**Data integrity:**
- [ ] Open Supabase → Table Editor → `unsaids` → see your test post with `status = 'published'`
- [ ] React to a post → see a row in `reactions` table for your device_token
- [ ] Report a post → see `veto_count` increment in `unsaids` table

**Performance:**
- [ ] Cold load (first visit) — page should be fully interactive in under 3 seconds on mobile data
- [ ] Feed scroll — no jank, smooth 60fps
- [ ] React to a post — UI response in under 100ms (optimistic update)

> 🔴 **What I need from you:** Run this checklist and report any ❌ items.
> Each failure becomes its own targeted fix session.

---

## PHASE 9 — Monitoring, Hardening & Performance Budget

**Who:** Agent.
**Estimated time:** One compact session.
**Prerequisite:** Phase 8 deployed successfully.

---

### Error Tracking Extension

`src/lib/error-capture.ts` and `src/lib/lovable-error-reporting.ts` already exist.

Extended coverage:
- Server function errors are caught and logged to a new `error_log` Supabase table (columns: `timestamp`, `function_name`, `error_code`, `device_token`, `message`). This gives you a query-able error history.
- Client-side React errors (caught by the existing `ErrorComponent` in `__root.tsx`) also log to this table.
- Supabase errors with code `PGRST` (PostgREST network errors) are caught and shown as "Couldn't connect — check your connection" rather than crashing.

---

### Performance Budget (Hard Targets)

These are the standards for a production bulk-audience website:

| Metric | Target | How Achieved |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s on 4G | Edge caching of winner card, font preloading |
| FID / INP (Input delay) | < 100ms | Optimistic updates, reaction debounce |
| CLS (Layout shift) | < 0.1 | Fixed-height skeleton loaders, no layout jumps |
| Bundle size (initial JS) | < 200KB gzip | Lazy-load duel + read routes |
| Time to Interactive | < 3.5s on 4G | SSR from Cloudflare edge, minimal blocking scripts |
| Cold Worker start | < 200ms | Lightweight Worker bundle |

**How lazy loading works:** The `/duel` and `/read` routes are code-split automatically by TanStack Start. Their JavaScript is only downloaded when the user navigates to them. The main Wall (`/`) loads only what it needs.

---

### Cloudflare Cache Strategy

**Winner card:** `Cache-Control: s-maxage=300, stale-while-revalidate=3600`
The winner changes every 12 hours. Caching for 5 minutes at the edge means 99% of visitors
hit edge cache, not the Cloudflare Worker.

**Wall feed:** `Cache-Control: no-store` — feed must always be fresh (new posts appear constantly)

**Static assets (JS/CSS):** `Cache-Control: public, max-age=31536000, immutable` — hashed filenames mean these are safe to cache forever. Vite already handles content hashing.

**Avatar images:** If you ever add user-uploaded avatars, these get `Cache-Control: public, max-age=86400`.

---

### Security Hardening Headers

The Cloudflare Pages project gets a `_headers` file in `.output/public/` that Cloudflare Pages automatically applies:

**Headers to set:**
- `Content-Security-Policy` — restricts which scripts/styles/fonts can load. Allows only: self, Google Fonts, and Supabase endpoint. Blocks inline scripts (except TanStack's nonce-based hydration scripts).
- `X-Frame-Options: DENY` — prevents clickjacking (your app in an iframe)
- `X-Content-Type-Options: nosniff` — prevents MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — privacy-safe referrer
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — explicitly disable hardware access

---

### Database Performance Verification

Agent queries Supabase's built-in Query Performance dashboard (pg_stat_statements) to confirm:
- The wall feed query (`fetchWall`) uses the `(status, created_at DESC)` index (not a seq scan)
- The winner query uses the `(is_winner, winner_cycle)` index
- No query takes more than 100ms at current data volume

If any query shows a sequential scan, agent adds the missing index.

---

### Final Security Checklist (Agent Verifies via MCP)

```
□ RLS enabled on all 6 tables (visible in Supabase dashboard)
□ No VITE_ variable contains service_role key (verify in Cloudflare env vars)
□ Server spam filter is the authoritative validator — client filter is UX only
□ device_token is validated by format regex in server/middleware/ before any query
□ No client can UPDATE another user's profile (RLS + server function auth check)
□ Rate limit is in DB queries, not client state — cannot be bypassed
□ Report threshold enforced in DB transaction — not client localStorage
□ Winner cron is idempotent (double-run safe — verified by testing)
□ Push subscription endpoints are stored in profile rows, not publicly accessible
□ VAPID private key only in Cloudflare Secrets — never in code, never in git
□ .env.local is in .gitignore — never committed
□ No raw SQL queries in server functions — all use Supabase client builder methods (prevents SQL injection)
```

---

# PHASE DEPENDENCY MAP

```
Phase 0 (You, dashboard)
    │
    └─► Phase 1 (Agent, schema via MCP)
              │
              └─► Phase 2 (Agent, server functions)
                        │
                        ├─► Phase 3 (Agent + You, auth)
                        │         │
                        │         └─► Phase 4 (Agent, mock replacement)
                        │                   │
                        │                   └─► Phase 5 (Agent, spam hardening)
                        │
                        └─► Phase 6 (Agent + You, winner cron)
                                  │
                                  └─► Phase 7 (Agent + You, push)
                                            │
                                            └─► Phase 8 (Agent + You, deploy + test)
                                                        │
                                                        └─► Phase 9 (Agent, harden)
```

---

# MASTER "WHAT I NEED FROM YOU" TABLE

| Phase | Step | Your Action | Verification |
|---|---|---|---|
| 0 | A | Create Supabase project in ap-south-1 or Singapore | Project URL is accessible |
| 0 | B | Add Supabase MCP in Antigravity settings | "list tables" returns auth.users |
| 0 | C | Create Cloudflare Pages project, connect GitHub | Pages URL is generated |
| 0 | D | Create Google OAuth credentials in GCP Console | Client ID + Secret in hand |
| 0 | D | Paste Google credentials into Supabase Auth Providers | Google shows as "enabled" in Supabase |
| 0 | E | Fill `.env.local` with your values | Tell me "env is ready" |
| 1 | — | Review tables in Supabase Table Editor | 6 tables, RLS enabled on each |
| 3 | — | Decide on Scenario C behavior (device conflict on 2nd device) | Tell me your preference |
| 6 | — | Add cron trigger `0 0,12 * * *` in Cloudflare Dashboard | Cron shows as "active" |
| 7 | A | Run `npx web-push generate-vapid-keys` in terminal | Tell me the public key, add private to Cloudflare Secrets |
| 8 | — | Add 6 environment variables + 2 secrets to Cloudflare Pages | Build succeeds, variables show as set |
| 8 | — | Run smoke test checklist on your phone | Report any ❌ items |

**Your total dashboard + testing time: approximately 90 minutes across all phases.**
**Every other step: agent does it.**

---

*Last updated: 2026-09-24 · Against commit `8bd417f` · Folder restructure + 9 phases*
