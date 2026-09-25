# Phase 1 — Exhaustive Implementation Plan
## Folder Restructure + Supabase Schema + Row-Level Security
*BajiHears · Bulk client-facing production standard · No code — pure specification*

---

> [!IMPORTANT]
> Phase 1 has two sequential sub-phases that cannot be swapped:
> **1-A: Folder Restructure** must come first — it defines the import boundaries the schema layer enforces.
> **1-B: Supabase Schema** comes after — it is built to match the types and constants established in 1-A.
> Both are done in a single agent session. You review only at the end.

---

## Prerequisites Before Phase 1 Starts

> [!CAUTION]
> These must be true before Phase 1 begins, or the agent will be blocked mid-session.

- Phase 0 complete: Supabase project exists and is accessible
- MCP is connected and verified (agent has typed "list tables" and got a response)
- `.env.local` file exists with all four required values filled in by you
- `npm run build` currently passes (it does — verified at commit `8bd417f`)

---

# PHASE 1-A — FOLDER RESTRUCTURE

> **Who:** Agent does all file moves.
> **You:** Review the final folder map and confirm imports in `__root.tsx` still resolve.

---

## Why This Comes Before the Schema

The Supabase schema is designed to match your TypeScript types.
The TypeScript types must live in `shared/types/` — a location that both the server DB layer
and the client components can import from without creating circular dependencies.
If you do the schema first and types later, the schema and types will drift.

---

## The Three-Zone Rule (Non-Negotiable)

```
Zone           Folder              Can import from
─────────────────────────────────────────────────
Client         src/client/         shared/, client/
Server         src/server/         shared/          ← ONLY shared, nothing from client/
Shared         src/shared/         nothing           ← zero imports
─────────────────────────────────────────────────
Routes         src/routes/         client/, shared/, server/functions/ only
```

If `src/server/` imports anything from `src/client/`, the Cloudflare Worker build will fail
because `window`, `localStorage`, and `navigator` do not exist in the Worker runtime.
This rule is enforced by the physical folder separation — a wrong import throws a build error,
not a silent runtime crash.

---

## Path Alias Update (Must Happen in `tsconfig.json` and `vite.config.ts`)

Currently your codebase uses the `@/` alias pointing to `src/`.
This remains unchanged. All existing `@/lib/`, `@/components/` imports are updated
to the new paths as files are moved. No alias is added or removed — only import paths update.

The `@/` alias continues to point to `src/`. The new paths become:
- `@/client/components/bajihears/UnsaidCard` instead of `@/components/bajihears/UnsaidCard`
- `@/shared/types/unsaid` instead of `@/lib/bajihears` for type imports
- `@/server/functions/posts` for server function calls from routes

---

## Exact File Migration Map

### Group 1 — Files That Move Intact (No Content Change)

These files are relocated without touching their internal code.
Only their import paths change in other files that reference them.

| Current Location | New Location | Reason |
|---|---|---|
| `src/components/bajihears/BajiIntroSplash.tsx` | `src/client/components/bajihears/BajiIntroSplash.tsx` | UI-only component |
| `src/components/bajihears/BajiMascot.tsx` | `src/client/components/bajihears/BajiMascot.tsx` | UI-only component |
| `src/components/bajihears/BajiReadCard.tsx` | `src/client/components/bajihears/BajiReadCard.tsx` | UI-only component |
| `src/components/bajihears/BajiReadLockedCard.tsx` | `src/client/components/bajihears/BajiReadLockedCard.tsx` | UI-only component |
| `src/components/bajihears/BajiReadShareDialog.tsx` | `src/client/components/bajihears/BajiReadShareDialog.tsx` | UI-only component |
| `src/components/bajihears/BottomNav.tsx` | `src/client/components/bajihears/BottomNav.tsx` | UI-only component |
| `src/components/bajihears/CommunityRegulars.tsx` | `src/client/components/bajihears/CommunityRegulars.tsx` | UI-only component |
| `src/components/bajihears/CornerAvatar.tsx` | `src/client/components/bajihears/CornerAvatar.tsx` | UI-only component |
| `src/components/bajihears/CornerMenu.tsx` | `src/client/components/bajihears/CornerMenu.tsx` | UI-only component |
| `src/components/bajihears/DuelCard.tsx` | `src/client/components/bajihears/DuelCard.tsx` | UI-only component |
| `src/components/bajihears/FeedSkeleton.tsx` | `src/client/components/bajihears/FeedSkeleton.tsx` | UI-only component |
| `src/components/bajihears/FeedWritingPrompt.tsx` | `src/client/components/bajihears/FeedWritingPrompt.tsx` | UI-only component |
| `src/components/bajihears/GiftMilestone.tsx` | `src/client/components/bajihears/GiftMilestone.tsx` | UI-only component |
| `src/components/bajihears/Logo.tsx` | `src/client/components/bajihears/Logo.tsx` | UI-only component |
| `src/components/bajihears/PushPermissionSheet.tsx` | `src/client/components/bajihears/PushPermissionSheet.tsx` | UI-only component |
| `src/components/bajihears/QuoteCardDialog.tsx` | `src/client/components/bajihears/QuoteCardDialog.tsx` | UI-only component |
| `src/components/bajihears/RevealCountdown.tsx` | `src/client/components/bajihears/RevealCountdown.tsx` | UI-only component |
| `src/components/bajihears/TopGivers.tsx` | `src/client/components/bajihears/TopGivers.tsx` | UI-only component |
| `src/components/bajihears/UnsaidCard.tsx` | `src/client/components/bajihears/UnsaidCard.tsx` | UI-only component |
| `src/components/bajihears/WarmthOrb.tsx` | `src/client/components/bajihears/WarmthOrb.tsx` | UI-only component |
| `src/components/bajihears/WarmthSheet.tsx` | `src/client/components/bajihears/WarmthSheet.tsx` | UI-only component |
| `src/components/bajihears/WarmthStore.tsx` | `src/client/components/bajihears/WarmthStore.tsx` | UI-only component |
| `src/components/bajihears/WarmthToast.tsx` | `src/client/components/bajihears/WarmthToast.tsx` | UI-only component |
| `src/components/bajihears/WritingBox.tsx` | `src/client/components/bajihears/WritingBox.tsx` | UI-only component |
| `src/hooks/use-mobile.tsx` | `src/client/hooks/use-mobile.tsx` | Client hook, uses window resize |
| `src/lib/haptics.ts` | `src/client/lib/haptics.ts` | Browser API — `navigator.vibrate` |
| `src/lib/bajiRead.ts` | `src/client/lib/bajiRead.ts` | Client-side personality engine — uses localStorage signals |
| `src/lib/notifications.ts` | `src/client/lib/notifications.ts` | Browser APIs — `navigator.serviceWorker`, `Notification` |
| `src/styles.css` | `src/client/styles/styles.css` | CSS assets belong in client zone |
| `src/lib/error-capture.ts` | `src/client/lib/error-capture.ts` | Client-side error reporting |
| `src/lib/lovable-error-reporting.ts` | `src/client/lib/lovable-error-reporting.ts` | Client-side reporting |
| `src/lib/utils.ts` | `src/shared/utils.ts` | `cn()` utility — used by both zones |

---

### Group 2 — Files That Split Into Multiple Destinations

These files currently mix client, server, and shared concerns.
They are split — parts go to different destinations, the original file is deleted.

---

#### `src/lib/bajihears.ts` (664 lines) → Splits into 8 destinations

This is the largest split. Current file contains: mock data, types, localStorage helpers,
scoring algorithm, formatting utilities, warmth extensions, duel types, and constants.

| Content | New Location | Reason |
|---|---|---|
| `ReactionKey` type | `src/shared/types/unsaid.ts` | Pure type, used by both client components and server functions |
| `REACTIONS` array | `src/shared/constants/reactions.ts` | Pure constant, needs same values in both client (emoji display) and server (validation) |
| `CATEGORIES` const + `Category` type | `src/shared/types/unsaid.ts` and `src/shared/constants/categories.ts` | Type used by DB schema; constant used by server (CHECK constraint validation) and client (filter chips) |
| `Preset` type, `PRESETS`, `EXCLUSIVE_PRESETS`, `presetByKey()` | `src/shared/types/unsaid.ts` and `src/shared/constants/presets.ts` | Type needed on server for validation; constants needed on client for card rendering |
| `Echo` type, `Unsaid` type | `src/shared/types/unsaid.ts` | These are the core data contracts shared by DB layer and UI components |
| `WINNER` hardcoded object | `src/server/lib/fallback-winner.ts` | Server fallback only — clients never reference this directly |
| `MOCK_UNSAIDS` array | **DELETED** | Replaced by real DB data in Phase 4 |
| `MAX_LEN = 280`, `MIN_LEN = 3`, `CYCLE_MS`, `LOCKOUT_MS` | `src/shared/constants/cycle.ts` | Referenced by both server validation and client character counter |
| `nextRevealAt()` function | `src/shared/utils.ts` | Pure calculation, no side effects |
| localStorage key constants (`SUBMIT_KEY`, `REACT_KEY`, etc.) | `src/client/lib/local-storage.ts` | Browser-only persistence helpers |
| `readLastSubmit`, `writeLastSubmit`, `clearLastSubmit`, all `read*` / `write*` functions | `src/client/lib/local-storage.ts` | localStorage wrappers — client-only |
| `readUnsaids`, `writeUnsaids`, `initializeWall` | **DELETED** | These served the mock wall. Real data comes from server in Phase 4 |
| `scorePost()`, `getSortedFeed()` | `src/server/lib/scoring.ts` | Scoring runs on the server for winner selection. Kept in client until Phase 4 only for current wall sort — will be removed from client in Phase 4 |
| `getWinner()` (the localStorage-cached version) | **DELETED in Phase 4** | Replaced by `fetchWinner` server function |
| `generateShareCode()`, `buildShareUrl()` | `src/shared/utils.ts` | Pure functions, no side effects |
| `vetoPost()` (the localStorage version) | **DELETED in Phase 4** | Replaced by `reportPost` server function |
| `relativeTime()`, `formatCountdown()`, `formatShortCountdown()`, `compactCount()`, `stripHandle()`, `getInstagramUrl()` | `src/shared/utils.ts` | Pure formatting, no side effects, safe in both zones |
| `ActionType`, `WarmthLogEntry` | `src/shared/types/warmth.ts` | Shared type definition |
| `DuelFormat`, `DuelOption`, `Duel` types | `src/shared/types/duel.ts` | DB schema mirrors these types |
| `MOCK_DUELS` array | **DELETED** | Replaced by real DB data in Phase 4 |
| Warmth localStorage keys + all `readWarmth`, `writeWarmth`, etc. | `src/client/lib/local-storage.ts` | localStorage wrappers — client-only |
| `DailyCapState`, `StreakState` interfaces | `src/shared/types/warmth.ts` | Shared — server will compute these in Phase 4 |
| `AnsweredDuelRecord` type | `src/shared/types/duel.ts` | Shared type |
| `readAnsweredDuels`, `writeAnsweredDuels` | `src/client/lib/local-storage.ts` | localStorage wrappers |
| `readMyPostCategories`, `appendMyPostCategory` | `src/client/lib/local-storage.ts` | localStorage wrappers |
| `randomSeed()` | `src/shared/utils.ts` | Pure function |

---

#### `src/lib/warmth.ts` (214 lines) → Splits into 3 destinations

| Content | New Location | Reason |
|---|---|---|
| `TierKey`, `TierInfo` types | `src/shared/types/warmth.ts` | Used by client tier display AND server warmth calculation |
| `TIERS` array | `src/shared/constants/warmth.ts` | Needed by client for tier display AND server for validating warmth milestones |
| `getTier()`, `getNextTier()` functions | `src/shared/utils.ts` | Pure calculations, no side effects |
| `ActionType` (duplicate — merge with bajihears.ts version) | `src/shared/types/warmth.ts` | One definition only |
| `AWARD_VALUES` record | `src/shared/constants/warmth.ts` | Server awards warmth using these values |
| `DAILY_PASSIVE_CAP` | `src/shared/constants/warmth.ts` | Both client (cap display) and server (enforcement) |
| `GiftMilestone` interface, `GIFT_MILESTONES` array | `src/shared/constants/warmth.ts` and `src/shared/types/warmth.ts` | Shared |
| `generateClaimCode()` | `src/shared/utils.ts` | Pure function |
| `generateSplit()` | **DELETED** | Replaced by real DB vote counts in Phase 4 |
| `getTodayKey()` | `src/shared/utils.ts` | Pure date utility |
| `claimDailyBonus()` | `src/server/functions/warmth.ts` | Server-side claim — must be server-enforced in Phase 4. For now, kept in client until Phase 4 migration. Mark with `// PHASE4: move to server` comment |

---

#### `src/lib/warmth-context.tsx` (261 lines) → Moves intact + minor path updates

The entire file moves to `src/client/stores/warmth-context.tsx`.
Internal imports update to new paths (e.g., `@/shared/types/warmth` instead of `@/lib/warmth`).
No logic changes yet. Changes come in Phase 4 when server sync is added.

---

#### `src/lib/identity.ts` (653 lines) → Splits into 2 destinations

| Content | New Location | Reason |
|---|---|---|
| `BajiIdentity` type | `src/shared/types/profile.ts` | DB `profiles` table mirrors this type |
| `STREAK_MILESTONES` array | `src/shared/constants/identity.ts` | Shared constant for display and server evaluation |
| `PREFIXES` and `SUFFIXES` arrays | `src/client/lib/identity.ts` | Used only for client-side handle generation. Server doesn't need to generate handles. |
| `getOrCreateIdentity()`, `updateVisitStreak()`, `generateHandle()`, all identity localStorage functions | `src/client/lib/identity.ts` | All use localStorage — client-only. In Phase 4, server functions take over streak tracking |

---

#### `src/lib/spamFilter.ts` (98 lines) → Copied to two locations

The file is duplicated, NOT moved. Both versions are kept in sync.

| Copy | Location | Reason |
|---|---|---|
| Client copy | `src/client/lib/spam-filter.ts` | Provides immediate UX feedback before the user submits |
| Server copy | `src/server/lib/spam-filter.ts` | Enforced validation — cannot be bypassed |

The server version may have additional patterns not present in the client version.
Client version catches obvious violations. Server version is the final authority.

**Important:** When you add a new pattern, add it to BOTH files. Mark them with
`// MIRROR: keep this in sync with server/lib/spam-filter.ts` and
`// MIRROR: keep this in sync with client/lib/spam-filter.ts` respectively.

---

#### `src/lib/warmthStore.ts` (113 lines) → Splits into 2 destinations

| Content | New Location | Reason |
|---|---|---|
| `StoreItemCategory`, `StoreItemAction`, `StoreItem` types | `src/shared/types/warmth.ts` | Server validates purchases using these types |
| `STORE_ITEMS` array | `src/shared/constants/warmth.ts` | Server needs item cost and action to validate purchases |
| `getPurchasedItems()`, `hasPurchasedItem()`, `recordPurchase()` | `src/client/lib/local-storage.ts` | localStorage wrappers — client-only until Phase 4 when these move to the server |

---

### Group 3 — Files That Move to Server (New Files Only — No Content Yet)

These files do not exist yet. Their presence in `src/server/` is established in Phase 1
so imports from future phases resolve correctly. They contain only empty exports with comments.

| New File | Purpose |
|---|---|
| `src/server/db/client.ts` | Supabase admin + anon client factory |
| `src/server/db/unsaids.ts` | DB query functions for `unsaids` table |
| `src/server/db/profiles.ts` | DB query functions for `profiles` table |
| `src/server/db/reactions.ts` | DB query functions for `reactions` table |
| `src/server/db/echoes.ts` | DB query functions for `echoes` table |
| `src/server/db/duels.ts` | DB query functions for `duels` and `duel_votes` tables |
| `src/server/functions/posts.ts` | Server functions for wall posts |
| `src/server/functions/duels.ts` | Server functions for duels |
| `src/server/functions/warmth.ts` | Server functions for warmth persistence |
| `src/server/functions/auth.ts` | Server functions for account migration |
| `src/server/functions/moderation.ts` | Server functions for reports |
| `src/server/functions/notifications.ts` | Server functions for push subscriptions |
| `src/server/lib/spam-filter.ts` | Server-side spam filter (copy from client) |
| `src/server/lib/scoring.ts` | Post scoring algorithm (copy from `bajihears.ts`) |
| `src/server/lib/fallback-winner.ts` | Hardcoded `WINNER` object from `bajihears.ts` |
| `src/server/lib/vapid.ts` | VAPID push wrapper (empty until Phase 7) |
| `src/server/jobs/winner-selection.ts` | 12h cron handler (empty until Phase 6) |
| `src/server/jobs/push-dispatch.ts` | Push batch sender (empty until Phase 7) |
| `src/server/middleware/rate-limit.ts` | Rate limit helpers (empty until Phase 2) |
| `src/server/middleware/device-token.ts` | Token validation (empty until Phase 2) |

---

### Group 4 — Files That Stay Exactly Where They Are

These files are not touched during Phase 1-A.

| File | Why It Stays |
|---|---|
| `src/routes/__root.tsx` | TanStack requires this exact location |
| `src/routes/index.tsx` | TanStack requires this exact location |
| `src/routes/duel.tsx` | TanStack requires this exact location |
| `src/routes/read.tsx` | TanStack requires this exact location |
| `src/routes/corner.tsx` | TanStack requires this exact location |
| `src/router.tsx` | TanStack entry — must stay in `src/` |
| `src/server.ts` | Cloudflare Worker entry — must stay in `src/` |
| `src/start.ts` | TanStack middleware entry — must stay in `src/` |
| `src/routeTree.gen.ts` | Auto-generated by TanStack — never manually edit |
| `public/sw.js` | Service worker must be at the public root |
| `public/favicon.png` | Static asset |
| `vite.config.ts` | Build config |
| `package.json` | Package manifest |
| `.prettierrc` | Formatter config |
| `.env.local` | Secrets — never moved, never committed |

---

### The Import Chain After Restructure

Every import in every route file updates to the new paths.
The route files are the junction — they import from both client and server zones.

Example of what changes in `src/routes/index.tsx`:
- `@/components/bajihears/UnsaidCard` → `@/client/components/bajihears/UnsaidCard`
- `@/lib/bajihears` (for types) → `@/shared/types/unsaid` and `@/shared/constants/categories`
- `@/lib/warmth-context` → `@/client/stores/warmth-context`
- `@/lib/haptics` → `@/client/lib/haptics`

Same pattern for all four route files.
`__root.tsx` updates imports for warmth-context, identity, and bajihears.

---

### Post-Restructure Build Verification

After all moves and import updates, the agent runs `npm run build`.
Build must exit with code 0 with zero TypeScript errors before Phase 1-B begins.
If any import resolves to a path that no longer exists, the build fails with a clear error
identifying the broken import path. Every broken import is fixed before proceeding.

---

### What You Do After Phase 1-A

Open VS Code and spot-check one thing:
In `src/routes/index.tsx`, confirm the imports at the top of the file all point to `@/client/`
or `@/shared/` paths. If you see any `@/components/` or `@/lib/` import still there, tell the agent.

That's it. No other review needed from you for 1-A.

---

# PHASE 1-B — SUPABASE SCHEMA DESIGN & EXECUTION

> **Who:** Agent via MCP connection.
> **You:** Review tables in Supabase dashboard after agent says done.
> **Prerequisite:** Phase 1-A complete and build passes.

---

## Database Design Principles for Bulk Traffic

Before specifying individual tables, these principles govern every design decision:

**Principle 1 — Denormalized Counters**
Reaction counts, vote counts, echo counts are stored directly on the parent row as integers (or JSONB).
This means a read of a post returns its counts in zero joins.
The downside is that updates must be atomic (a single `UPDATE ... SET count = count + 1`).
At bulk traffic scale, avoiding joins on the hot read path is more important than strict normalization.

**Principle 2 — UUID Primary Keys (Not Sequential)**
All public-facing IDs use `gen_random_uuid()`, not `BIGSERIAL`.
Sequential IDs leak your post volume (post #4201 tells the world you have 4200 posts).
UUIDs are opaque. This is a security property, not just a style choice.

**Principle 3 — TEXT + CHECK Over VARCHAR**
Postgres internally handles `TEXT` and `VARCHAR(n)` identically for short strings.
`TEXT` with a `CHECK (char_length(text) <= 280)` is clearer and more flexible than `VARCHAR(280)`.
The CHECK constraint can be modified by a migration; VARCHAR length requires a table rewrite in some cases.

**Principle 4 — TIMESTAMPTZ Everywhere**
Never use `TIMESTAMP WITHOUT TIME ZONE`. Your audience is in Pakistan (UTC+5).
Supabase dashboard, cron jobs, and client displays all convert from UTC automatically if you use TIMESTAMPTZ.
Using plain TIMESTAMP causes timezone bugs that are extremely difficult to diagnose in production.

**Principle 5 — JSONB Over JSON**
`JSONB` is stored in binary format. Reads are faster. It can be indexed with GIN indexes.
`JSON` is stored as a plain string — faster writes, slower reads, no indexing.
For BajiHears's read-heavy workload, JSONB is always correct.

**Principle 6 — Indexes Are Designed Around Query Patterns, Not Columns**
Every index is created because a specific query pattern requires it.
Indexes that don't serve a known query pattern are not created — they slow down writes.

**Principle 7 — Foreign Keys With Correct Cascade Rules**
Every foreign key explicitly states its cascade behavior.
`ON DELETE CASCADE`: child rows automatically deleted when parent is deleted. Used for: echoes on post delete, reactions on post delete, duel_votes on duel delete.
`ON DELETE SET NULL`: parent reference is nulled, child row survives. Used for: profile_id on posts/echoes — if a user deletes their Google account, their posts remain as anonymous.
`ON DELETE RESTRICT`: deletion blocked if children exist. Not used in this schema — users and posts must be deletable.

**Principle 8 — Connection Pooling Mode**
Cloudflare Workers are stateless — each function invocation is a new process.
Direct database connections (port 5432, session mode) stay open for the lifetime of a session.
Workers cannot keep sessions alive. They must use the **Transaction Pooler** (port 6543, pgbouncer mode).
This is configured in the Supabase connection string. All server DB clients use the Transaction Pooler URI.

---

## Execution Order (Dependency Graph)

Tables must be created in this exact sequence because of foreign key dependencies:

```
Step 1: auth.users     ← Already exists (Supabase built-in). Never modify it.
Step 2: profiles       ← References auth.users
Step 3: unsaids        ← References profiles (nullable)
Step 4: echoes         ← References unsaids, profiles (both nullable)
Step 5: reactions      ← References unsaids (required)
Step 6: duels          ← References nothing — standalone
Step 7: duel_votes     ← References duels (required)
Step 8: Triggers       ← Applied after all tables exist
Step 9: RLS Policies   ← Applied after all tables exist
Step 10: Indexes        ← Applied after RLS (indexes are not affected by RLS)
Step 11: Seed Duels    ← Insert MOCK_DUELS data into duels table
```

---

## Trigger Function — `set_updated_at`

Before any tables are created, one reusable trigger function is created.
This function is created once in the `public` schema and reused by multiple tables.

**What it does:** On any `UPDATE` operation to any row in any table that has this trigger attached,
automatically sets the `updated_at` column to `NOW()` before the row is written.

**Why it matters:** Without this, `updated_at` is only as accurate as the application setting it.
If a server function forgets to set it, the column goes stale. The DB-level trigger is automatic
and cannot be forgotten.

**Applied to:** `profiles` and `unsaids`. Not applied to `echoes`, `reactions`, `duel_votes` —
those are append-only records that are never updated.

---

## Table 1 — `profiles`

**Purpose:** One row per signed-in Google user. Also serves as the persistence store for
a device's identity once a guest converts to an account.

### Column Specifications

**`id` — UUID, Primary Key, Foreign Key to `auth.users(id)`**
- Type: `UUID`
- Default: none (must be provided)
- Not null: yes
- Constraint: `REFERENCES auth.users(id) ON DELETE CASCADE`
- Rationale: `id` is not auto-generated because it must equal the Supabase Auth user ID.
  When `supabase.auth.signInWithOAuth` creates a user in `auth.users`, that user's UUID
  must be used as the `profiles.id`. This creates a one-to-one link.
  `ON DELETE CASCADE`: if a user deletes their Google account (or is removed by admin),
  their profile row is automatically deleted. Their posts are not deleted because `profile_id`
  on `unsaids` has `ON DELETE SET NULL`.

**`handle` — TEXT, Unique, Not Null**
- Type: `TEXT`
- Default: none (generated by server function at insert time from PREFIXES/SUFFIXES logic)
- Not null: yes
- Constraint: `UNIQUE`, `CHECK (char_length(handle) >= 3 AND char_length(handle) <= 40)`
- Rationale: Handles must be globally unique across all users. The `UNIQUE` constraint is the
  authoritative deduplication mechanism — the application layer checks uniqueness by catching
  the unique constraint violation error code `23505`, not by querying first (which has a race condition).
  Length 3–40: minimum 3 prevents single-character handles, maximum 40 matches Instagram's limit.

**`avatar_seed` — INTEGER, Not Null**
- Type: `INTEGER`
- Default: `1`
- Not null: yes
- Constraint: `CHECK (avatar_seed >= 1 AND avatar_seed <= 500)`
- Rationale: An integer that maps to a pre-generated avatar from a set of 500.
  Storing an integer (4 bytes) instead of an image URL string (50–200 bytes) keeps the row small.
  The client reconstructs the avatar from the seed number.
  500 seeds gives enough variety for expected user count.

**`member_since` — DATE, Not Null**
- Type: `DATE` (not `TIMESTAMPTZ` — precision of day is sufficient)
- Default: `CURRENT_DATE`
- Not null: yes
- Rationale: Displayed to users as "Member since January 2025". Day precision is correct.
  Using `DATE` not `TIMESTAMPTZ` saves 4 bytes per row and avoids timezone display confusion.
  Set once at insert, never updated (trigger does not touch this column).

**`device_token` — TEXT, Unique, Nullable**
- Type: `TEXT`
- Default: `NULL`
- Not null: no (nullable)
- Constraint: `UNIQUE` (but unique does not apply to NULL — multiple NULLs are allowed)
- Rationale: The 16-character hex token from `identity.ts`. Nullable because a brand-new
  Google account with no prior anonymous use has no device token.
  Set by `migrateGuestToAccount` server function during first sign-in.
  The UNIQUE constraint prevents two profiles from claiming the same token.
  Postgres's UNIQUE constraint treats NULL as a distinct value — multiple NULL rows are allowed.
  This is correct behavior: multiple users without prior anonymous use can all have `NULL`.

**`visit_streak` — INTEGER, Not Null**
- Type: `INTEGER`
- Default: `0`
- Not null: yes
- Constraint: `CHECK (visit_streak >= 0)`
- Rationale: Consecutive daily visit count. The server function `updateVisitStreak` increments this
  when a user visits on a new day. Resets to 1 (not 0) when gap exceeds 48 hours.
  Minimum 0 prevents negative streaks from any arithmetic bug.

**`last_visit` — DATE, Nullable**
- Type: `DATE`
- Default: `NULL`
- Not null: no
- Rationale: The date of the user's most recent visit, used to calculate streak continuity.
  NULL means the user has never visited (account just created via a mechanism other than direct app visit).

**`streak_freeze_used` — BOOLEAN, Not Null**
- Type: `BOOLEAN`
- Default: `FALSE`
- Not null: yes
- Rationale: Whether the user's one-time streak freeze has been used.
  Once set to TRUE, the server function will not protect the streak again on a missed day.
  Simple boolean — no timestamp needed.

**`total_actions` — INTEGER, Not Null**
- Type: `INTEGER`
- Default: `0`
- Not null: yes
- Constraint: `CHECK (total_actions >= 0)`
- Rationale: Incremented by every meaningful action (reaction, echo, post, duel vote).
  Used to gate tab unlocks: `duel` tab unlocks at 3, `read` tab at 5.
  Server function increments this atomically in the same transaction as the action.

**`warmth_total` — INTEGER, Not Null**
- Type: `INTEGER` (not `BIGINT` — warmth values are bounded by milestones, max meaningful value ~10,000)
- Default: `0`
- Not null: yes
- Constraint: `CHECK (warmth_total >= 0)`
- Rationale: The running total of warmth points. Never decremented (spending warmth is tracked
  separately in the log). `CHECK >= 0` prevents underflow bugs.

**`warmth_log` — JSONB, Not Null**
- Type: `JSONB`
- Default: `'[]'::jsonb`
- Not null: yes
- Rationale: Array of the last 50 warmth events. Structure of each entry:
  `{id: string, action: string, amount: number, label: string, timestamp: number}`.
  This mirrors the `WarmthLogEntry` type in `shared/types/warmth.ts` exactly.
  Capped at 50 entries — server function trims oldest entries when appending.
  JSONB allows the client to display event history without a separate query to a log table.
  50 entries × ~80 bytes each = ~4KB per profile — acceptable row size.
  If the log grows beyond 50, the oldest entries are removed.

**`purchased_items` — TEXT[], Not Null**
- Type: `TEXT[]` (Postgres native array)
- Default: `'{}'::text[]`
- Not null: yes
- Rationale: Array of store item ID strings the user has purchased. e.g., `{deep_read, aurora_preset}`.
  Using a native array instead of a JSONB array because these are simple string values with no
  additional properties. Native arrays are simpler to query (`item = ANY(purchased_items)`)
  and have better index support (`GIN` index if needed).

**`tabs_unlocked` — JSONB, Not Null**
- Type: `JSONB`
- Default: `'{"duel": false, "read": false}'::jsonb`
- Not null: yes
- Rationale: Tracks which navigation tabs have been unlocked. JSONB allows adding new tabs
  (e.g., a future "Corner Plus" tab) without a schema migration. Simple boolean values per key.

**`push_subscription` — JSONB, Nullable**
- Type: `JSONB`
- Default: `NULL`
- Not null: no
- Rationale: The complete serialized Web Push `PushSubscription` object.
  Structure: `{endpoint: string, keys: {p256dh: string, auth: string}}`.
  NULL means the user has not granted push permission or it was revoked.
  JSONB stored because the structure is fixed by the Web Push spec — no need to normalize.

**`created_at` — TIMESTAMPTZ, Not Null**
- Type: `TIMESTAMPTZ`
- Default: `NOW()`
- Not null: yes

**`updated_at` — TIMESTAMPTZ, Not Null**
- Type: `TIMESTAMPTZ`
- Default: `NOW()`
- Not null: yes
- Rationale: Auto-updated by the `set_updated_at` trigger on every UPDATE operation.

### Profile Table Indexes

- Primary key index on `id` — automatically created by Postgres
- Unique index on `handle` — for uniqueness enforcement and handle lookup queries
- Unique index on `device_token` — for `migrateGuestToAccount` lookup and uniqueness enforcement
- Index on `warmth_total DESC` — for the Community Regulars leaderboard query (top 10 warmth holders)

---

## Table 2 — `unsaids`

**Purpose:** Every post submitted to The Wall.
This is the most-read table in the entire database.
The design is heavily optimized for read performance.

### Column Specifications

**`id` — UUID, Primary Key**
- Type: `UUID`
- Default: `gen_random_uuid()`
- Not null: yes
- Rationale: UUID is the public-facing ID. It appears in share URLs (`bajihears.com/c/<id-fragment>`).
  Sequential integers would allow someone to enumerate all posts by guessing IDs.

**`text` — TEXT, Not Null**
- Type: `TEXT`
- Default: none
- Not null: yes
- Constraint: `CHECK (char_length(text) >= 3 AND char_length(text) <= 280)`
- Rationale: The core content. Constraint mirrors `MIN_LEN = 3` and `MAX_LEN = 280` from `cycle.ts`.
  DB-level constraint is the final safety net — even if the server function fails to validate length,
  the DB rejects the insert.

**`handle` — TEXT, Nullable**
- Type: `TEXT`
- Default: `NULL`
- Not null: no
- Rationale: The author's display handle. `NULL` means the post is anonymous.
  Not a foreign key — anonymous posts have no associated profile.
  Storing the handle string directly (not just a profile_id) ensures the handle is
  preserved even if the profile is later deleted.

**`device_token` — TEXT, Not Null**
- Type: `TEXT`
- Default: none (must be provided by server function)
- Not null: yes
- Constraint: `CHECK (char_length(device_token) = 16)` — enforces the 16-char hex format
- Rationale: Every post must be traceable to a device, even anonymous ones.
  This is the foundation of: rate limiting (count posts by device in last hour),
  veto prevention (you cannot report your own post), and moderation accountability.
  `CHECK` constraint ensures fabricated tokens with different lengths are rejected at the DB level.

**`profile_id` — UUID, Nullable, Foreign Key**
- Type: `UUID`
- Default: `NULL`
- Not null: no
- Constraint: `REFERENCES profiles(id) ON DELETE SET NULL`
- Rationale: Links a post to a signed-in user's profile.
  Nullable because anonymous posts have no profile.
  `ON DELETE SET NULL`: if a user deletes their account, their posts become anonymous
  (profile_id becomes NULL) but are NOT deleted. The content of the wall is preserved.
  This is intentional — deleting an account should not silently erase content from the community.

**`category` — TEXT, Not Null**
- Type: `TEXT`
- Default: none
- Not null: yes
- Constraint: `CHECK (category IN ('Spill The Tea', 'Silent Thoughts', 'Plot Twist', 'Hard Truth', 'Vibe Check'))`
- Rationale: Mirrors `CATEGORIES` from `shared/constants/categories.ts`.
  DB-level CHECK prevents invalid categories from being inserted even if server validation fails.
  The exact string values match those displayed in the UI filter chips.

**`preset` — TEXT, Not Null**
- Type: `TEXT`
- Default: `'midnight-static'`
- Not null: yes
- Constraint: `CHECK (preset IN ('midnight-static', '3am', 'golden-hour', 'quiet-storm', 'neon-ache', 'aurora-borealis', 'rose-dust', 'night-owl'))`
  (list includes all keys from `PRESETS` and `EXCLUSIVE_PRESETS`)
- Rationale: Controls the sharing card color scheme.
  Default is `midnight-static` — the first preset, matching your existing default.

**`status` — TEXT, Not Null**
- Type: `TEXT`
- Default: `'pending'`
- Not null: yes
- Constraint: `CHECK (status IN ('pending', 'published', 'review', 'rejected'))`
- Rationale: The moderation state machine. Four valid states only.
  New posts start as `pending`. Server function promotes to `published` (auto-approved)
  or `review` (needs manual check) immediately after spam validation.
  `pending` posts are never visible in the feed — this prevents a race condition where
  a post appears in the feed before spam validation completes.

**`pending_until` — TIMESTAMPTZ, Nullable**
- Type: `TIMESTAMPTZ`
- Default: `NULL`
- Not null: no
- Rationale: Reserved for a future feature: scheduled posts (e.g., "post this at midnight").
  Currently always NULL. Column is included now to avoid a schema migration later.

**`veto_count` — INTEGER, Not Null**
- Type: `INTEGER`
- Default: `0`
- Not null: yes
- Constraint: `CHECK (veto_count >= 0)`
- Rationale: The number of unique devices that have reported this post.
  Incremented atomically by the `reportPost` server function.
  When this reaches 5, the server function automatically transitions `status` to `review`.

**`vetoed_by` — TEXT[], Not Null**
- Type: `TEXT[]`
- Default: `'{}'::text[]`
- Not null: yes
- Rationale: Array of `device_token` values that have reported this post.
  Used to prevent the same device from reporting twice.
  Check: `device_token = ANY(vetoed_by)` before inserting a new report.
  Also prevents the post author from reporting their own post:
  `post.device_token = reporter.device_token` → reject.
  A separate `reports` table would be more normalized but adds a join on every report check.
  At expected scale, an array on the row is correct.

**`is_winner` — BOOLEAN, Not Null**
- Type: `BOOLEAN`
- Default: `FALSE`
- Not null: yes
- Rationale: Set to `TRUE` by the 12h cron winner selection job.
  Exactly one post has `is_winner = TRUE` per cycle.
  The `fetchWinner` server function queries `is_winner = TRUE ORDER BY winner_cycle DESC LIMIT 1`.

**`winner_cycle` — TIMESTAMPTZ, Nullable**
- Type: `TIMESTAMPTZ`
- Default: `NULL`
- Not null: no
- Rationale: The UTC timestamp of the cycle start that this post won.
  e.g., `2026-09-24 12:00:00+00`.
  Used by the cron job's idempotency check:
  "Is there already a winner with `winner_cycle` equal to the current cycle start?"
  If yes, skip selection. This prevents double-crowning if the cron fires twice.

**`winner_hook` — TEXT, Nullable**
- Type: `TEXT`
- Default: `NULL`
- Not null: no
- Rationale: The hook line displayed above the winner card.
  e.g., "This one left everyone speechless." or "The whole wall felt this."
  Set by the cron job when it selects the winner.
  Nullable because posts start with no hook — only the winner gets one.

**`pinned_until` — TIMESTAMPTZ, Nullable**
- Type: `TIMESTAMPTZ`
- Default: `NULL`
- Not null: no
- Rationale: If a user spends Warmth to "Pin to Category Top" (Store item: 50 Warmth),
  this column is set to `NOW() + INTERVAL '2 hours'`.
  The wall feed query checks `pinned_until > NOW()` and surfaces pinned posts first.
  After the interval expires, the post falls back to normal sort order.
  NULL means not pinned. Expired timestamps (`pinned_until <= NOW()`) are treated as not pinned.

**`reactions` — JSONB, Not Null**
- Type: `JSONB`
- Default: `'{"heart": 0, "sad": 0, "fire": 0, "hug": 0}'::jsonb`
- Not null: yes
- Rationale: Denormalized reaction counters. The four keys mirror `REACTIONS` from `shared/constants/reactions.ts`.
  Stored as JSONB on the post row for zero-join reads.
  Updated atomically by the `reactToPost` server function using a single SQL `UPDATE` statement
  that reads and writes in one operation (`SET reactions = jsonb_set(reactions, '{heart}', (reactions->>'heart')::int + 1 )`).
  This atomic approach prevents the lost-update race condition that would occur with read-modify-write.

**`created_at` — TIMESTAMPTZ, Not Null**
- Type: `TIMESTAMPTZ`
- Default: `NOW()`
- Not null: yes

**`updated_at` — TIMESTAMPTZ, Not Null**
- Type: `TIMESTAMPTZ`
- Default: `NOW()`
- Not null: yes
- Updated by `set_updated_at` trigger.

### `unsaids` Table Indexes

**Index 1: `(status, created_at DESC)` — The Primary Feed Index**
- Query it serves: `SELECT * FROM unsaids WHERE status = 'published' ORDER BY created_at DESC`
- This is the most frequently executed query in the entire application.
  Every wall feed page load runs this query.
  The composite index on `(status, created_at DESC)` allows Postgres to scan only published rows
  in reverse chronological order without a sort operation. Without this index, the DB performs
  a sequential scan of the entire table, which becomes catastrophic at scale.
- For bulk traffic (e.g., 1,000 concurrent users), this index is the most important in the schema.

**Index 2: `(category, status, created_at DESC)` — The Category Filter Index**
- Query it serves: `SELECT * FROM unsaids WHERE category = 'Spill The Tea' AND status = 'published' ORDER BY created_at DESC`
- When a user filters by category, this index is used instead of Index 1.
  Without this index, Postgres falls back to Index 1 (status + created_at) and then applies a
  category filter as a post-scan filter — fine for small datasets, slow for large ones.

**Index 3: `(is_winner DESC, winner_cycle DESC)` — The Winner Lookup Index**
- Query it serves: `SELECT * FROM unsaids WHERE is_winner = TRUE ORDER BY winner_cycle DESC LIMIT 1`
- This query runs on every page load (winner card) and is served from Cloudflare edge cache
  for 5 minutes, so it only hits the DB every 5 minutes at most.
  Still indexed because the cron job runs without cache.

**Index 4: `(device_token, created_at DESC)` — The Rate Limit Index**
- Query it serves: `SELECT COUNT(*) FROM unsaids WHERE device_token = $1 AND created_at > NOW() - INTERVAL '1 hour'`
- This query runs on every post submission to enforce the 3-posts-per-hour rate limit.
  Without the index, every submission scans the entire `unsaids` table for the device's recent posts.

**Index 5: `(pinned_until)` — The Pinned Post Index (Partial Index)**
- Query it serves: Feed query's ORDER BY clause includes pinned posts first
- Partial index (only on rows where `pinned_until IS NOT NULL`) — keeps the index small
- At scale, only a small fraction of posts are pinned at any time

---

## Table 3 — `echoes`

**Purpose:** Comments on wall posts. Separate table from `unsaids` to allow
individual timestamps, handles, and future features (likes on echoes).

### Column Specifications

**`id` — UUID, Primary Key**
- `gen_random_uuid()`, same rationale as `unsaids.id`

**`unsaid_id` — UUID, Not Null, Foreign Key**
- Constraint: `REFERENCES unsaids(id) ON DELETE CASCADE`
- Rationale: `ON DELETE CASCADE` — if a post is deleted (set to `rejected` and later purged),
  its echoes are deleted with it. Echoes without a parent post are meaningless.

**`text` — TEXT, Not Null**
- Constraint: `CHECK (char_length(text) >= 1 AND char_length(text) <= 200)`
- Rationale: Echoes are shorter than posts. 200 characters allows a meaningful comment
  without echoes becoming posts themselves.

**`handle` — TEXT, Nullable**
- Same rationale as `unsaids.handle`. NULL = anonymous.

**`device_token` — TEXT, Not Null**
- Constraint: `CHECK (char_length(device_token) = 16)`
- Same traceability requirement as posts. Rate limit on echoes uses this.

**`profile_id` — UUID, Nullable, Foreign Key**
- Constraint: `REFERENCES profiles(id) ON DELETE SET NULL`
- Same rationale as `unsaids.profile_id`.

**`created_at` — TIMESTAMPTZ, Not Null**
- Default `NOW()`. No `updated_at` because echoes are never updated.

### `echoes` Table Indexes

**Index 1: `(unsaid_id, created_at ASC)` — Echo Thread Order**
- Query it serves: `SELECT * FROM echoes WHERE unsaid_id = $1 ORDER BY created_at ASC`
- Echoes are shown in chronological order (oldest first, like a thread).
  ASC sort to show the conversation in time order.
- This runs every time a post's echo section is expanded.

**Index 2: `(device_token, created_at DESC)` — Echo Rate Limit**
- Query it serves: `SELECT COUNT(*) FROM echoes WHERE device_token = $1 AND created_at > NOW() - INTERVAL '1 hour'`
- Rate limit check: 10 echoes per device per hour.

---

## Table 4 — `reactions`

**Purpose:** The deduplication record for reactions.
The `reactions` JSONB column on `unsaids` stores the COUNT.
This table stores WHO reacted, with what key, on which post.

### Column Specifications

**`id` — UUID, Primary Key**

**`unsaid_id` — UUID, Not Null, Foreign Key**
- Constraint: `REFERENCES unsaids(id) ON DELETE CASCADE`
- Rationale: When a post is deleted, its reaction records are deleted. No orphaned records.

**`device_token` — TEXT, Not Null**
- Constraint: `CHECK (char_length(device_token) = 16)`

**`reaction_key` — TEXT, Not Null**
- Constraint: `CHECK (reaction_key IN ('heart', 'sad', 'fire', 'hug'))`
- Rationale: Only valid reaction keys can be stored. Mirror of `ReactionKey` type.

**`created_at` — TIMESTAMPTZ, Not Null**

### `reactions` Table Unique Constraint (Critical)

`UNIQUE (unsaid_id, device_token, reaction_key)` — the database itself enforces one reaction per type per post per device.

**How the server function uses this:**
1. Attempt `INSERT INTO reactions (unsaid_id, device_token, reaction_key) VALUES ($1, $2, $3)`
2. If it succeeds → reaction is new → also increment the counter on `unsaids.reactions`
3. If it fails with error code `23505` (unique violation) → reaction already exists → DELETE it → decrement counter
4. The toggle behavior (react/unreact) is implemented entirely through this insert-or-delete pattern.

**Why not check first, then insert:** The read-then-write pattern has a race condition.
Two simultaneous taps from the same device could both read "not reacted" and both insert.
The UNIQUE constraint is the atomic safety mechanism.

### `reactions` Table Indexes

**Index 1: `(unsaid_id, device_token)` — The Dedup Lookup**
- Query it serves: Checking if a device has already reacted when the feed loads
- When `fetchWall` returns posts, it also returns which of those posts the calling device
  has reacted to. This requires: `SELECT reaction_key FROM reactions WHERE unsaid_id = ANY($postIds) AND device_token = $1`
- The index on `(unsaid_id, device_token)` makes this lookup fast even with many posts.

---

## Table 5 — `duels`

**Purpose:** The content for The Duel page. Currently `MOCK_DUELS` in `bajihears.ts`.
These are managed entirely through the Supabase Table Editor (no admin UI needed).

### Column Specifications

**`id` — UUID, Primary Key**

**`format` — TEXT, Not Null**
- Constraint: `CHECK (format IN ('self-relate', 'head-to-head'))`
- Rationale: Two duel formats from `DuelFormat` type. Controls how the Duel card renders.
  `self-relate`: "Which one is more you?" — both options are relatable scenarios.
  `head-to-head`: "Which confession hits harder?" — both options are actual posts.

**`prompt` — TEXT, Nullable**
- Constraint: `CHECK (char_length(prompt) <= 150)` when not null
- Rationale: The question shown above the two options. Nullable — some duels have no prompt.

**`option_a_text` / `option_b_text` — TEXT, Not Null**
- Constraint: `CHECK (char_length(option_a_text) >= 1 AND char_length(option_a_text) <= 280)`
  (same constraint for option_b_text)
- Rationale: The text of each option. Flat columns (not nested JSONB) for easier editing
  in the Supabase Table Editor. You'll add new duels directly in the dashboard —
  flat columns are much easier to type into than nested JSON.

**`option_a_handle` / `option_b_handle` — TEXT, Nullable**
- Rationale: Attribution if the option text came from a real user post.
  Nullable — most duels are original content without attribution.

**`option_a_category` / `option_b_category` — TEXT, Nullable**
- Constraint: When not null, must be one of the five valid categories
- Rationale: Maps to `CATEGORIES` for potential future filtering of duels.

**`votes_a` / `votes_b` — INTEGER, Not Null**
- Default: `0`
- Constraint: `CHECK (votes_a >= 0)`, `CHECK (votes_b >= 0)`
- Rationale: Denormalized vote counters. Same pattern as `reactions` on `unsaids`.
  Updated atomically in the `voteOnDuel` server function.
  Displaying real vote totals replaces the simulated `generateSplit` function.

**`active` — BOOLEAN, Not Null**
- Default: `TRUE`
- Rationale: Set to `FALSE` to retire a duel without deleting it.
  Historical votes are preserved. The duel just stops appearing in the rotation.

**`created_at` — TIMESTAMPTZ, Not Null**

### `duels` Table Indexes

**Index 1: `(active, created_at DESC)` — The Active Duel Feed**
- Query it serves: `SELECT * FROM duels WHERE active = TRUE ORDER BY created_at DESC`
- The Duel page fetches all active duels. This index makes the fetch instant.
- Partial index (only where `active = TRUE`) keeps the index small as old duels are retired.

### Seeding Duels at Phase 1 End

After the table is created, the 6 `MOCK_DUELS` from `bajihears.ts` are inserted as real rows.
These become the initial content of the duels table.
The agent maps each `MOCK_DUEL` to the flat column schema.

---

## Table 6 — `duel_votes`

**Purpose:** Prevents a device from voting on the same duel twice.
Same pattern as `reactions`.

### Column Specifications

**`id` — UUID, Primary Key**

**`duel_id` — UUID, Not Null, Foreign Key**
- Constraint: `REFERENCES duels(id) ON DELETE CASCADE`
- Rationale: When a duel is deleted, its vote records are deleted.

**`device_token` — TEXT, Not Null**
- Constraint: `CHECK (char_length(device_token) = 16)`

**`choice_index` — INTEGER, Not Null**
- Constraint: `CHECK (choice_index IN (0, 1))`
- Rationale: 0 means voted for option A, 1 means voted for option B.
  Integer instead of TEXT because it's used arithmetically to update the correct counter.

**`created_at` — TIMESTAMPTZ, Not Null**

### `duel_votes` Table Unique Constraint

`UNIQUE (duel_id, device_token)` — one vote per device per duel.
Same insert-then-check pattern as `reactions`. If unique violation → already voted → return existing vote.

### `duel_votes` Table Indexes

**Index 1: `(duel_id, device_token)` — Vote Dedup Lookup**
- Query it serves: `SELECT * FROM duel_votes WHERE duel_id = ANY($duelIds) AND device_token = $1`
- When `fetchDuels` returns the duel list, it also returns the calling device's vote on each duel.

---

## Row-Level Security — Design Philosophy

**Why RLS exists for BajiHears despite using service_role in server functions:**

All mutations go through server functions that use the service_role key → RLS is bypassed.
But clients can also call Supabase directly using the anon key (the client library is public).
If a determined user calls the Supabase REST API directly with the anon key, RLS is the last defense.

**Policy naming convention:** `{table}_{action}_{who}` — e.g., `unsaids_select_published`, `profiles_update_own`.

---

## RLS Policies — Table by Table

### `profiles` RLS

**Enable RLS:** `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`

**Policy 1 — `profiles_select_all`**
- Operation: `SELECT`
- Condition: `USING (true)` — any caller can read any profile
- Rationale: Profile data (handle, avatar_seed, warmth_total) is displayed publicly
  in the Community Regulars section and on post cards. No restriction on reads.

**Policy 2 — `profiles_insert_own`**
- Operation: `INSERT`
- Condition: `WITH CHECK (auth.uid() = id)` — can only insert your own profile row
- Rationale: A profile row's ID must equal the authenticated user's auth ID.
  Without this, a user could create a profile row with someone else's user ID.
  `auth.uid()` is set by Supabase from the JWT in the Authorization header.

**Policy 3 — `profiles_update_own`**
- Operation: `UPDATE`
- Condition: `USING (auth.uid() = id)` — can only update your own profile row
- Rationale: Prevents any user from modifying another user's handle, warmth, or purchased items.
  This policy is the most critical security policy in the schema.

**Policy 4 — No DELETE policy**
- No `DELETE` policy is created. Without a policy, `DELETE` on `profiles` via anon key is blocked.
  Account deletion happens via the Supabase Auth admin API (which uses the service_role key),
  which triggers the `ON DELETE CASCADE` to the profiles table.

---

### `unsaids` RLS

**Enable RLS:** `ALTER TABLE unsaids ENABLE ROW LEVEL SECURITY`

**Policy 1 — `unsaids_select_published`**
- Operation: `SELECT`
- Condition: `USING (status = 'published')`
- Rationale: Only published posts are visible. `pending`, `review`, and `rejected` posts
  are invisible to any anon caller. A user cannot read their own pending post via the anon API.
  All reads of pending/review/rejected posts go through server functions using service_role.

**Policy 2 — `unsaids_insert_any`**
- Operation: `INSERT`
- Condition: `WITH CHECK (true)`
- Rationale: The INSERT is allowed at the RLS level because the server function performs
  all actual validation. If somehow an anon client bypasses the server function and calls
  Supabase directly, they can insert a row — but: (1) they cannot set `status = 'published'`
  because there's no UPDATE policy, (2) the row starts as `pending` (the default),
  (3) the DB-level CHECK constraints still enforce text length, valid category, valid preset.
  The post never reaches the feed without server-side promotion to `published`.

**No UPDATE or DELETE policies:**
Without policies, UPDATE and DELETE via anon key are blocked.
All status changes (from `pending` to `published`) happen via service_role in server functions.
This is correct — no user should be able to edit or delete a post via the API.

---

### `echoes` RLS

**Enable RLS:** `ALTER TABLE echoes ENABLE ROW LEVEL SECURITY`

**Policy 1 — `echoes_select_all`**
- `USING (true)` — echoes on published posts are publicly readable.

**Policy 2 — `echoes_insert_any`**
- `WITH CHECK (true)` — allowed at RLS level; server function performs validation.
  Same rationale as `unsaids_insert_any`.

---

### `reactions` RLS

**Enable RLS:** `ALTER TABLE reactions ENABLE ROW LEVEL SECURITY`

**Policy 1 — `reactions_select_all`**
- `USING (true)` — reaction counts are public.

**Policy 2 — `reactions_insert_any`**
- `WITH CHECK (true)` — the UNIQUE constraint handles deduplication.

**Policy 3 — `reactions_delete_own`**
- Operation: `DELETE`
- Condition: Ideally `USING (device_token = current_setting('request.jwt.claims')::json->>'device_token')`.
  However, custom JWT claims (embedding device_token in the JWT) require a Supabase
  custom claims setup. For Phase 1, the DELETE policy is set to `USING (false)` — all
  deletes are blocked via anon key. Reaction un-toggling goes through the server function
  (service_role) which bypasses RLS. This is safe.

---

### `duels` RLS

**Enable RLS:** `ALTER TABLE duels ENABLE ROW LEVEL SECURITY`

**Policy 1 — `duels_select_active`**
- `USING (active = true)` — only active duels are visible.

**No INSERT/UPDATE/DELETE policies** — duels are managed through the Supabase dashboard
by the admin. No user should ever insert or modify a duel through the API.

---

### `duel_votes` RLS

**Enable RLS:** `ALTER TABLE duel_votes ENABLE ROW LEVEL SECURITY`

**Policy 1 — `duel_votes_select_all`**
- `USING (true)` — vote records are public (aggregated totals are shown).

**Policy 2 — `duel_votes_insert_any`**
- `WITH CHECK (true)` — UNIQUE constraint on `(duel_id, device_token)` handles deduplication.

**No DELETE policy** — votes cannot be retracted.

---

## Supabase-Specific Configuration

### Connection String Selection

The Supabase project settings provide three connection string types:
1. **Direct connection** (port 5432, no pooler) — for long-running processes (migrations, scripts)
2. **Session pooler** (port 5432, pgbouncer session mode) — for traditional server applications
3. **Transaction pooler** (port 6543, pgbouncer transaction mode) — **for Cloudflare Workers**

**The agent uses the Transaction Pooler URI for all server function Supabase clients.**

The Transaction Pooler URI format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

**Why this matters for bulk traffic:**
- Direct connection: each Worker invocation opens a TCP connection to Postgres.
  At 100 concurrent requests, that's 100 open connections. Postgres's free tier has a 200 connection limit.
  60 bursting users would exhaust all connections.
- Transaction Pooler: pgbouncer sits between Workers and Postgres.
  It maintains a pool of connections (configurable, default 15 per user).
  1,000 concurrent Worker invocations share those 15 connections efficiently.
  A transaction is queued until a connection is available — typically microseconds.
  This is the only configuration that supports bulk traffic on Supabase's free tier.

### Supabase `max_rows` Setting

Supabase's PostgREST API has a default `max_rows = 1000` setting.
This limits how many rows any single API call can return.
For `fetchWall`, we never return more than 8 posts per page — well under the limit.
No change needed, but this is noted for future awareness.

### Supabase Realtime — Phase 1 Decision

Supabase Realtime allows clients to subscribe to DB changes via WebSockets.
This could power live reaction count updates (when User A reacts, User B sees the count update).

**Decision for Phase 1:** Realtime is NOT enabled on any table in this phase.
Reasoning:
- Realtime multiplies network traffic — each concurrent user opens a WebSocket.
  At 1,000 concurrent users, that's 1,000 persistent WebSocket connections to Supabase.
  The free tier has a 500 concurrent Realtime connection limit.
- TanStack Query's `refetchInterval` can poll for updates at configurable intervals.
  For reaction counts, a 30-second poll is acceptable and requires zero additional setup.
- Realtime can be enabled per-table at any point in the future without schema changes.

**If Realtime is added in a future phase:**
- `unsaids` table requires `REPLICA IDENTITY FULL` to emit old and new row values on UPDATE.
  This doubles the Write-Ahead Log (WAL) volume for that table.
  Only enable on `unsaids` — not on `reactions` or `echoes`.

---

## Final Verification Procedure

After Phase 1-B complete, the agent verifies via MCP and you verify via dashboard.

### Agent Verification (via MCP SQL queries)

1. `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
   → Must return exactly: `duel_votes, duels, echoes, profiles, reactions, unsaids`

2. `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
   → `rowsecurity` must be `true` for all 6 tables

3. `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname`
   → All 12 indexes listed in this plan must appear

4. `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'`
   → Must show the `set_updated_at` trigger on `profiles` and `unsaids`

5. `SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename`
   → All 9 policies listed in this plan must appear

6. `SELECT COUNT(*) FROM duels`
   → Must return 6 (the seeded MOCK_DUELS)

7. `SELECT COUNT(*) FROM unsaids`
   → Must return 0 (no real posts yet — seed posts come in Phase 4)

### Your Verification (Supabase Dashboard)

- Open Supabase → Table Editor → confirm 6 tables appear in the left sidebar
- Click on `unsaids` → confirm columns match this spec (especially `status`, `reactions` JSONB, `device_token`)
- Click on `profiles` → confirm `push_subscription` column exists (commonly missed)
- Authentication → Settings → confirm Email Confirmations are OFF

---

## What I Need From You — Phase 1 Summary

| Item | When | What Exactly |
|---|---|---|
| Confirm Phase 0 complete | Before Phase 1 starts | Tell me "Phase 0 done, MCP works, env is filled" |
| Confirm table structure | After Phase 1-B | Screenshot or description of any column that looks wrong |
| Confirm RLS is enabled | After Phase 1-B | In Supabase dashboard, each table shows a lock icon or "RLS enabled" label |
| Confirm duel seed data | After Phase 1-B | `SELECT COUNT(*) FROM duels` returns 6 — run this in Supabase SQL Editor |

---

## Common Failure Points

**Failure: Build fails after folder restructure**
- Cause: An import path wasn't updated after a file moved
- Fix: Build error output shows exactly which file has the broken import and what path it's looking for

**Failure: MCP cannot create tables**
- Cause: MCP is connected with the anon key (not service_role), which doesn't have DDL permissions
- Fix: Verify MCP config uses the service_role key, not the anon key

**Failure: RLS blocks all reads after enabling**
- Cause: RLS was enabled before the SELECT policies were created
- Fix: Create all policies for a table BEFORE enabling RLS, or enable RLS and immediately create policies in the same SQL transaction

**Failure: `profiles` INSERT fails with "row already exists"**
- Cause: Trying to create a profile for a user ID that already exists in `auth.users` from a previous test
- Fix: Delete the test user in Supabase Auth → Users, then recreate

**Failure: Connection pooler refused**
- Cause: Server function is using the direct connection URI (port 5432) instead of the Transaction Pooler URI (port 6543)
- Fix: Verify `src/server/db/client.ts` uses the 6543 port URL, not the 5432 URL. The Supabase dashboard clearly labels which is which.

**Failure: TypeScript errors after split of `bajihears.ts`**
- Cause: A type is imported from `@/lib/bajihears` somewhere that wasn't updated to the new `@/shared/types/` path
- Fix: Search for `from "@/lib/bajihears"` across all files after the split — every remaining reference must be updated

---

*Phase 1 complete state: folder structure matches spec, 6 tables created, RLS active, 9 policies set, 12 indexes built, `set_updated_at` trigger on 2 tables, 6 seed duels inserted, build passes, zero TypeScript errors.*

*Next: Phase 2 — Backend API Layer (server functions that call these tables)*
