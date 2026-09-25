# Phase 4 — Real Data Wiring: Replacing All Mocks
*Exhaustive Master Implementation Plan for Senior Engineering Execution*

---

> [!IMPORTANT]
> **Prerequisite Gate:** Phases 1 (Supabase schema and migrations), 2 (server functions in `src/server/functions/`), and 3 (auth and identity context) must be fully established and verified prior to executing Phase 4.
> Phase 4 is focused on **client-to-server data wiring**: eliminating all mock data stores, mock timers, and fake random generators, and binding every UI surface to live edge server functions via TanStack Query and TanStack Start RPCs.

> [!NOTE]
> **Specification Standard:** This document contains **zero boilerplate or generic pseudocode**. It details exact type signatures, state transition algorithms, query key structures, immutable cache patch algorithms, rollback snapshots, component prop contracts, and database RPC definitions. Every item is directly traceable to concrete files in the repository.

---

## Part 0: Executive Architecture & High-Altitude Systems Blueprint

### 0-A: System Topology & Data Flow Lifecycle

Prior to Phase 4, BajiHears operates as an isolated in-memory simulation:
1. The wall feed populates on client mount via `initializeWall()`, copying 200 static posts from `seedData.ts` into the browser's `localStorage`.
2. Reactions, echoes, reports, and duels manipulate browser `localStorage` directly or mutate local React state.
3. Duel outcome percentages are fabricated on the fly using pseudo-random math (`generateSplit()`).
4. Warmth points accumulate locally without persistent ledger reconciliation.

Phase 4 transforms the application into an edge-first, server-authoritative distributed system:

```
[ Client Browser UI ]
       │
       ▼
[ TanStack Query Cache (Normalized, Optimistic UI) ]
       │  (Mutations trigger instant optimistic cache updates + rollback snapshots)
       ▼
[ Client Hook Layer (`src/client/hooks/use-*.ts`) ]
       │  (Injects device identity token & encapsulates invalidation keys)
       ▼
[ TanStack Start RPC Layer (`src/server/functions/*.ts` or `/api/*`) ]
       │  (Cloudflare Worker Edge Runtime: Rate limit check, spam analysis, auth validation)
       ▼
[ Supabase PostgreSQL (Postgres Functions, RLS, Atomic JSONB Increments, Ledgers) ]
```

### 0-B: Core Architectural Invariants

Every senior engineer implementing Phase 4 must enforce five non-negotiable invariants:

1. **Zero-Mock Runtime Guarantee:** No build output or running client bundle may import `FALLBACK_MOCK_UNSAIDS`, `MOCK_UNSAIDS`, `MOCK_DUELS`, or `seedData.ts` into active route trees. Hardcoded mock objects are permitted solely as network-failure fallbacks behind explicit error guards (e.g. `FALLBACK_WINNER`).
2. **Anonymous Device Token Identity:** Every client mutation (`submitPost`, `reactToPost`, `unreactToPost`, `addEcho`, `submitDuelVote`, `syncWarmth`) must pass a cryptographically verified `deviceToken` (UUID v4) retrieved from `src/client/lib/identity.ts`. Unauthenticated users remain fully anonymous while maintaining a persistent deduplication fingerprint in Supabase.
3. **Deterministic Optimistic Reconciliation:** Every user interaction (toggling an emoji reaction, casting a duel vote, appending an echo) must reflect in the UI in `< 16ms` (single frame). The network roundtrip occurs in the background. On HTTP 4xx/5xx or database failure, the cache rolls back to the exact pre-mutation snapshot, and an accessible toast alerts the user.
4. **Monotonic Warmth Convergence:** Warmth balances stored across client `localStorage` and server `profiles.warmth_total` must merge monotonically: `warmth_final = MAX(local_warmth, server_warmth)`. Client-side spending checks must validate against authoritative server balances during store unlocks.
5. **Strict Single-Direction Data Flow:** UI components must never directly call server functions or mutate `localStorage` records for shared entities. Components subscribe strictly to hooks, hooks manage TanStack Query caches, and mutations synchronize persistence tiers.

### 0-C: Subsystem State Transition Matrix

| Subsystem | Before Phase 4 (Simulation) | After Phase 4 (Production Real Data) |
|---|---|---|
| **Wall Feed** | `localStorage` via `readUnsaids()` sourced from `seedData.ts`. Offset simulated with `window.setTimeout(400ms)`. | `useInfiniteQuery` querying `fetchFeed` via RPC. 20 posts/page. Backed by Supabase `unsaids` table (`status = 'published'`). |
| **Winner Card** | Hardcoded `WINNER` object in `local-storage.ts` or fallback constant. | `useQuery` querying `fetchWinner` with 5-minute `staleTime`. Computed every 12 hours from highest engagement score in DB. |
| **Reactions** | Local state increment + `writeMyReactions()` to `localStorage`. No server persistence. | Optimistic cache update on `['wall', 'feed']`. Background call to `reactToPost` or `unreactToPost`. Backed by atomic `increment_reaction` / `decrement_reaction` RPCs & `reactions` ledger. |
| **Echoes** | In-memory append with mock ID `local-${Date.now()}`. Lost on full cache clear. | Optimistic cache append with `isPending: true`. Background call to `addEcho`. Backed by Supabase `echoes` table and atomic `echo_count` increment on post. |
| **Duels** | Cycled through 6 hardcoded items in `MOCK_DUELS`. Percentages derived via `generateSplit()` (random number generator). | `useQuery` querying `fetchActiveDuel` with `deviceToken`. Real vote counts (`votesA`, `votesB`). Percentages computed mathematically: `(votesA / total) * 100`. |
| **Warmth Engine** | Standalone `localStorage` key `bajih_warmth`. Completely disconnected from backend. | Initial monotonic sync via `useWarmthSync` calling `syncWarmth` RPC. Profile row created/updated in Supabase `profiles`. |
| **Seed Data** | 58 KB array imported on first visit via `initializeWall()`. | Migrated to Supabase via dedicated CLI migration script (`scripts/migrate-seed-to-supabase.ts`). Zero client footprint. |

---

## Part 1: TanStack Query & Query Client Architecture

### 1-A: QueryClient Configuration Audit & Global Policy

**Target File:** [`src/router.tsx`](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/router.tsx)

The `QueryClient` instance must be instantiated with strict, production-grade defaults to prevent request storms, memory leaks, and redundant fetches in a mobile-heavy environment:

- **`queries.staleTime`:** `60_000` (60 seconds). Prevents aggressive re-fetching when users toggle between the Wall, Duel, and Read tabs.
- **`queries.gcTime`:** `300_000` (5 minutes). Retains inactive cache leaves in memory during brief tab navigation, ensuring instant back-navigation without layout shift.
- **`queries.retry`:** `(failureCount, error) => boolean`. Retry up to 2 times for standard network dropouts (503, connection reset). Fail immediately (0 retries) for HTTP 400, 401, 403, 404, 409, and 429 (Rate Limit).
- **`queries.retryDelay`:** Exponential backoff with jitter: `attempt => Math.min(1000 * 2 ** attempt + Math.random() * 200, 10_000)`.
- **`queries.refetchOnWindowFocus`:** `false`. Prevents jarring layout shifts and battery drain when a mobile user switches browser tabs or wakes their screen.
- **`mutations.retry`:** `0`. Mutations must **never** retry automatically. A retried mutation following an ambiguous network timeout could result in duplicate confessions, double reactions, or duplicate duel votes.

### 1-B: Hierarchical Query Key Factory

To eliminate typos and ensure type-safe cache queries, invalidations, and optimistic patches, developers must create a centralized Query Key Factory:

**Target File:** `src/client/lib/query-keys.ts`

```
queryKeys
├── posts
│   ├── all: ['posts']
│   ├── feed: (filters: Category[], sort?: string) => ['posts', 'feed', { filters, sort }]
│   ├── detail: (id: string) => ['posts', 'detail', id]
│   └── winner: () => ['posts', 'winner']
├── duels
│   ├── all: ['duels']
│   ├── active: (deviceToken?: string | null) => ['duels', 'active', { deviceToken }]
│   └── detail: (id: string) => ['duels', 'detail', id]
└── warmth
    ├── profile: (deviceToken: string) => ['warmth', 'profile', deviceToken]
    └── ledger: (deviceToken: string) => ['warmth', 'ledger', deviceToken]
```

### 1-C: Global Query Invalidation Matrix

Every mutation in the application maps to an explicit invalidation and cache patch behavior:

| Mutation | Direct Cache Update (Optimistic) | Invalidation Target | Refetch Behavior |
|---|---|---|---|
| `submitPost` | None (post is prepended locally only after server confirms status or returns optimistic ID) | `queryKeys.posts.feed(activeFilters)` | Background refetch of Page 0. Preserves active scroll position. |
| `reactToPost` | Optimistically increment target emoji count; add emoji to `myReactions` | `queryKeys.posts.feed(activeFilters)` and `queryKeys.posts.winner()` | Invalidation triggers background fetch to reconcile authoritative counts from other users. |
| `unreactToPost` | Optimistically decrement target emoji count; remove emoji from `myReactions` | `queryKeys.posts.feed(activeFilters)` and `queryKeys.posts.winner()` | Background refetch on settle. |
| `addEcho` | Optimistically append pending echo object (`isPending: true`) to post echoes | `queryKeys.posts.detail(postId)` | On success, replaces pending echo with server echo containing true UUID and timestamp. |
| `submitDuelVote` | Optimistically compute new `pctA` / `pctB` from current vote counts; set `alreadyVoted: true` | `queryKeys.duels.active(deviceToken)` | Background refetch to reconcile authoritative global vote counts. |
| `syncWarmth` | Monotonically update local `warmth_total` if `serverTotal > localWarmth` | `queryKeys.warmth.profile(deviceToken)` | Cache set directly from response. No extra refetch needed. |

### 1-D: TanStack Start SSR Hydration & Boundary Specification

BajiHears runs on TanStack Start over Cloudflare Workers. Implementing data fetching requires clear separation between server-side prefetching and client-side streaming:

1. **The Wall Feed (`/`):**
   - **Strategy:** Client-side hydration with skeleton fallback.
   - **Rationale:** The wall feed depends on category filters stored in client URL parameters/session state and user device token reaction states. Running the feed query inside a server loader risks slow Cloudflare Worker response times if Supabase connection pooling encounters latency.
   - **Implementation:** The route loader performs lightweight route verification; `useWall` initializes client-side. The initial render outputs dimension-matched `<FeedSkeleton />` elements, guaranteeing CLS = 0.
2. **The Winner Card (`/`):**
   - **Strategy:** Optional server prefetch with fallback guarantee.
   - **Rationale:** The winner is static across a 12-hour cycle and identical for all users. If prefetched in `loader`, it is dehydrated into the TanStack router context. If prefetch fails or times out (> 1500ms), it returns `FALLBACK_WINNER` without blocking the page render.
3. **The Duel Arena (`/duel`):**
   - **Strategy:** Client-side query driven by device token.
   - **Rationale:** `fetchActiveDuel` checks whether the requesting device has already voted. Because device tokens live in client `localStorage` and are not transmitted via initial cookies, this query must execute client-side upon token resolution.

---

## Part 2: Exhaustive Client Hook Specifications

All hooks reside in `src/client/hooks/` and must adhere strictly to these detailed specifications.

---

### 2-A: `src/client/hooks/use-wall.ts`

**Primary Purpose:** Orchestrates infinite pagination, category filtering, optimistic reaction toggling, optimistic echo submission, and pull-to-refresh for The Wall.

#### 1. Input Interface
```typescript
interface UseWallOptions {
  initialCategories?: Category[];
  pageSize?: number; // Default: 20, Max: 50
}
```

#### 2. Query Configuration (`useInfiniteQuery`)
- **Query Key:** `queryKeys.posts.feed(filters)`
- **Query Function:** Calls `fetchFeed(undefined, { category: filters.length === 1 ? filters[0] : undefined, page: pageParam, limit: pageSize })`. Note: if multi-category filtering is enabled, the server function handles category intersection, or the query loops over multiple categories.
- **`initialPageParam`:** `0` (Zero-indexed integer page number matching `posts.ts` `fetchFeed`).
- **`getNextPageParam`:** `(lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined`.
- **`staleTime`:** `120_000` (2 minutes).
- **`gcTime`:** `600_000` (10 minutes).
- **Transformation (`select`):** Flattens `data.pages.flatMap(page => page.posts)` into a memoized `Unsaid[]` array. Prevents child re-renders unless the flattened content or reaction counters change.

#### 3. Sentinel & IntersectionObserver Specification
- The hook manages an internal `sentinelRef = useRef<HTMLDivElement>(null)`.
- An `IntersectionObserver` attaches to `sentinelRef.current`.
- **Stale Closure Safeguard:** The observer callback must check current values via refs (`isFetchingNextPageRef`, `hasNextPageRef`) or be reconstructed when `hasNextPage` or `isFetchingNextPage` changes.
- **Threshold:** `rootMargin: '400px'` (loads the next page before the user reaches the absolute bottom, ensuring seamless scrolling).
- **Cleanup:** The `useEffect` return handler **must explicitly invoke** `observer.disconnect()` to prevent memory leaks during rapid navigation.

#### 4. Optimistic Reaction Mutation Specification
Tapping an emoji reaction must trigger an instant UI update while handling atomic toggle states (adding a reaction vs. removing an existing one).

**Algorithm for `onMutate`:**
1. Await cancellation of active queries: `await queryClient.cancelQueries({ queryKey: queryKeys.posts.feed(filters) })`.
2. Snapshot current query data: `const previousFeed = queryClient.getQueryData<InfiniteData<{ posts: Unsaid[] }>>(queryKeys.posts.feed(filters))`.
3. Snapshot local device reactions: `const previousLocalReactions = readMyReactions()`.
4. Inspect `previousLocalReactions[postId]`:
   - If `previousLocalReactions[postId]` contains `reactionKey`: Target action is **UNREACT**.
   - If not: Target action is **REACT**.
5. Compute new immutable `InfiniteData` tree:
   ```
   For each page in previousFeed.pages:
     For each post in page.posts:
       If post.id === postId:
         delta = (action === 'REACT') ? +1 : -1
         newCount = Math.max(0, (post.reactions[reactionKey] || 0) + delta)
         return {
           ...post,
           reactions: { ...post.reactions, [reactionKey]: newCount }
         }
       return post
   ```
6. Commit optimistic data: `queryClient.setQueryData(queryKeys.posts.feed(filters), updatedFeed)`.
7. Synchronously update `localStorage` via `writeMyReactions(...)` so the active pill state toggles immediately in UI components.
8. Return rollback context: `{ previousFeed, previousLocalReactions, postId, action, reactionKey }`.

**Algorithm for `onError`:**
1. Revert TanStack Query cache: `queryClient.setQueryData(queryKeys.posts.feed(filters), context.previousFeed)`.
2. Revert `localStorage`: Call `writeMyReactions(context.previousLocalReactions)`.
3. Inspect error payload: If `error` is `RateLimitError` (HTTP 429), trigger a high-priority toast: `"You're reacting too fast. Please wait a moment."` Otherwise: `"Couldn't save your reaction. Try again."`.

**Algorithm for `onSettled`:**
1. Invalidate queries: `queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })`.
2. Both feed and winner caches re-sync with authoritative database numbers without causing loading spinners.

#### 5. Optimistic Echo Mutation Specification
When the user submits an echo via `UnsaidCard`:
1. Optimistically append a temporary echo object to the target post:
   ```typescript
   const optimisticEcho: Echo = {
     id: `pending-${Date.now()}`,
     text: echoText,
     handle: userHandle || null,
     createdAt: Date.now(),
   };
   ```
2. Set a transient client flag `isPending: true` on that echo object.
3. In `onSuccess(serverEcho)`: Replace the temporary echo object whose `id` starts with `pending-` with the authoritative `serverEcho` (which contains the permanent UUID and server-stamped timestamp).
4. Persist the echoed post ID into `readMyEchoes()` / `writeMyEchoes()` to disable further echo inputs on that post.

#### 6. Export Contract (`UseWallReturn`)
```typescript
interface UseWallReturn {
  posts: Unsaid[];
  isLoading: boolean;              // True only on cold first-load
  isFetchingNextPage: boolean;     // True when fetching subsequent pages
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement>;
  filters: Category[];
  toggleFilter: (category: Category) => void;
  clearFilters: () => void;
  submitPost: (input: { text: string; category: Category; preset?: string; handle?: string | null }) => Promise<SubmitPostResult>;
  isSubmitting: boolean;
  submitError: string | null;
  onReact: (postId: string, reactionKey: ReactionKey) => void;
  onEcho: (postId: string, text: string, handle?: string | null) => Promise<void>;
  myReactions: MyReactions;
  myEchoedIds: string[];
  refetch: () => Promise<void>;
}
```

---

### 2-B: `src/client/hooks/use-winner.ts`

**Primary Purpose:** Manages the 12-hour cycle winner post, caching, fallback resilience, and cross-cache reaction synchronization.

#### 1. Query Configuration
- **Query Key:** `queryKeys.posts.winner()`
- **Query Function:** Calls `fetchWinner()`.
- **`staleTime`:** `300_000` (5 minutes).
- **`gcTime`:** `900_000` (15 minutes).
- **Error Recovery:** If `isError === true` or network fails, automatically return `{ winner: FALLBACK_WINNER.unsaid, hook: FALLBACK_WINNER.hook, isFallback: true }`. The UI never enters an unrecoverable blank or broken state.

#### 2. Dual-Cache Reaction Synchronization
When a user reacts to the Winner Card:
1. Update `queryKeys.posts.winner()` optimistically.
2. Search the active `queryKeys.posts.feed(...)` cache. If the winning post is also present within the currently loaded feed pages, update its reaction counter simultaneously in the feed cache.
3. Call `reactToPost` or `unreactToPost` via the server function.
4. On mutation settlement, invalidate **both** `queryKeys.posts.winner()` and `queryKeys.posts.feed(...)`. This guarantees that if the user scrolls down to that same confession on the wall, the reaction pill states and counts match perfectly.

#### 3. Export Contract (`UseWinnerReturn`)
```typescript
interface UseWinnerReturn {
  winner: Unsaid;
  hook: string;
  isFallback: boolean;
  isLoading: boolean;
  isError: boolean;
  onReact: (reactionKey: ReactionKey) => void;
  userReaction: ReactionKey | null;
}
```

---

### 2-C: `src/client/hooks/use-duel.ts`

**Primary Purpose:** Manages the active community duel, user choice submissions, exact vote percentages, and transitions.

#### 1. Architectural Resolution: Single Active Duel vs. Mock Cycling
In the mock simulation (`src/shared/constants/duels.ts`), `duel.tsx` cycled through 6 mock duels using a local `currentIndex` and fake percentages (`generateSplit()`).

**Phase 4 Production Model:**
- There is **one authoritative active duel** at any given time, queried from `duels` where `active = true`.
- When a user votes, their vote is recorded in `duel_votes` bound to `(duel_id, device_token)`.
- Once voted, the duel displays the **real mathematical percentages**:
  $$\text{pctA} = \text{round}\left(\frac{\text{votesA}}{\text{votesA} + \text{votesB}} \times 100\right)$$
  $$\text{pctB} = 100 - \text{pctA}$$
  *(Edge Case: If total votes equal 0, both display 50%).*
- **Cycling Behavior:** When the user taps "Next", if no additional active duel exists in the database, the UI renders the completed summary state with countdown timer until the next daily duel, rather than fabricating fake duels.

#### 2. Query Configuration
- **Query Key:** `queryKeys.duels.active(deviceToken)`
- **Query Function:** Calls `fetchActiveDuel(undefined, deviceToken)`.
- **`staleTime`:** `60_000` (1 minute).

#### 3. Optimistic Vote Mutation
- **`onMutate`:**
  1. Cancel active duel queries.
  2. Snapshot cache data.
  3. Calculate new vote counts optimistically:
     - If choice is Option A: `votesA + 1`, `votesB`
     - If choice is Option B: `votesA`, `votesB + 1`
  4. Compute and cache `pctA` and `pctB`.
  5. Set `alreadyVoted = true` and `userChoice = choiceIndex`.
  6. Write to local storage `writeAnsweredDuels(...)` for instant offline continuity.
- **`onSuccess`:** Award client warmth points (`awardWarmth("duel", "Voted in Daily Duel")`).
- **`onError`:** Roll back cache and local storage. Display error toast: `"Vote could not be recorded. Please try again."`

#### 4. Export Contract (`UseDuelReturn`)
```typescript
interface UseDuelReturn {
  duel: Duel | null;
  alreadyVoted: boolean;
  userChoice: 0 | 1 | undefined;
  pctA: number;
  pctB: number;
  votesA: number;
  votesB: number;
  isLoading: boolean;
  isVoting: boolean;
  error: Error | null;
  vote: (choiceIndex: 0 | 1) => Promise<void>;
  answeredCount: number;
  answeredRecord: AnsweredDuelRecord;
}
```

---

### 2-D: `src/client/hooks/use-warmth-sync.ts`

**Primary Purpose:** Guarantees one-way monotonic reconciliation between device `localStorage` warmth points and the backend database profile.

#### 1. Execution Triggers
The sync routine executes under three specific lifecycle events:
1. **Initial App Mount:** Inside `RootComponent` in `__root.tsx`.
2. **App Foregrounding:** Listens to `document.addEventListener('visibilitychange')`. When `document.visibilityState === 'visible'`, runs sync to capture points awarded during background tasks or push interactions.
3. **Major Milestone / Store Purchase:** Prior to unlocking an exclusive preset or spending points.

#### 2. Monotonic Reconciliation Algorithm
1. Read `deviceToken` from `getOrCreateIdentity().deviceToken`. If null or invalid, abort.
2. Read `localWarmth` from `readWarmth()` (`localStorage.getItem('bajih_warmth')`).
3. Invoke server function `syncWarmth({ deviceToken, localWarmth })`.
4. Server executes atomic upsert:
   `warmth_total = GREATEST(profiles.warmth_total, localWarmth)`
   Returns `{ serverTotal: number }`.
5. If `serverTotal > localWarmth`:
   - Invoke `syncWarmthTotal(serverTotal)` on `WarmthContext`.
   - Update `localStorage` silently.
   - Do **not** trigger bonus audio, coin animations, or toast notifications. This is silent data integrity maintenance.

#### 3. Export Contract (`UseWarmthSyncReturn`)
```typescript
interface UseWarmthSyncReturn {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncNow: () => Promise<void>;
}
```

---

### 2-E: `src/client/hooks/use-device-token.ts`

**Primary Purpose:** Encapsulates identity retrieval, guarantees SSR safety, and handles cross-tab token synchronization.

#### 1. Architectural Specification
- Guard against SSR execution: Check `typeof window !== 'undefined'`. Return an empty string during server-side evaluation.
- Memoize the identity resolution: Call `getOrCreateIdentity()` once on mount.
- Listen for `window.addEventListener('storage', ...)`: If another browser tab regenerates or alters `bajih_identity`, this hook updates state across all open tabs immediately.

#### 2. Export Contract
```typescript
interface UseDeviceTokenReturn {
  deviceToken: string;
  isReady: boolean;
}
```

---

## Part 3: Missing Server Functions & Database Primitives

The existing server functions in `src/server/functions/` must be expanded with missing operations to support toggling, echoes, and sync.

---

### 3-A: `unreactToPost` in `src/server/functions/posts.ts`

**Function Signature:**
```typescript
export async function unreactToPost(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<{ reactions: Record<ReactionKey, number> }>
```

**Implementation Steps:**
1. **Validation:** Execute `validateDeviceToken(input.deviceToken)`. Verify `postId` is a valid UUID.
2. **Ledger Check:** Query `reactions` table for existing record:
   ```sql
   SELECT id FROM reactions 
   WHERE unsaid_id = input.postId 
     AND device_token = input.deviceToken 
     AND reaction_key = input.reactionKey;
   ```
3. **Idempotent Exit:** If no matching row exists, return current reaction counters without error (prevents race conditions if user double-clicked rapidly).
4. **Atomic Deletion & Decrement:** Execute atomic database stored procedure `decrement_reaction`:
   ```sql
   DELETE FROM reactions 
   WHERE unsaid_id = input.postId 
     AND device_token = input.deviceToken 
     AND reaction_key = input.reactionKey;

   UPDATE unsaids 
   SET reactions = jsonb_set(
     reactions, 
     ARRAY[input.reactionKey], 
     to_jsonb(GREATEST(0, ((reactions->>input.reactionKey)::int - 1)))
   )
   WHERE id = input.postId
   RETURNING reactions;
   ```
5. **Return:** Return `{ reactions: updatedReactions }`.

---

### 3-B: `addEcho` in `src/server/functions/posts.ts`

**Function Signature:**
```typescript
export async function addEcho(
  env: DatabaseEnv | undefined,
  input: {
    unsaidId: string;
    text: string;
    deviceToken: string;
    handle?: string | null;
    profileId?: string | null;
  }
): Promise<Echo>
```

**Implementation Steps:**
1. **Validation:** Execute `validateDeviceToken(input.deviceToken)`.
2. **Text Sanitation:** Trim text. Verify length is between 1 and 200 characters. Reject empty strings with `ECHO_TOO_SHORT`. Reject text > 200 chars with `ECHO_TOO_LONG`.
3. **Rate Limiting:** Check rate limit using `checkRateLimit(env, "echo", token)`. (Limit: 10 echoes per 30 minutes).
4. **Spam Heuristics:** Enforce character repetition limits and uppercase ratio checks (< 80% uppercase).
5. **Database Transaction:**
   - Insert new row into `echoes` table:
     `{ unsaid_id: input.unsaidId, text: cleanText, handle: input.handle ?? null, device_token: token, profile_id: input.profileId ?? null }`
   - Atomically increment `echo_count` column on `unsaids` table:
     `UPDATE unsaids SET echo_count = COALESCE(echo_count, 0) + 1 WHERE id = input.unsaidId;`
6. **Activity Attribution:** If `profileId` is present, invoke `incrementTotalActions(env, profileId)`.
7. **Return:** Return newly created `Echo` object with server-generated UUID and epoch timestamp.

---

### 3-C: `syncWarmth` in `src/server/functions/warmth.ts`

**Function Signature:**
```typescript
export async function syncWarmth(
  env: DatabaseEnv | undefined,
  input: {
    deviceToken: string;
    localWarmth: number;
    profileId?: string | null;
  }
): Promise<{ serverTotal: number }>
```

**Implementation Steps:**
1. **Validation:** Validate device token format. Verify `localWarmth >= 0` and is an integer.
2. **Monotonic Upsert:** Execute PostgreSQL upsert against `profiles`:
   ```sql
   INSERT INTO profiles (device_token, warmth_total, updated_at)
   VALUES (input.deviceToken, input.localWarmth, NOW())
   ON CONFLICT (device_token) 
   DO UPDATE SET 
     warmth_total = GREATEST(profiles.warmth_total, EXCLUDED.warmth_total),
     updated_at = NOW()
   RETURNING warmth_total;
   ```
3. **Return:** Return `{ serverTotal: result.warmth_total }`.

---

### 3-D: Database Primitives & Schema Addendum

To guarantee that seed data is migrated idempotently and counters never drift, Phase 4 requires the following database primitives in Supabase:

#### 1. `app_meta` Key-Value Table
```sql
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Atomic Decrement Stored Procedure (`decrement_reaction`)
```sql
CREATE OR REPLACE FUNCTION decrement_reaction(
  p_post_id UUID,
  p_device_token TEXT,
  p_reaction_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reactions JSONB;
BEGIN
  -- Delete reaction record
  DELETE FROM reactions
  WHERE unsaid_id = p_post_id
    AND device_token = p_device_token
    AND reaction_key = p_reaction_key;

  -- Atomically decrement counter with zero-floor
  UPDATE unsaids
  SET reactions = jsonb_set(
    reactions,
    ARRAY[p_reaction_key],
    to_jsonb(GREATEST(0, COALESCE((reactions->>p_reaction_key)::int, 0) - 1))
  )
  WHERE id = p_post_id
  RETURNING reactions INTO v_reactions;

  RETURN v_reactions;
END;
$$;
```

---

## Part 4: Component Contract Overhauls & Route Layer Rewrites

---

### 4-A: `WritingBox` Component Contract

**Target File:** [`src/client/components/WritingBox.tsx`](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/client/components/WritingBox.tsx)

**Interface Changes:**
```typescript
interface WritingBoxProps {
  onPostSubmit: (post: {
    text: string;
    category: Category;
    preset?: string;
    handle?: string | null;
  }) => Promise<SubmitPostResult>;
  isSubmitting?: boolean;
  submitError?: string | null;
  cooldownRemaining?: number; // Milliseconds remaining until next post allowed
  onUnlockExclusive?: (presetKey: string) => void;
}
```

**Behavioral Specifications:**
1. **Submission State:** When `isSubmitting === true`, the submit button switches to a spinner state and disables textarea editing to prevent double-submission.
2. **Cooldown Guard:** Check `cooldownRemaining`. If `> 0`, display countdown badge: `"Cooldown: MM:SS"` and disable submission button.
3. **Error Handling:** If `submitError` is provided, render an inline amber alert box below the character counter with the exact server error message.

---

### 4-B: `UnsaidCard` Component Contract

**Target File:** [`src/client/components/UnsaidCard.tsx`](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/client/components/UnsaidCard.tsx)

**Interface Changes:**
```typescript
interface UnsaidCardProps {
  unsaid: Unsaid;
  userReaction?: ReactionKey | null;
  onReact: (reactionKey: ReactionKey) => void;
  onEcho: (text: string, handle?: string | null) => Promise<void>;
  isEchoPending?: boolean;
  isWinnerCard?: boolean;
}
```

**Behavioral Specifications:**
1. **Optimistic Visual State:** When user taps an emoji pill, apply active styles (`border-primary bg-primary/10`) immediately based on `userReaction === key`.
2. **Pending Echoes:** Echoes marked with `id` starting with `pending-` must render with a pulsing opacity (`opacity-70 animate-pulse`) and an accompanying tiny clock indicator to show that edge synchronization is in-flight.

---

### 4-C: `DuelCard` Component Contract

**Target File:** [`src/client/components/DuelCard.tsx`](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/client/components/DuelCard.tsx)

**Interface Changes:**
```typescript
interface DuelCardProps {
  duel: Duel;
  votedChoice?: 0 | 1 | undefined;
  pctA: number;
  pctB: number;
  votesA: number;
  votesB: number;
  onVote: (choiceIndex: 0 | 1) => void;
  isVoting?: boolean;
}
```

**Behavioral Specifications:**
1. **Mathematical Accuracy:** Render `pctA` and `pctB` directly as CSS flex basis or percentage width on the split bar. **Eliminate all references to `generateSplit`**.
2. **Transition Animation:** Percentage bars must use `transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1)` to smoothly glide into their true positions upon voting.

---

### 4-D: `src/client/stores/warmth-context.tsx` — Add `syncWarmthTotal`

Add `syncWarmthTotal` to `WarmthContextType` and provider:

```typescript
// Add to WarmthContextType:
syncWarmthTotal: (serverTotal: number) => void;

// Implementation in WarmthProvider:
const syncWarmthTotal = useCallback((serverTotal: number) => {
  setTotalWarmth(serverTotal);
  writeWarmth(serverTotal);
  // Note: Explicitly omit setWarmthLog, setIsFlashingOrb, and setToast
}, []);
```

---

### 4-E: `src/routes/__root.tsx` — Mock Removal & Hook Attachment

1. **Remove:** Delete `initializeWall();` from the mount effect. Remove import of `initializeWall`.
2. **Add:** Call `useWarmthSync()` at the top level of `RootComponent`.

---

### 4-F: `src/routes/index.tsx` — Complete Route Rewire

**Refactor Blueprint:**
1. **Delete:**
   - Remove `import { FALLBACK_MOCK_UNSAIDS, WINNER } from "@/client/lib/local-storage"`.
   - Remove `window.setTimeout(..., 400)` mock pagination delay.
   - Remove manual `IntersectionObserver` state in the component body.
   - Remove local `unsaids` and `filters` state variables (`useState`).
2. **Wire:**
   - Consume `useWall()`:
     `const { posts, isLoading, isFetchingNextPage, sentinelRef, filters, toggleFilter, clearFilters, onReact, onEcho, submitPost, isSubmitting, submitError, myReactions } = useWall();`
   - Consume `useWinner()`:
     `const { winner, hook: winnerHook, onReact: onWinnerReact, userReaction: winnerUserReaction } = useWinner();`
3. **Render:**
   - When `isLoading && posts.length === 0`: Render `<FeedSkeleton />`.
   - Render `WritingBox` with `onPostSubmit={submitPost}`, `isSubmitting={isSubmitting}`, and `submitError={submitError}`.
   - Render Winner Card with `winner` and `onWinnerReact`.
   - Map `posts` into `<UnsaidCard />` instances.
   - Attach `<div ref={sentinelRef} className="h-10 w-full" />` at the bottom of the feed list.

---

### 4-G: `src/routes/duel.tsx` — Complete Route Rewire

**Refactor Blueprint:**
1. **Delete:**
   - Remove `import { MOCK_DUELS, generateSplit } from "@/shared/constants/duels"`.
   - Remove mock cycling state (`currentIndex`, `setCurrentIndex`).
2. **Wire:**
   - Consume `useDuel()`:
     `const { duel, alreadyVoted, userChoice, pctA, pctB, votesA, votesB, isLoading, isVoting, vote } = useDuel();`
3. **Render:**
   - If `isLoading`: Render `<DuelSkeleton />`.
   - If `duel`: Pass live state (`pctA`, `pctB`, `votesA`, `votesB`, `votedChoice={userChoice}`, `onVote={vote}`) to `<DuelCard />`.

---

### 4-H: `src/routes/read.tsx` — BajiRead Migration

**Refactor Blueprint:**
- Retain `readMyReactions()`, `readMyEchoes()`, and `readAnsweredDuels()` for initial client rendering.
- Bind reading stats to profile query data when authenticated to reflect cross-device history.

---

## Part 5: Mock Deprecation & Elimination Schedule

### 5-A: Inventory of Deprecated Symbols & Files

| Symbol / File | Location | Action in Phase 4 | Final Removal |
|---|---|---|---|
| `initializeWall` | `src/client/lib/local-storage.ts` | Mark `@deprecated`. Remove call in `__root.tsx`. | End of Phase 4 build |
| `FALLBACK_MOCK_UNSAIDS` | `src/client/lib/local-storage.ts` | Mark `@deprecated`. Remove import in `index.tsx`. | Phase 5 cleanup |
| `WINNER` | `src/client/lib/local-storage.ts` | Mark `@deprecated`. Remove import in `index.tsx`. | Phase 5 cleanup |
| `generateSplit` | `src/shared/constants/duels.ts` | **Delete export completely**. | Phase 4 Step 12 |
| `seedData.ts` | `src/client/lib/seedData.ts` | Retained strictly for migration script input. | Delete after DB migration verification |

### 5-B: Two-Phase Elimination Protocol

1. **Phase 4A (Wiring):** Wire all hooks to server functions. Deprecate mock exports. Ensure application compiles cleanly.
2. **Phase 4B (Verification & Purge):** Run grep verification commands. If all passes, eliminate dead mock exports from the client bundle.

---

## Part 6: Seed Data Migration Script Specification

**Target File:** `scripts/migrate-seed-to-supabase.ts`

### 6-A: Script Architecture & Execution Command

Execute via `tsx` or `node`:
```bash
npx tsx scripts/migrate-seed-to-supabase.ts
```

### 6-B: Migration Specifications

1. **Environment Verification:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in environment.
2. **Idempotency Check:** Query `app_meta` table for key `seed_posts_v1_migrated`. If exists and `value.status === 'completed'`, abort execution with message: `"Seed data already migrated. Skipping."`.
3. **Batching:** Iterate over the ~200 items in `SEED_DATA` in chunks of **50 items** to adhere to Supabase REST payload limits.
4. **Data Transformation:**
   - Map each item to Supabase `unsaids` schema:
     - `id`: Convert string ID to valid deterministic UUID v5 (or generate unique UUID v4).
     - `text`: Post text.
     - `category`: Post category.
     - `preset`: `midnight-static` (or mapped preset).
     - `handle`: Post handle or `null`.
     - `reactions`: `item.reactions` JSONB object.
     - `status`: `'published'`.
     - `created_at`: Map from `item.createdAt` epoch to ISO timestamp.
5. **Batch Insertion:** Execute `supabase.from('unsaids').upsert(batch, { onConflict: 'id' })`.
6. **Completion Flag:** Insert record into `app_meta`:
   ```json
   {
     "key": "seed_posts_v1_migrated",
     "value": { "status": "completed", "migratedCount": 200, "timestamp": 1790326800000 }
   }
   ```

---

## Part 7: TanStack Start API Route Endpoints & Zod Validation Schemas

To provide unified HTTP interfaces across Edge Workers and SSR, all server functions are exposed via structured API routes.

### 7-A: Route Architecture

All routes reside in `src/routes/api/` and extract the Cloudflare Worker database context via `getDatabaseEnv(request)`.

### 7-B: Route Definitions & Strict Schemas

#### 1. `POST /api/posts` — Confession Submission
- **Zod Schema:**
  ```typescript
  export const SubmitPostSchema = z.object({
    text: z.string().trim().min(3, "Too short").max(280, "Too long"),
    category: z.enum(["Spill The Tea", "Silent Thoughts", "Plot Twist", "Hard Truth", "Vibe Check"]),
    preset: z.string().default("midnight-static"),
    handle: z.string().max(30).nullable().optional(),
    deviceToken: z.string().uuid("Invalid device token"),
    profileId: z.string().uuid().nullable().optional(),
  });
  ```

#### 2. `POST /api/posts/react` — Reaction Toggle
- **Zod Schema:**
  ```typescript
  export const ReactPostSchema = z.object({
    postId: z.string().uuid(),
    reactionKey: z.enum(["heart", "sad", "fire", "hug"]),
    deviceToken: z.string().uuid(),
    action: z.enum(["react", "unreact"]),
  });
  ```

#### 3. `POST /api/posts/echo` — Echo Submission
- **Zod Schema:**
  ```typescript
  export const EchoPostSchema = z.object({
    unsaidId: z.string().uuid(),
    text: z.string().trim().min(1).max(200),
    handle: z.string().max(30).nullable().optional(),
    deviceToken: z.string().uuid(),
  });
  ```

#### 4. `POST /api/duels/vote` — Duel Vote Submission
- **Zod Schema:**
  ```typescript
  export const DuelVoteSchema = z.object({
    duelId: z.string().uuid(),
    choiceIndex: z.union([z.literal(0), z.literal(1)]),
    deviceToken: z.string().uuid(),
  });
  ```

#### 5. `POST /api/warmth/sync` — Monotonic Warmth Sync
- **Zod Schema:**
  ```typescript
  export const WarmthSyncSchema = z.object({
    deviceToken: z.string().uuid(),
    localWarmth: z.number().int().nonnegative(),
  });
  ```

---

## Part 8: Error Handling, Resilience & Rate Limit Matrix

### 8-A: Exhaustive Error Code & Microcopy Mapping

When an error propagates to the UI, the system maps the error code to empathetic, contextual microcopy:

| Server Error Code | HTTP Status | Context | User-Facing Microcopy (Toast / Alert) | UI Action |
|---|---|---|---|---|
| `RATE_LIMIT_EXCEEDED` (submit) | 429 | WritingBox | *"The wellspring needs a breath. You can share another whisper in MM minutes."* | Disable submit button; display countdown. |
| `RATE_LIMIT_EXCEEDED` (react) | 429 | Wall Reaction | *"You're reacting with great passion! Please wait a moment before reacting again."* | Revert reaction pill; dismiss in 3s. |
| `RATE_LIMIT_EXCEEDED` (echo) | 429 | Echo Input | *"Echo limit reached for this session. Take a moment to read others."* | Disable echo submission field. |
| `ECHO_TOO_LONG` | 400 | Echo Input | *"Echoes must be gentle and brief (max 200 characters)."* | Highlight character counter in red. |
| `DUEL_ALREADY_VOTED` | 409 | Duel Arena | *"Your voice has already been counted in this duel."* | Switch card to voted percentage view. |
| `SPAM_DETECTED` | 422 | WritingBox | *"Your thought was held for community review to keep this sanctuary safe."* | Clear box; show pending review badge. |
| `NETWORK_FAILURE` | 503 / 0 | Any Surface | *"Connection adrift. Your thoughts are safe locally; retrying..."* | Retry query silently in background. |

### 8-B: Rollback & Re-synchronization Protocols

1. **Reaction Rollback:** If `reactToPost` fails, `useWall` re-applies `context.previousFeed` and writes `context.previousLocalReactions` back to `localStorage`.
2. **Duel Vote Rollback:** If `submitDuelVote` throws, `useDuel` restores `alreadyVoted = false` and re-enables the voting buttons.
3. **Echo Rollback:** If `addEcho` rejects, the pending echo is filtered out of `post.echoes`, and the echo textarea is restored with the user's drafted text so no input is lost.

---

## Part 9: Loading Skeletons, Zero-Layout-Shift (CLS) & Performance Budgets

To guarantee a fluid 60fps experience on mobile devices and pass Core Web Vitals, all loading states must strictly prevent Cumulative Layout Shift (CLS).

### 9-A: Dimension-Matched Loading Skeletons

1. **`<FeedSkeleton />`:**
   - Renders 3 dummy cards with exact padding (`p-5`), border radiuses (`rounded-2xl`), and aspect ratios matching real confessions.
   - Text lines render with shimmer pulse animation (`bg-white/5 animate-pulse rounded-md`).
2. **`<DuelSkeleton />`:**
   - Matches the exact height of `<DuelCard />` (`h-[380px]`).
   - Placeholder split pills maintain identical margins, preventing content below from jumping when data arrives.
3. **`<WinnerSkeleton />`:**
   - Matches the exact dimensions of the Winner Card header (`h-[220px]`).

### 9-B: Performance Budgets

- **Largest Contentful Paint (LCP):** < `2.0s` on simulated 4G mobile.
- **Cumulative Layout Shift (CLS):** `< 0.05` across all route transitions.
- **Interaction to Next Paint (INP):** `< 50ms` for reactions and duel votes via optimistic state.
- **Client Bundle Size:** Removing `seedData.ts` from client imports decreases bundle weight by **~58 KB**.

---

## Part 10: Step-by-Step Execution Sequence, Verification Protocol & Emergency Rollback

### 10-A: 20-Step Strictly Ordered Execution Sequence

```
Step 1  ─── Add `syncWarmthTotal` to `src/client/stores/warmth-context.tsx`
             ↓
Step 2  ─── Add `unreactToPost` to `src/server/functions/posts.ts`
             ↓
Step 3  ─── Add `addEcho` to `src/server/functions/posts.ts`
             ↓
Step 4  ─── Add `syncWarmth` to `src/server/functions/warmth.ts`
             ↓
Step 5  ─── Create database stored procedure `decrement_reaction` & `app_meta` table in Supabase
             ↓
Step 6  ─── Create `src/client/hooks/use-device-token.ts`
             ↓
Step 7  ─── Create `src/client/hooks/use-warmth-sync.ts`
             ↓
Step 8  ─── Create `src/client/lib/query-keys.ts` (Query Key Factory)
             ↓
Step 9  ─── Verify/Create API route endpoints in `src/routes/api/` with Zod schemas
             ↓
Step 10 ─── Create `src/client/hooks/use-winner.ts`
             ↓
Step 11 ─── Create `src/client/hooks/use-duel.ts`
             ↓
Step 12 ─── Create `src/client/hooks/use-wall.ts`
             ↓
Step 13 ─── Update `src/client/components/WritingBox.tsx` (wire `isSubmitting` & `submitError`)
             ↓
Step 14 ─── Update `src/client/components/UnsaidCard.tsx` (wire optimistic reaction & echo props)
             ↓
Step 15 ─── Update `src/client/components/DuelCard.tsx` (wire live votes & remove `generateSplit`)
             ↓
Step 16 ─── Rewrite `src/routes/index.tsx` (connect `useWall` and `useWinner`, remove all mocks)
             ↓
Step 17 ─── Rewrite `src/routes/duel.tsx` (connect `useDuel`, remove mock cycling)
             ↓
Step 18 ─── Update `src/routes/__root.tsx` (remove `initializeWall`, attach `useWarmthSync`)
             ↓
Step 19 ─── Execute `scripts/migrate-seed-to-supabase.ts` to populate live database
             ↓
Step 20 ─── Run Full Verification Protocol & Deprecate Local Storage Mocks
```

---

### 10-B: Comprehensive Acceptance & Verification Checklist

#### 1. Database & Persistence Checks
- [ ] Confession submitted via `WritingBox` inserts into `unsaids` with valid `device_token`.
- [ ] Tapping reaction inserts row into `reactions` and atomically increments `reactions->>key` on post.
- [ ] Tapping same reaction again removes row from `reactions` and decrements count via `decrement_reaction`.
- [ ] Submitting echo creates row in `echoes` and increments `echo_count` on `unsaids`.
- [ ] Casting duel vote creates row in `duel_votes` and returns real mathematical split.
- [ ] Initial session load creates/updates `profiles` record with monotonic warmth total.

#### 2. Clean Code & Mock Elimination Greps
Every command must return **zero matches** across the active codebase:
```bash
# Must return ZERO matches:
grep -r "initializeWall" src/
grep -r "generateSplit" src/
grep -r "FALLBACK_MOCK_UNSAIDS" src/routes/
grep -r "seedData" src/routes/
grep -r "window.setTimeout" src/routes/index.tsx
```

#### 3. TypeScript & Compilation Gate
- [ ] `npm run build` exits with code `0` and **zero errors**.
- [ ] No `@ts-ignore` or `any` added to new hook implementations.
- [ ] Strict mode passes cleanly across all route loaders and components.

---

### 10-C: Critical Failure Modes & Edge Case Safeguards

1. **Nested `InfiniteData` Cache Mutation:**
   When optimistically patching a reaction in `useWall`, never treat `queryClient.getQueryData` as a flat array. It is structured as `{ pages: Array<{ posts: Unsaid[], page: number, hasMore: boolean }>, pageParams: number[] }`. Mutating pages requires mapping every page immutably.
2. **Device Token Race Condition on First Visit:**
   On a brand new browser profile, `getOrCreateIdentity()` generates a UUID v4 in `localStorage`. If `useWall` or `useDuel` runs before identity generation settles, the query could pass an empty token. The `useDeviceToken` hook guarantees resolution before mutations fire.
3. **Database Counter Drift Protection:**
   Direct client increments (`reactions[key] + 1`) are purely optimistic. The database counters are updated via PostgreSQL atomic operations (`decrement_reaction` RPC and `increment_reaction`). Even under heavy concurrent load, counts never drop below zero or diverge.

---

### 10-D: Emergency Rollback Playbook

If a critical database connection pooling outage or Cloudflare Worker execution cap occurs post-deployment:

1. **Fallback Flags:** In `src/client/hooks/use-wall.ts`, each query function includes a try/catch block falling back to cached offline items from `localStorage` if the edge returns 500/503.
2. **Winner Resilience:** `useWinner` automatically defaults to `FALLBACK_WINNER` if Supabase fails to respond within 2000ms.
3. **Duel Resilience:** If `fetchActiveDuel` fails, `useDuel` gracefully falls back to `MOCK_DUELS[0]`, ensuring no visitor encounters a white screen of death.

---

*Phase 4 Implementation Plan Complete.*
*Scope: 5 New Client Hooks · 3 Server Function Additions · 3 Component Contract Updates · 4 Route Rewrites · 1 Seed Migration Script · 1 Database Primitive Set.*
*Standard: Production-Grade, Zero Mocks, Absolute Specification.*
