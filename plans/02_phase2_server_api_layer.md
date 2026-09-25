# Phase 2 — Exhaustive Implementation Plan
## Server API Layer — Supabase Client, Rate Limiting, Server Functions, DB Queries
*BajiHears · Bulk client-facing production standard · No code — pure specification*

---

> [!IMPORTANT]
> Phase 2 is entirely server-side. At the end of Phase 2, the app still looks
> identical to the user. All changes are in `src/server/`. The client continues
> using localStorage for now. Phase 4 wires client to server.
>
> Phase 2 builds the complete, hardened, production-ready API layer so that
> Phase 4's client wiring is a thin connection job, not a design job.

---

## What Phase 2 Delivers

At the end of Phase 2:
- Every server function stub (`src/server/functions/*.ts`) is a fully working, tested function
- Every database query module (`src/server/db/*.ts`) issues real, typed Supabase queries
- Rate limiting, device token validation, and spam filtering are all active
- Every function that mutates data does so in a single atomic DB transaction
- The Supabase JS client is fully wired with correct connection pooling for Cloudflare Workers
- A standalone test script verifies every server function against the live Supabase DB

---

## Phase 2 Sub-Phases (Ordered, Sequential)

```
2-A: Supabase Client Factory         ← The foundation all functions depend on
2-B: Database Query Modules          ← The raw DB access layer
2-C: Middleware (Rate Limit + Token) ← The security gate every function passes through
2-D: Server Functions                ← The business logic layer
2-E: End-to-End Verification         ← Confirm everything works against live DB
```

Each sub-phase must be complete and verified before the next begins.
None of them have frontend side-effects — all changes are in `src/server/`.

---

# PHASE 2-A — SUPABASE CLIENT FACTORY

**File:** `src/server/db/client.ts`

**Current state:** Contains shell function signatures returning `null`.
**Goal:** Real, fully working Supabase client factory used by every DB module.

---

## The Two Client Types Required

### Client Type 1 — Admin Client (Service Role)

**When used:** Any operation that must bypass Row-Level Security.
**Examples:**
- Selecting any post regardless of its `status` (moderation queries)
- Updating `profiles.warmth_total` on behalf of any user
- Winner selection cron job writing `is_winner = TRUE` to any post
- Device token migration during Google sign-in

**Security requirement:** The Service Role key MUST NEVER be exposed to the client browser.
It is only read from environment variables on the server.
It is NEVER included in any response payload.
It is NEVER logged.

**Connection mode:** Transaction Pooler (port 6543, pgbouncer) — mandatory for Cloudflare Workers.
Direct connections (port 5432, session mode) are not supported in stateless runtimes.

**Lifecycle:** A new client instance is created per function invocation, not cached globally.
Cloudflare Worker global scope is shared across invocations on the same isolate.
Caching a client in global scope creates a connection leak risk between requests.
A new instance per invocation is the correct pattern for Worker runtimes.

### Client Type 2 — Anon Client (Public Key)

**When used:** Read-only queries where RLS filters what the user sees.
**Examples:**
- Fetching the published wall feed (RLS allows only `status = published`)
- Fetching a single post by ID (RLS allows only published or the author's own)
- Fetching duel options for the active duel

**Security requirement:** The Anon key is safe to use in server functions because
it still goes through RLS. It is different from exposing it directly to the browser
(which is also safe — it is already in `VITE_SUPABASE_ANON_KEY` in `.env.local`).
The difference: in server functions, we control the request context fully.

---

## Environment Variable Handling

The factory reads from an `env` parameter, not from `process.env` directly.
This is mandatory for Cloudflare Workers — Workers do not have a `process.env`.
Environment bindings are passed as the second argument to the Worker `fetch` handler
and threaded through the call chain to every function that needs them.

The exact variables consumed:
- `SUPABASE_URL` — the project URL (`https://qsloqqvdunfuyqqdmgil.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — service role JWT
- `SUPABASE_ANON_KEY` — anon JWT (public)

**Validation at factory time:** If either required key is missing or undefined,
the factory throws an explicit error with the variable name before the Supabase client
is constructed. This prevents cryptic downstream errors when a Worker deploy is missing
a binding.

---

## Connection String vs. JS Client

Phase 2 uses the **Supabase JavaScript client** (`@supabase/supabase-js`) — NOT the
PostgreSQL connection string.

**Reason:** The connection string requires a persistent TCP connection (or pgbouncer session).
The Supabase JS client uses the REST API (PostgREST) over HTTPS — which is stateless and
fully compatible with Cloudflare Workers.

The PostgreSQL connection string (port 6543 Transaction Pooler) is reserved for:
- Direct SQL migrations (running schema files in the Supabase SQL Editor)
- Local dev tools that support PostgreSQL drivers
- The Supabase CLI for schema operations

It is NOT used in the application server code.

---

## Auth Helpers Configuration

The Supabase client is configured with `auth.persistSession: false` and
`auth.detectSessionInUrl: false` in server-side usage.

**Reason:** Server functions do not manage user sessions. They receive a JWT from the
client in the Authorization header, verify it once per request, and use the resulting
`user.id` within the request. There is no session to persist between invocations.
Enabling session detection in a Worker context would attempt to read `window.location`
— which throws because `window` does not exist in a Worker.

---

# PHASE 2-B — DATABASE QUERY MODULES

**Folder:** `src/server/db/`
**Files:** `unsaids.ts`, `profiles.ts`, `reactions.ts`, `echoes.ts`, `duels.ts`

**Current state:** Each file contains one empty export.
**Goal:** Each file exports typed functions that issue real Supabase queries.

These functions are "dumb" — they only talk to the database.
They do not contain rate limiting, spam filtering, or business logic.
That belongs in the server functions layer (Phase 2-D).

---

## Design Rules for All DB Modules

**Rule 1 — Every function returns a typed result, never `any`**
Every query result is mapped to the corresponding type from `src/shared/types/`.
If the shape from the DB does not match the shared type, the mapping happens inside
the DB module, not in the calling code.

**Rule 2 — Every function accepts `env` as its first parameter**
It constructs the Supabase client internally using the factory from 2-A.
The calling code never instantiates a Supabase client directly.

**Rule 3 — Select only needed columns (no `SELECT *`)**
Every `select()` call lists exactly the columns needed for that query.
This reduces payload size, reduces DB CPU for row serialization, and makes
it explicit what data each function depends on.
Exception: Insert and upsert operations may use `select('*')` on the returned row
to get the full newly-created object, since we need all columns after insert.

**Rule 4 — Never throw naked DB errors to callers**
Every DB function wraps its query in a try-catch.
On error, it returns a typed result object: `{ data: null, error: { code, message } }`.
The server function layer interprets the error code and maps it to an HTTP status.
Raw Supabase error objects are never passed to the client.

**Rule 5 — Atomic mutations are single SQL statements, not read-modify-write in JS**
Incrementing a counter is: `UPDATE unsaids SET reactions = jsonb_set(...) WHERE id = $1`
in a single statement. It is NOT: fetch the row, modify in JS, write back.
The single-statement approach is race-condition-safe under concurrent requests.

---

## `src/server/db/unsaids.ts` — Query Specifications

### `fetchPublishedFeed(env, options)`
**Options:** `{ category?: string, limit: number, offset: number }`
**Query logic:**
- Filter: `status = 'published'`
- Filter: if `category` is provided, also filter `category = $category`
- Filter: only rows where `pinned_until IS NULL OR pinned_until <= NOW()` go into the main sort
- Order: pinned posts first (`pinned_until > NOW()` DESC), then `created_at DESC`
- Pagination: LIMIT and OFFSET for cursor-based pagination
- Columns selected: `id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until`
- NOT selected: `device_token`, `vetoed_by`, `profile_id`, `status`, `winner_hook`, `winner_cycle`
  — these are internal fields never sent to the client
**Returns:** Array of typed `FeedPost` objects (a subset of the full `Unsaid` type)

### `fetchWinner(env)`
**Query logic:**
- Filter: `is_winner = TRUE`
- Order: `winner_cycle DESC`
- Limit: 1
- Columns: `id, text, handle, category, preset, reactions, winner_hook, winner_cycle, created_at`
**Returns:** Single `WinnerPost` or null if no winner exists yet

### `fetchPostById(env, id)`
**Query logic:**
- Filter: `id = $id AND status IN ('published', 'review')`
  - `review` posts are shown because the share URL may have been shared before the post was flagged.
  - `rejected` posts return null — the share URL becomes dead.
- Columns: same as `fetchPublishedFeed` — no internal fields
**Returns:** Single `FeedPost` or null

### `insertPost(env, postData)`
**Input:** `{ text, handle, device_token, profile_id, category, preset, status }`
**Query logic:**
- Single `INSERT INTO unsaids (...) VALUES (...) RETURNING id, created_at`
- Uses admin client — bypasses RLS (RLS only applies to SELECT queries; INSERT RLS would also apply
  but admin bypasses all for server-side inserts)
- `status` at insert time is either `'published'` (passed spam filter) or `'review'` (flagged)
**Returns:** `{ id, created_at }` of the newly created post, or error

### `incrementReaction(env, postId, reactionKey)`
**Input:** `postId: UUID`, `reactionKey: 'heart' | 'sad' | 'fire' | 'hug'`
**Query logic:**
- Single atomic `UPDATE` using `jsonb_set` to increment the specific reaction counter
- Uses admin client for the atomic write
- WHERE: `id = $postId AND status = 'published'` — you cannot react to a non-published post
- Confirms that exactly 1 row was affected. If 0 rows affected, returns a "post not found" error.
**Returns:** Updated `reactions` JSONB, or error

### `appendVeto(env, postId, reporterDeviceToken)`
**Input:** `postId: UUID`, `reporterDeviceToken: string`
**Query logic:**
- Pre-check (done in server function layer, not here): reporter is not the author
- Single atomic `UPDATE`:
  - Append `reporterDeviceToken` to `vetoed_by` array: `vetoed_by = array_append(vetoed_by, $token)`
  - Increment `veto_count = veto_count + 1`
  - If `veto_count + 1 >= 5`, also set `status = 'review'` in the same statement
- WHERE: `id = $postId AND NOT ($token = ANY(vetoed_by))` — prevents double-report at the DB level
- The WHERE clause is the atomic deduplication guard. Even if two requests arrive simultaneously,
  only one will match the WHERE condition after the first update removes the token from the eligible set.
**Returns:** Updated `{ veto_count, status }`, or error

### `countDevicePostsInWindow(env, deviceToken, windowMinutes)`
**Input:** `deviceToken: string`, `windowMinutes: number` (default: 60)
**Query logic:**
- `SELECT COUNT(*) FROM unsaids WHERE device_token = $token AND created_at > NOW() - INTERVAL '$windowMinutes minutes'`
- Uses the `(device_token, created_at DESC)` index from Phase 1-B
- Does NOT use admin client — this is a count query with no sensitive data returned
**Returns:** `number` — the count of posts in the window

### `markWinner(env, postId, cycle, hook)`
**Input:** `postId: UUID`, `cycle: TIMESTAMPTZ string`, `hook: string`
**Query logic (called by cron job in Phase 6):**
- Two-step transaction via RPC (or two sequential queries in Phase 2 with idempotency check):
  1. Verify no winner already exists for this `cycle` value (idempotency)
  2. `UPDATE unsaids SET is_winner = TRUE, winner_cycle = $cycle, winner_hook = $hook WHERE id = $postId`
- Uses admin client
**Returns:** `{ success: boolean }`, or error

---

## `src/server/db/profiles.ts` — Query Specifications

### `fetchProfileById(env, userId)`
**Query logic:**
- `SELECT id, handle, avatar_seed, member_since, visit_streak, total_actions, warmth_total, warmth_log, purchased_items, tabs_unlocked FROM profiles WHERE id = $userId`
- NOT selected: `device_token`, `push_subscription` — these are sensitive operational fields
  not needed in normal profile display
**Returns:** Typed `Profile` object, or null

### `fetchProfileByDeviceToken(env, deviceToken)`
**Query logic:**
- `SELECT id, handle FROM profiles WHERE device_token = $token LIMIT 1`
- Uses admin client — device_token is a sensitive internal field
- Called during Google sign-in to find if this device has a prior anonymous profile to merge
**Returns:** `{ id, handle }` or null

### `upsertProfile(env, profileData)`
**Input:** `{ id, handle, avatar_seed, device_token? }`
**Query logic:**
- `INSERT INTO profiles (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`
- On first Google sign-in, creates the profile row
- On subsequent sign-ins, the `DO UPDATE` is a no-op (updates only `updated_at`)
- The `device_token` is set only on first insert — never overwritten after that
**Returns:** `{ id }`, or error

### `incrementWarmth(env, userId, amount, logEntry)`
**Input:** `userId: UUID`, `amount: number`, `logEntry: WarmthLogEntry`
**Query logic:**
- Single atomic `UPDATE`:
  - `warmth_total = warmth_total + $amount`
  - `warmth_log = (SELECT jsonb_agg(entry) FROM (SELECT jsonb_array_elements(warmth_log) UNION ALL VALUES ($logEntry::jsonb) ORDER BY entry->>'timestamp' DESC LIMIT 50) sub)`
  - This single statement appends the new entry, sorts by timestamp DESC, and truncates to 50 in one shot
- WHERE: `id = $userId`
- The 50-entry limit is enforced at the DB level, not in JS
**Returns:** `{ warmth_total, warmth_log }` updated values, or error

### `updateVisitStreak(env, userId)`
**Query logic:**
- Fetch `last_visit` for the user (single SELECT — needed before update logic)
- In the server function layer (not here), calculate: is today a new day? Is the gap < 48 hours?
- This DB function only executes the update: `SET visit_streak = $newStreak, last_visit = CURRENT_DATE WHERE id = $userId`
- The streak calculation logic lives in the server function (`src/server/functions/auth.ts`),
  not in this DB module — DB modules are pure query wrappers
**Returns:** `{ visit_streak, last_visit }`, or error

### `incrementTotalActions(env, userId)`
**Query logic:**
- `UPDATE profiles SET total_actions = total_actions + 1 WHERE id = $userId RETURNING total_actions, tabs_unlocked`
- Returns the new total so the server function can check if a tab should be unlocked
- Tab unlock logic: `total_actions = 3` → set `tabs_unlocked = jsonb_set(tabs_unlocked, '{duel}', 'true')`;
  `total_actions = 5` → set `tabs_unlocked = jsonb_set(tabs_unlocked, '{read}', 'true')`
- Both the increment and the conditional unlock happen in the server function layer (2-D),
  not in this DB module — the DB module only issues the UPDATE
**Returns:** `{ total_actions, tabs_unlocked }`, or error

### `savePushSubscription(env, userId, subscription)`
**Input:** `userId: UUID`, `subscription: { endpoint, keys: { p256dh, auth } }`
**Query logic:**
- `UPDATE profiles SET push_subscription = $subscription WHERE id = $userId`
- Uses admin client — writes to sensitive `push_subscription` column
**Returns:** `{ success: boolean }`, or error

---

## `src/server/db/reactions.ts` — Query Specifications

**Note:** The `reactions` table (if it exists as a separate table) tracks which device
reacted to which post. This is separate from the denormalized counters on `unsaids.reactions`.

### `hasDeviceReacted(env, postId, deviceToken)`
**Query logic:**
- `SELECT 1 FROM reactions WHERE unsaid_id = $postId AND device_token = $token LIMIT 1`
- Returns a boolean — has this device reacted to this post?
- This check is the gate before `incrementReaction` in `db/unsaids.ts`
**Returns:** `boolean`

### `recordReaction(env, postId, deviceToken, reactionKey)`
**Query logic:**
- `INSERT INTO reactions (unsaid_id, device_token, reaction_key) VALUES (...)`
- On conflict (`unsaid_id + device_token` unique constraint), do nothing
- This is the deduplication record — the counter increment in `unsaids.ts` runs simultaneously
**Returns:** `{ success: boolean }`, or error

---

## `src/server/db/echoes.ts` — Query Specifications

### `fetchEchoesForPost(env, postId)`
**Query logic:**
- `SELECT id, text, handle, created_at FROM echoes WHERE unsaid_id = $postId ORDER BY created_at ASC`
- NOT selected: `device_token`, `profile_id` — internal fields
- Ordered ASC (oldest first — conversation chronological order)
- No pagination in Phase 2 — a post is capped at 50 echoes by server function logic
**Returns:** Array of `Echo` objects

### `insertEcho(env, echoData)`
**Input:** `{ unsaid_id, text, handle, device_token, profile_id? }`
**Query logic:**
- Pre-check (in server function layer): count existing echoes for this post; reject if ≥ 50
- `INSERT INTO echoes (...) VALUES (...) RETURNING id, created_at`
- Uses admin client
**Returns:** `{ id, created_at }`, or error

### `countDeviceEchoesInWindow(env, deviceToken, windowMinutes)`
**Query logic:**
- Same pattern as `countDevicePostsInWindow` — rate limiting for echoes
- Window: 10 echoes per 30 minutes per device
**Returns:** `number`

---

## `src/server/db/duels.ts` — Query Specifications

### `fetchActiveDuel(env)`
**Query logic:**
- `SELECT id, format, prompt, option_a, option_b, option_a_count, option_b_count, expires_at FROM duels WHERE is_active = TRUE LIMIT 1`
- `is_active` column (not in Phase 1 schema — see schema addition in Phase 2 below)
**Returns:** Single `Duel` object or null

### `fetchDuelById(env, duelId)`
**Query logic:** Single row select by `id`
**Returns:** Single `Duel` or null

### `recordDuelVote(env, duelId, deviceToken, choice)`
**Input:** `duelId: UUID`, `deviceToken: string`, `choice: 'a' | 'b'`
**Query logic:**
- Two atomic operations in order:
  1. `INSERT INTO duel_votes (duel_id, device_token, choice) VALUES (...)` — fails with unique conflict if already voted
  2. On success: `UPDATE duels SET option_a_count = option_a_count + 1 WHERE id = $duelId` (or `option_b_count`)
- If step 1 fails with unique constraint violation (code `23505`), return "already voted" error
- Steps 1 and 2 are issued as a Postgres transaction (via Supabase RPC or sequential queries within
  the same request — Supabase JS does not support multi-statement transactions directly;
  use a Postgres function called via `supabase.rpc()` for true atomicity here)
**Returns:** `{ choice, option_a_count, option_b_count }`, or error

### `hasDeviceVotedOnDuel(env, duelId, deviceToken)`
**Query logic:**
- `SELECT choice FROM duel_votes WHERE duel_id = $duelId AND device_token = $token LIMIT 1`
**Returns:** `{ voted: boolean, choice?: 'a' | 'b' }`

---

## Schema Addition Required in Phase 2-B

The Phase 1 schema does not include `is_active` on the `duels` table.
This column is required by `fetchActiveDuel`.

**Action:** Run a second migration in the Supabase SQL Editor before Phase 2-B begins.

Migration content (description, not code):
- Add `is_active BOOLEAN NOT NULL DEFAULT FALSE` column to `duels` table
- Create a partial index on `duels (is_active)` WHERE `is_active = TRUE`
  — at most one row has `is_active = TRUE`; the index is tiny and serves the query with zero scan
- Update the existing seed duel rows to set `is_active = TRUE` on exactly one row
- Add a CHECK trigger or application-level convention: only one duel can have `is_active = TRUE`
  (enforced in the server function that activates a new duel, not by a DB constraint)

> [!IMPORTANT]
> You must run this second migration manually in the Supabase SQL Editor.
> The agent will provide the exact SQL. This is the ONLY thing required from you in Phase 2.

---

# PHASE 2-C — MIDDLEWARE

**Folder:** `src/server/middleware/`
**Files:** `rate-limit.ts`, `device-token.ts`

**Current state:** Both files are empty exports.
**Goal:** Fully working middleware functions called at the top of every server function.

---

## `src/server/middleware/device-token.ts`

### Purpose

Every request to the server must carry a device token.
The device token is the identity anchor for anonymous users.
Without it, rate limiting, veto prevention, and reaction deduplication are impossible.

### What a Device Token Is

A 16-character lowercase hexadecimal string generated by `src/client/lib/identity.ts`
on the user's first visit and persisted in localStorage.

Example: `a3f7c8d91b2e4f05`

### Validation Rules

Rule 1 — Token must be present: Requests with no `X-Device-Token` header are rejected with HTTP 400.
Rule 2 — Token must be 16 characters: Checked by string length, not pattern match.
Rule 3 — Token must be hex: Each character must be `0-9` or `a-f`. Upper case is rejected.
Rule 4 — Token is NOT verified against the database: That would be a DB call on every request.
The DB-level `CHECK (char_length(device_token) = 16)` is the final enforcement gate.

### What the Middleware Returns

A parsed, validated `deviceToken: string` that is passed to every DB function and server function.
If validation fails, the middleware throws a structured error that the route handler converts to HTTP 400.

### Where It Is Called

At the top of every server function (2-D), before any DB query is issued.
It is not a Hono/Express middleware — it is a plain function called inline.
This is simpler for Cloudflare Workers that do not use a middleware framework.

---

## `src/server/middleware/rate-limit.ts`

### Philosophy

Rate limiting in Phase 2 is **DB-based**, not Redis/KV-based.
This is intentional for Phase 2. Redis/KV is introduced in Phase 5 (Performance).

**Why DB-based rate limiting is correct for Phase 2:**
- Cloudflare KV is eventually consistent — two Workers may both pass the rate limit check
  if they both read before either writes.
- The DB-based approach queries the actual table (`countDevicePostsInWindow`) — the data
  is already there, and we only need to count it.
- Under Phase 2 expected traffic (< 500 concurrent), DB count queries are fast enough.
- Phase 5 adds KV/Durable Objects for proper distributed rate limiting.

### Rate Limits Defined

| Action              | Limit                     | Window    | Error if exceeded                     |
|---------------------|---------------------------|-----------|---------------------------------------|
| Submit post         | 3 posts                   | 60 minutes| HTTP 429, message: "3 posts per hour" |
| React to post       | 10 reactions (any combo)  | 60 minutes| HTTP 429                              |
| Submit echo         | 10 echoes                 | 30 minutes| HTTP 429                              |
| Report post (veto)  | 5 reports                 | 24 hours  | HTTP 429                              |
| Duel vote           | 1 vote per active duel    | Per duel  | HTTP 409 (not 429 — it's not a rate limit, it's "already voted") |

### The Rate Limit Check Function

`checkRateLimit(env, action, deviceToken)` — called at the top of every mutating server function.

**Internally:**
1. Determines the limit and window for the given `action`
2. Calls the appropriate DB count function (`countDevicePostsInWindow`, etc.)
3. If count >= limit: throws a structured rate limit error
4. If count < limit: returns silently (no return value needed — the absence of an error means "pass")

### Headers Attached to Every Response

Every response includes:
- `X-RateLimit-Limit`: the limit for this action type
- `X-RateLimit-Remaining`: limit minus current count
- `X-RateLimit-Reset`: Unix timestamp when the window resets

These headers allow the client to display a countdown without polling.

---

# PHASE 2-D — SERVER FUNCTIONS

**Folder:** `src/server/functions/`
**Files:** `posts.ts`, `duels.ts`, `warmth.ts`, `auth.ts`, `moderation.ts`, `notifications.ts`

**Current state:** All files are empty exports.
**Goal:** Each file exports fully working, production-ready async functions.

These functions are the single point of entry for all external requests.
They enforce: device token validation → rate limit check → spam check → DB operation → response.

---

## The Standard Function Signature Pattern

Every server function follows the same structure:
1. Extract `deviceToken` from request header, validate via `device-token.ts` middleware
2. Extract and validate request body fields
3. Call `checkRateLimit()` from `rate-limit.ts`
4. Call server-side spam filter if the action involves user-submitted text
5. Issue DB operation(s) via the `src/server/db/` modules
6. Build the response object using only the fields safe to expose
7. Return

Any failure at steps 1–4 returns immediately. Steps 5–7 are only reached if all gates pass.

---

## `src/server/functions/posts.ts`

### `submitPost(env, request)`

**Gate sequence:**
1. Device token: validated (format + presence)
2. Body validation: `text`, `category`, `preset` present; handle optional
3. Text validation:
   - Length: `>= 3, <= 280` (mirrors `MIN_LEN`, `MAX_LEN` from `shared/constants/cycle.ts`)
   - Category: must be one of the 5 valid values from `shared/constants/categories.ts`
   - Preset: must be one of the valid preset keys from `shared/constants/presets.ts`
4. Rate limit: `checkRateLimit(env, 'submit_post', deviceToken)` — 3 per hour
5. Spam filter: `src/server/lib/spam-filter.ts` server copy — same check as client, but authoritative
   - If spam: insert with `status = 'review'` (not rejected — a human reviews it)
   - If clean: insert with `status = 'published'`
6. DB: `db.unsaids.insertPost(...)`
7. DB: If the submitting user is signed in (profile_id present), `db.profiles.incrementTotalActions()`
   and check if a new tab should be unlocked

**Response:**
- Success (201): `{ id, status, created_at }`
- The text and full post are NOT echoed back — the client uses the ID to reference the post
- Failure codes: 400 (validation), 429 (rate limit), 422 (spam — with a generic "didn't pass review" message, not "spam detected")

**Security note on spam response messaging:**
The response for a spam-flagged post says: "Your post is pending review." — NOT "Spam detected."
This prevents adversarial users from tuning their submissions to avoid the exact patterns.
The post IS inserted with `status = 'review'`, so it appears to succeed from the user's perspective.
This is called a "shadow review" pattern — the user thinks it posted, but it is under moderation.

### `fetchFeed(env, request)`

**Gate sequence:** No auth required. No rate limit (reads are unlimited).
1. Query params: `category` (optional), `page` (number, default 0), `limit` (max 20, default 20)
2. `limit` is capped at 20 server-side — client cannot request more than 20 at once
3. DB: `db.unsaids.fetchPublishedFeed({ category, limit, offset: page * limit })`

**Response:**
- Success (200): Array of `FeedPost` objects + `{ total: number, page: number, hasMore: boolean }`
- Feed posts never include `device_token`, `vetoed_by`, `profile_id`, `status`

**Caching intent (Phase 5):**
This response will be cached at the Cloudflare edge for 30 seconds in Phase 5.
No caching in Phase 2 — just the raw DB query.

### `fetchWinner(env, request)`

**Gate sequence:** None required. Fastest path.
1. DB: `db.unsaids.fetchWinner()`
2. If null: return the hardcoded fallback from `src/server/lib/fallback-winner.ts`

**Response:**
- Success (200): Single `WinnerPost` object

**Caching intent (Phase 5):** 5-minute Cloudflare edge cache.

### `reactToPost(env, request)`

**Gate sequence:**
1. Device token: validated
2. Body: `postId` (UUID), `reactionKey` (must be in REACTIONS constant)
3. Rate limit: `checkRateLimit(env, 'react', deviceToken)` — 10 per hour
4. Deduplication: `db.reactions.hasDeviceReacted(env, postId, deviceToken)` — if true, HTTP 409 "Already reacted"
5. DB (two operations):
   a. `db.reactions.recordReaction(env, postId, deviceToken, reactionKey)` — deduplication record
   b. `db.unsaids.incrementReaction(env, postId, reactionKey)` — atomic counter increment
6. If user has a profile: `db.profiles.incrementTotalActions(env, userId)` + tab unlock check

**Response:**
- Success (200): `{ reactions: { heart, sad, fire, hug } }` — updated counters only

**Atomicity note:**
Operations 5a and 5b are not in a single Postgres transaction in Phase 2.
If 5b fails after 5a succeeds, the deduplication record exists but the counter was not incremented.
This means the user cannot react again but their reaction is not counted. This is acceptable —
the failure is rare and the worst case is a missed counter increment, not a double-count.
True transaction safety for these two operations is added in Phase 5 via a Postgres RPC function.

### `fetchPostById(env, request)`

**Gate sequence:** None required.
1. Path param: `id` (UUID format validation)
2. DB: `db.unsaids.fetchPostById(env, id)`
3. If null: 404

**Response:**
- Success (200): Single `FeedPost` object

---

## `src/server/functions/duels.ts`

### `fetchActiveDuel(env, request)`

**Gate sequence:** None. Reads are open.
1. DB: `db.duels.fetchActiveDuel(env)`
2. If the request includes a device token (optional): `db.duels.hasDeviceVotedOnDuel(env, duelId, deviceToken)`
   to include `{ alreadyVoted: boolean, userChoice?: 'a' | 'b' }` in the response

**Response:**
- Success (200): Duel object + optional `{ alreadyVoted, userChoice }`

### `submitDuelVote(env, request)`

**Gate sequence:**
1. Device token: validated (required for votes — cannot vote anonymously)
2. Body: `duelId` (UUID), `choice` (`'a'` or `'b'`)
3. Active duel check: verify the `duelId` matches the currently active duel — prevent voting on expired duels
4. DB: `db.duels.recordDuelVote(env, duelId, deviceToken, choice)`
   - If unique constraint violation (23505): HTTP 409 "Already voted"
5. If user has a profile: `db.profiles.incrementTotalActions(env, userId)` + tab unlock check
6. If user has a profile: `db.profiles.incrementWarmth(env, userId, AWARD_VALUES.duel_vote, logEntry)`

**Response:**
- Success (200): `{ choice, option_a_count, option_b_count }` — the updated vote tallies

---

## `src/server/functions/warmth.ts`

### `claimDailyBonus(env, request)`

**Gate sequence:**
1. Auth required: JWT in Authorization header — only signed-in users can claim daily bonus
2. JWT verification: `supabase.auth.getUser(jwt)` to get `userId`
3. Fetch profile: `db.profiles.fetchProfileById(env, userId)` to check `last_visit`
4. Business logic (in function, not DB module):
   - Is today a new day compared to `last_visit`? If not: HTTP 409 "Already claimed today"
   - If yes: calculate new streak, check streak freeze, build log entry
5. DB: `db.profiles.updateVisitStreak(env, userId, { streak, lastVisit })`
6. DB: `db.profiles.incrementWarmth(env, userId, AWARD_VALUES.daily_visit, logEntry)`

**Response:**
- Success (200): `{ warmth_total, visit_streak, warmth_log_entry }`

### `purchaseStoreItem(env, request)`

**Gate sequence:**
1. Auth required: JWT → userId
2. Body: `itemId` (must be in STORE_ITEMS constant)
3. Fetch profile to get current `warmth_total` and `purchased_items`
4. Check: is `itemId` already in `purchased_items`? If yes: HTTP 409 "Already purchased"
5. Check: is `warmth_total >= item.cost`? If no: HTTP 402 "Insufficient warmth"
6. DB: Single `UPDATE profiles SET warmth_total = warmth_total - $cost, purchased_items = array_append(purchased_items, $itemId) WHERE id = $userId AND warmth_total >= $cost`
   - The `AND warmth_total >= $cost` in the WHERE clause is the atomic guard against a race condition
     where two requests try to purchase simultaneously when there's only enough warmth for one.
   - If 0 rows affected: the warmth was spent between the check and the update → 402 "Insufficient warmth"

**Response:**
- Success (200): `{ warmth_total, purchased_items }`

---

## `src/server/functions/auth.ts`

### `migrateGuestToAccount(env, request)`

**Trigger:** Called by the client immediately after a successful Google OAuth sign-in,
if the user previously interacted as a guest (has a device token in localStorage).

**Gate sequence:**
1. Auth required: JWT (just issued by Supabase OAuth) → `userId`
2. Device token: read from request body (the guest's localStorage token)
3. Check: does a profile already exist for `userId`?
   - Yes: skip migration, return existing profile (user signed in on a device they've used before)
4. Check: does a guest profile exist with this `device_token`?
   - `db.profiles.fetchProfileByDeviceToken(env, deviceToken)`
   - If found: this device had anonymous history — migrate it
   - If not found: fresh Google account — create a new profile

**Migration logic (device history found):**
- The guest profile row is updated: `SET id = $userId` — NOT possible (id is primary key)
- Correct approach: Create a new profile row with `id = $userId`, copy the guest's `handle` and `avatar_seed`,
  set `device_token = $deviceToken`
- Update all `unsaids` where `device_token = $guestDeviceToken`: set `profile_id = $userId`
  (so the user's posts are now linked to their account)
- Update all `echoes` where `device_token = $guestDeviceToken`: set `profile_id = $userId`
- This all runs in a Postgres RPC function for atomicity — these 3 updates must all succeed or all fail

**Response:**
- Success (200): `{ profile }` — the fully hydrated profile for the client to store

### `refreshProfile(env, request)`

**Gate sequence:**
1. Auth required: JWT → userId
2. DB: `db.profiles.fetchProfileById(env, userId)`

**Response:**
- Success (200): Full profile object (used by client on app start to sync state)

---

## `src/server/functions/moderation.ts`

### `reportPost(env, request)`

**Gate sequence:**
1. Device token: validated (reporters must be identifiable)
2. Body: `postId` (UUID)
3. Fetch post's `device_token`: `SELECT device_token FROM unsaids WHERE id = $postId`
4. Check: is reporter's `device_token` === post's `device_token`? If yes: HTTP 403 "Cannot report own post"
5. Rate limit: `checkRateLimit(env, 'report', deviceToken)` — 5 reports per 24 hours
6. DB: `db.unsaids.appendVeto(env, postId, deviceToken)` — atomic array append + counter increment

**Response:**
- Success (200): `{ reported: true }` — no veto count is returned (privacy: users should not see the exact count)

---

## `src/server/functions/notifications.ts`

### `savePushSubscription(env, request)`

**Gate sequence:**
1. Auth required: JWT → userId
2. Body: push subscription object from browser's `PushManager.subscribe()`
3. Validate: object must have `endpoint` (string, HTTPS URL), `keys.p256dh` (string), `keys.auth` (string)
4. DB: `db.profiles.savePushSubscription(env, userId, subscription)`

**Response:**
- Success (200): `{ saved: true }`

**Phase note:** This function is complete in Phase 2, but push dispatch is not implemented
until Phase 7. Subscriptions are saved from Phase 2 so that when Phase 7 activates,
existing users who granted push permission already have subscriptions in the DB.

---

# PHASE 2-E — END-TO-END VERIFICATION

**File:** `src/server/__tests__/phase2.test.ts` (run locally, not deployed)

**Purpose:** A standalone test script that calls every server function against the live
Supabase database to verify correctness before Phase 3 begins.

**What it tests:**

| Test ID | Function             | Verification                                                        |
|---------|----------------------|---------------------------------------------------------------------|
| T-01    | `fetchFeed`          | Returns array; every item has `id, text, category, reactions`      |
| T-02    | `submitPost`         | Inserts post with valid data; returned `id` is UUID; appears in feed |
| T-03    | `submitPost` (spam)  | Spam text inserts with `status = 'review'`; NOT in public feed     |
| T-04    | `submitPost` (rate)  | 4th post in 60 min returns HTTP 429                                |
| T-05    | `reactToPost`        | Increments correct reaction counter by exactly 1                   |
| T-06    | `reactToPost` (dup)  | Second react from same device returns HTTP 409                     |
| T-07    | `fetchWinner`        | Returns an object with `text, winner_hook, winner_cycle`            |
| T-08    | `submitDuelVote`     | Vote recorded; counts update by 1 on correct option               |
| T-09    | `submitDuelVote(dup)`| Second vote returns HTTP 409                                       |
| T-10    | `reportPost`         | `veto_count` increments by 1; after 5 reports, `status = 'review'` |
| T-11    | `reportPost (self)`  | Author reporting own post returns HTTP 403                         |
| T-12    | `device-token (bad)` | 15-char token returns HTTP 400                                     |
| T-13    | `device-token (miss)`| No header returns HTTP 400                                         |

**How it runs:** `node --import tsx src/server/__tests__/phase2.test.ts`
The test script reads from `.env.local` directly. It is never deployed.
Test results are printed to the console. All 13 tests must pass before Phase 3.

---

# What You Need to Provide Before Phase 2 Starts

> [!IMPORTANT]
> The following are the only things the agent cannot do for you. Everything else is automated.

### 1. Confirm Phase 1 Migration Ran Successfully

In your Supabase dashboard → Table Editor, confirm you can see all 6 tables:
- `profiles`
- `unsaids`
- `echoes`
- `reactions`
- `duels`
- `duel_votes`

If any table is missing, the Phase 1 migration did not fully run. Tell the agent which
tables are missing and it will provide the individual CREATE TABLE statement to run.

### 2. Run the Phase 2 Migration (is_active Column)

The agent will provide the exact SQL. You paste it into the Supabase SQL Editor and click Run.
This adds `is_active` to `duels` and seeds one active duel.
Estimated time: 30 seconds.

### 3. Confirm Your `.env.local` has These 3 Values Filled In

```
VITE_SUPABASE_URL=https://qsloqqvdunfuyqqdmgil.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciO...(the anon key you provided)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciO...(the service role key you provided)
```

These are already in your `.env.local` from Phase 1 setup. Just confirm they are there.

That is all. Three confirmations. Then the agent executes Phase 2 autonomously.

---

# File-Level Summary of Phase 2 Changes

```
src/server/db/client.ts          ← Fully wired Supabase client factory (was: stubs)
src/server/db/unsaids.ts         ← 6 query functions (was: empty)
src/server/db/profiles.ts        ← 6 query functions (was: empty)
src/server/db/reactions.ts       ← 2 query functions (was: empty)
src/server/db/echoes.ts          ← 3 query functions (was: empty)
src/server/db/duels.ts           ← 4 query functions (was: empty)
src/server/middleware/rate-limit.ts   ← Full rate limit logic (was: empty)
src/server/middleware/device-token.ts ← Full token validation (was: empty)
src/server/functions/posts.ts    ← 4 functions: submit, fetchFeed, fetchWinner, fetchById
src/server/functions/duels.ts    ← 2 functions: fetchActive, submitVote
src/server/functions/warmth.ts   ← 2 functions: claimDaily, purchaseItem
src/server/functions/auth.ts     ← 2 functions: migrateGuest, refreshProfile
src/server/functions/moderation.ts ← 1 function: reportPost
src/server/functions/notifications.ts ← 1 function: savePushSubscription
src/server/__tests__/phase2.test.ts ← 13-test verification script (new file)
```

**No changes to:**
- `src/client/` — zero changes. Client still uses localStorage.
- `src/shared/` — zero changes. Types already match.
- `src/routes/` — zero changes. Routes still call client functions.
- Database schema (except the Phase 2 migration for `is_active`)

---

# How Phase 2 Connects to Phase 3

Phase 3 is the **Route Handler Layer** — the HTTP endpoints that receive requests from the
client and call these server functions. In Phase 2, the server functions are standalone
async functions with no HTTP routing around them.

Phase 3 wraps each function in a Cloudflare Worker route handler, adds CORS headers,
maps function errors to HTTP status codes, and enables the test script (2-E) to hit real endpoints.

After Phase 3, Phase 4 updates the client to call those HTTP endpoints instead of localStorage.

---

*End of Phase 2 Plan*
*Next: Phase 3 — Route Handler Layer (HTTP endpoints, CORS, error mapping)*
