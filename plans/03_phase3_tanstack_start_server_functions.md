# Phase 3 — Exhaustive Implementation Plan
## Route Handler Layer — TanStack Start Server Functions & HTTP API Endpoints
*BajiHears · Bulk client-facing production standard · No code — pure specification*

---

> [!IMPORTANT]
> Phase 3 is the **bridge layer** between the server functions from Phase 2 and
> the browser-facing client from Phase 4.
>
> At the end of Phase 3, every server function from Phase 2 is reachable via an
> HTTP endpoint. The client still uses localStorage (that changes in Phase 4).
> Phase 3 also sets up the security headers, CORS posture, error-to-status mapping,
> and environment binding injection that all future phases depend on.

---

## What Phase 3 Delivers

At the end of Phase 3:
- Every Phase 2 server function is callable via a typed TanStack Start `createServerFn`
- Every endpoint is secured with: device token validation, CSRF protection, rate limit headers
- The error contract between server and client is defined and consistent across all endpoints
- Security response headers are applied globally to every response
- Environment variables (Supabase keys) are injected from Cloudflare Worker bindings into server functions
- A TanStack Start `createServerFn` wrapper pattern is established that all future phases follow
- The Phase 2 test script `phase2.test.ts` is extended to verify the HTTP interface, not just the functions

---

## Understanding the Current Architecture

### How TanStack Start Works in This Project

This project uses **TanStack Start** with the **Nitro/Cloudflare Worker** deployment target.
TanStack Start is NOT a classic Express server — it is a full-stack React framework where:

- **`createFileRoute`** defines client-side pages (files inside `src/routes/`)
- **`createServerFn`** defines RPC-style server functions that are callable from React components
  and route loaders — they run on the server and their results are serialized to the client
- **Cloudflare Worker** receives all HTTP requests and routes them:
  - SSR page requests → TanStack's SSR renderer
  - `createServerFn` calls → TanStack's internal server function handler
  - Static assets → Cloudflare edge cache

### The Three Request Types This Project Handles

```
Request Type              Handler                          File
─────────────────────────────────────────────────────────────────────
SSR page HTML             TanStack SSR renderer           src/routes/*.tsx
Server Function RPC calls createServerFn() wrappers       src/routes/api/*.ts (new in Phase 3)
Static assets (CSS, JS)   Cloudflare edge cache / Nitro   .output/public/
─────────────────────────────────────────────────────────────────────
```

### What `createServerFn` Is and Why We Use It (Not Raw Fetch Endpoints)

`createServerFn` from `@tanstack/react-start` is the idiomatic way to create server endpoints
in this stack. It:
- Generates a typed callable function on the client that returns the server result
- Automatically handles serialization and deserialization between client and server
- Works with TanStack Router's `loader` and `action` patterns for progressive enhancement
- Runs inside the same Cloudflare Worker isolate as the SSR renderer — no separate service needed
- Has built-in CSRF protection (already configured in `src/start.ts`)
- TypeScript types flow end-to-end: define the input/output shape once, get type safety everywhere

### The Alternative (Raw Fetch Handlers) and Why We Avoid It

An alternative is writing raw `fetch` handlers in `src/server.ts` that pattern-match on URL paths.
This is valid but loses:
- TypeScript end-to-end type safety
- Automatic serialization
- CSRF integration
- TanStack query integration (Phase 4)

Phase 3 uses `createServerFn` exclusively. The Phase 2 server functions remain as they are —
they are imported and called inside the `createServerFn` wrappers.

### How Cloudflare Worker Env Bindings Reach Server Functions

The Cloudflare Worker receives `env` as the second argument to `fetch(request, env, ctx)`.
In TanStack Start with Nitro, this binding is exposed via the `getEvent()` utility which exposes
`context.cloudflare.env`. This is the mechanism by which Supabase keys reach the DB layer.

---

## Phase 3 Sub-Phases (Ordered, Sequential)

```
3-A: Global Security Middleware Layer         ← Headers, CORS, error-to-status contract
3-B: Server Function File Structure           ← New file locations for all server functions
3-C: Wall (Unsaids) Server Functions          ← fetchFeed, fetchWinner, submitPost, reactToPost, fetchPostById
3-D: Duels Server Functions                   ← fetchActiveDuel, submitDuelVote
3-E: Auth Server Functions                    ← migrateGuestToAccount, refreshProfile
3-F: Warmth Server Functions                  ← claimDailyBonus, purchaseStoreItem
3-G: Moderation Server Functions              ← reportPost
3-H: Notifications Server Functions           ← savePushSubscription
3-I: Extended Verification (HTTP interface)   ← Extend phase2.test.ts to call server functions from client side
```

---

# PHASE 3-A — GLOBAL SECURITY MIDDLEWARE LAYER

**Relevant existing files:** `src/start.ts`, `src/server.ts`

**Current state:** `src/start.ts` has CSRF middleware for server functions only. `src/server.ts` handles catastrophic SSR errors. Neither applies security response headers or a global error → HTTP status mapping.

**Goal:** A single, centralized middleware that runs before every server function and every SSR render, enforcing security headers and shaping the error response format.

---

## Error-to-HTTP Status Code Contract

The most important design decision in Phase 3 is standardizing how errors become HTTP responses.
Every server function in Phase 2 throws plain JavaScript errors with descriptive messages.
Phase 3 defines exactly which error codes map to which HTTP status codes.

### Error Code Mapping (Authoritative Reference)

This table is the contract. The client (Phase 4) interprets status codes — not error messages.
Error messages may change; status codes are immutable.

| Error Code                 | HTTP Status | Client Interpretation                         |
|----------------------------|-------------|-----------------------------------------------|
| `MISSING_DEVICE_TOKEN`     | 400         | Device token not present — regenerate identity|
| `INVALID_DEVICE_TOKEN_*`   | 400         | Malformed token — regenerate identity         |
| `VALIDATION_ERROR`         | 400         | Input is malformed — show field error         |
| `ALREADY_REACTED`          | 409         | Duplicate tap — update UI immediately, no toast|
| `ALREADY_VOTED`            | 409         | Already voted — show "You voted" state        |
| `ALREADY_REPORTED`         | 409         | Already reported — show "Already flagged"     |
| `SELF_VETO_FORBIDDEN`      | 403         | Own post — show "Can't report own post"       |
| `NOT_FOUND`                | 404         | Post/duel gone — show "No longer available"   |
| `RATE_LIMIT_EXCEEDED`      | 429         | Show countdown using `X-RateLimit-Reset` header|
| `ALREADY_CLAIMED_TODAY`    | 409         | Daily bonus — update UI to "See you tomorrow" |
| `ALREADY_PURCHASED`        | 409         | Show "Already owned"                          |
| `INSUFFICIENT_WARMTH`      | 402         | Show current warmth balance, highlight deficit |
| `PROFILE_NOT_FOUND`        | 404         | Profile gone — trigger re-auth                |
| `ECHO_LIMIT_REACHED`       | 422         | Show "This post has reached its echo limit"   |
| `UNAUTHORIZED`             | 401         | JWT missing or expired — trigger sign-in flow |
| `UNEXPECTED_ERROR`         | 500         | Generic "Something went wrong, try again"     |

### Standard Response Envelope

Every server function response — success or failure — returns a JSON envelope with this exact shape:

```
Success:
{
  "ok": true,
  "data": { ...function-specific fields }
}

Failure:
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit reached: Maximum 3 confessions per hour."
  }
}
```

The client checks `ok` first. If `false`, it reads `error.code` to decide the UI response.
It never reads `error.message` for logic — only for display.

### Why This Envelope Matters for Phase 4

In Phase 4, the TanStack Query client wraps these calls. On `ok: false`, it throws an error.
The error has a `code` property the component reads. This creates a single pattern for all
error handling across every component in the app, with zero ad-hoc if/else on error messages.

---

## Security Response Headers (Applied to Every Response)

These headers are added in `src/start.ts` via a global middleware wrapper, not per-endpoint.

### Headers That Must Be Present on Every Response

**`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`**
- HSTS: forces all future connections to HTTPS. `max-age=63072000` is 2 years.
- `preload`: submits the domain to browser HSTS preload lists (eliminates first-visit downgrade attack).
- Applied after first HTTPS deploy. In local dev (HTTP), this header is omitted.

**`X-Content-Type-Options: nosniff`**
- Prevents browsers from MIME-sniffing a response's content type.
- Protects against attacks where a user-uploaded file is served as JavaScript.
- Always applied — zero exceptions.

**`X-Frame-Options: DENY`**
- Prevents the page from being embedded in `<iframe>`, `<frame>`, or `<object>`.
- Eliminates clickjacking attacks entirely.
- Applied to all HTML responses. API JSON responses also carry this header (defense in depth).

**`Referrer-Policy: strict-origin-when-cross-origin`**
- Sends full referrer for same-origin requests, only the origin for cross-origin HTTPS.
- Prevents user session data (URL parameters, tokens) from leaking in referrer headers.

**`Permissions-Policy: camera=(), microphone=(), geolocation=()`**
- Explicitly disables browser APIs this app does not use.
- Prevents permission escalation attacks even if JavaScript is compromised.

**`Content-Security-Policy` (CSP)**
- This is the most important header. Defines exactly where scripts, styles, and resources can load from.
- Phase 3 CSP (permissive — tightened in Phase 5):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'` — required by React SSR inline scripts; tightened to nonces in Phase 5
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `img-src 'self' data: blob:`
  - `connect-src 'self' https://qsloqqvdunfuyqqdmgil.supabase.co wss://qsloqqvdunfuyqqdmgil.supabase.co`
  - `frame-ancestors 'none'`
  - `report-uri /api/csp-report` (Phase 5 — for now, omitted)

**`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`**
- These are per-server-function response headers, not global.
- Added by the `checkRateLimit()` call in each server function.
- Client reads `X-RateLimit-Reset` (Unix timestamp) to show the countdown timer.

---

## CORS Policy

BajiHears is a Single-Page App served from its own domain. CORS configuration:

**Allowed origins:**
- `https://bajihears.com` (production)
- `https://*.pages.dev` (Cloudflare Pages preview deploys)
- `http://localhost:3000` and `http://localhost:5173` (local development)

**CORS headers on API responses:**
- `Access-Control-Allow-Origin`: matches the request origin from the allowed list, or denied
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-Device-Token, Authorization`
- `Access-Control-Max-Age: 86400` — preflight cache for 24 hours

**CORS on SSR HTML responses:** Not applicable — browsers don't apply CORS to navigation requests.

**Preflight (`OPTIONS`) handling:**
TanStack Start / Nitro handles `OPTIONS` preflight automatically for server functions.
For custom API routes (if any added in Phase 3), an explicit OPTIONS handler is added.

---

## Environment Binding Injection Pattern

Every `createServerFn` call needs to pass the Cloudflare Worker `env` object to the Phase 2
server functions. The pattern for doing this in TanStack Start with Nitro:

**The mechanism:** Nitro exposes the Cloudflare Worker runtime context via `getEvent()` from
`vinxi/http`. The `event.context.cloudflare.env` property contains all Worker environment bindings
(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY etc.).

**What this means in practice:**
- A helper utility is created at `src/server/lib/get-env.ts`
- It calls `getEvent()` internally and extracts `cloudflare.env`
- Every `createServerFn` implementation calls this helper at its very first line
- The extracted env object is passed to Phase 2 functions, exactly as in the test script

**Fallback for local development:**
In local dev (`npm run dev`), there is no Cloudflare Worker runtime. The fallback is
to read from `process.env` (populated from `.env.local` by Vite's `envPrefix`).
The helper reads from `cloudflare.env` first, falls back to `process.env` if not found.

**Important: The env object is NEVER serialized into the response.**
The helper is used only at the start of server-side code paths. The env values never
travel to the client. TypeScript types enforce this because `createServerFn` serializes
only the explicitly returned value, not the full function closure.

---

# PHASE 3-B — SERVER FUNCTION FILE STRUCTURE

**Current state:** All route files (`src/routes/*.tsx`) import from `@/client/lib/local-storage` for data access. No server functions exist yet.

**Goal:** A new set of files inside `src/routes/api/` that host all `createServerFn` exports.

---

## Why `src/routes/api/` (Not a Separate Folder)

TanStack Start uses file-based routing. Server functions live alongside their related routes.
By convention, non-page server utility files in `src/routes/` that do not export a `Route` object
are not treated as pages — they are just modules.

The `src/routes/api/` subfolder is chosen because:
- It mirrors the pattern of Next.js/Remix API routes — developers instantly understand it
- It keeps all server-callable functions discoverable in one place
- It is physically adjacent to the route files that will call them (Phase 4)
- TanStack does not treat non-Route-exporting files as pages — `api/` files are safe here

**Files created in Phase 3-B:**

```
src/routes/api/
├── wall.ts          ← fetchFeed, fetchWinner, submitPost, reactToPost, fetchPostById
├── duels.ts         ← fetchActiveDuel, submitDuelVote
├── auth.ts          ← migrateGuestToAccount, refreshProfile
├── warmth.ts        ← claimDailyBonus, purchaseStoreItem
├── moderation.ts    ← reportPost
└── notifications.ts ← savePushSubscription

src/server/lib/
└── get-env.ts       ← Cloudflare env extraction utility
```

**None of these files export a `Route` object.** They only export `createServerFn` instances.
Route files (`src/routes/*.tsx`) will import from these files in Phase 4.

---

## The Standard `createServerFn` Pattern (Applied to Every Function)

Every server function in `src/routes/api/` follows this identical pattern. The consistency
is intentional — it makes the codebase auditable, predictable, and easy to add to.

**Step 1 — Extract env:**
Call `getServerEnv()` from `src/server/lib/get-env.ts` to get the Cloudflare Worker env bindings.

**Step 2 — Parse and validate input:**
All input arrives as a single typed argument object. Validate required fields are present.
Throw a typed error (not a raw string) if validation fails.

**Step 3 — Delegate to Phase 2 function:**
Pass `env` and the validated input to the corresponding function from `src/server/functions/`.
Do NOT rewrite any business logic here — Phase 3 files are thin wrappers.

**Step 4 — Return the success envelope:**
Return `{ ok: true, data: { ...result } }`.

**Error handling (applies to every function via try/catch):**
All errors thrown by Phase 2 functions (DeviceTokenError, RateLimitError, plain Error)
are caught by a single `wrapServerFn` utility at the `createServerFn` level.
`wrapServerFn` maps the error to the correct HTTP status using the error code table (Phase 3-A).
It returns `{ ok: false, error: { code, message } }`.

**Important: TanStack Start server functions do not set HTTP status codes directly.**
They return serializable values. The HTTP status mapping is achieved by throwing a
`ServerFnError` (a TanStack-provided class) with a `statusCode` property when the
error needs to be reflected in the response status. For display-only errors (rate limits,
validation), returning `{ ok: false }` is sufficient — the client interprets `ok: false`.

---

# PHASE 3-C — WALL SERVER FUNCTIONS

**File:** `src/routes/api/wall.ts`

**Phase 2 functions wrapped:** `fetchFeed`, `fetchWinner`, `submitPost`, `reactToPost`, `fetchPostById`

---

## `apiFetchFeed`

**Type:** `createServerFn` — callable from route loaders and React components
**HTTP method:** GET (implied by TanStack Start for non-mutating server functions)
**Input shape:** `{ category?: string, page?: number, limit?: number }`
**Validation:**
- `page` must be a non-negative integer if provided; default 0
- `limit` must be between 1 and 50 if provided; default 20; server caps at 50 regardless
- `category` must be one of the 5 valid values if provided; otherwise omit category filter

**Env injection:** `getServerEnv()` at the top of the function body.

**Delegation:** `fetchFeed(env, { category, page, limit })`

**Response shape:**
```
{
  ok: true,
  data: {
    posts: Unsaid[],   // array of FeedPost objects, internal fields stripped
    page: number,
    limit: number,
    hasMore: boolean
  }
}
```

**Cache hint:** This function adds a `Cache-Control: public, s-maxage=30` hint.
Cloudflare edge cache respects this in Phase 5 when caching is configured.
In Phase 3, the header is set but no caching is active yet.

**Who calls it in Phase 4:** `src/routes/index.tsx` in its `loader()` function for initial SSR data,
and again on the client side for pagination and category filtering.

---

## `apiFetchWinner`

**Type:** `createServerFn`
**HTTP method:** GET
**Input shape:** None (no arguments)
**Env injection:** `getServerEnv()`
**Delegation:** `fetchWinner(env)`

**Response shape:**
```
{
  ok: true,
  data: {
    winner: Unsaid,
    hook: string,
    isFallback: boolean
  }
}
```

**Cache hint:** `Cache-Control: public, s-maxage=300` — 5 minute edge cache in Phase 5.
Winner only changes every 12 hours (Phase 6 cron). 5-minute cache is conservative but
still collapses ~99% of repeated loads.

**Who calls it in Phase 4:** `src/routes/index.tsx` in its `loader()` for the winner card.

---

## `apiSubmitPost`

**Type:** `createServerFn` with `method: 'POST'`
**HTTP method:** POST
**Authentication level:** Anonymous (device token required, no JWT needed)

**Input shape:**
```
{
  text: string,
  category: Category,
  preset?: string,
  handle?: string | null,
  deviceToken: string
}
```

**Validation at this layer (before delegating to Phase 2):**
- `text` is present and is a string (Phase 2 handles length and content)
- `category` is present (Phase 2 handles validity against CATEGORIES constant)
- `deviceToken` is present (Phase 2 middleware handles format validation)
- No profileId in input — Phase 3 does not handle JWT auth yet. ProfileId association
  comes in Phase 4 when the client can pass the session JWT.

**Delegation:** `submitPost(env, input)`

**Response shape:**
```
{
  ok: true,
  data: {
    id: string,
    status: "published" | "review",
    createdAt: number,
    message: string
  }
}
```

**Error cases handled:**
- `DeviceTokenError` → returns `{ ok: false, error: { code: "MISSING/INVALID_DEVICE_TOKEN", message } }`
- `RateLimitError` → returns `{ ok: false, error: { code: "RATE_LIMIT_EXCEEDED", message } }` with rate limit headers
- Spam shadow review is NOT an error — it returns `ok: true` with `status: "review"`
- Any other thrown error → `{ ok: false, error: { code: "UNEXPECTED_ERROR", message: "Something went wrong" } }`

**CSRF protection:** Automatically applied by the `csrfMiddleware` in `src/start.ts`
because this is a mutating `createServerFn` (POST). The client must include the CSRF token.
TanStack Start handles this automatically on the client side — no manual token management.

---

## `apiReactToPost`

**Type:** `createServerFn` with `method: 'POST'`
**Input shape:**
```
{
  postId: string,
  reactionKey: ReactionKey,   // "heart" | "sad" | "fire" | "hug"
  deviceToken: string
}
```

**Validation:**
- `postId` must be a non-empty string (UUID format validation is done in Phase 2)
- `reactionKey` must be one of the 4 valid values
- `deviceToken` must be present

**Delegation:** `reactToPost(env, input)`

**Response shape (success):**
```
{
  ok: true,
  data: {
    reactions: { heart: number, sad: number, fire: number, hug: number }
  }
}
```

**Error cases:**
- `ALREADY_REACTED` → `{ ok: false, error: { code: "ALREADY_REACTED" } }` — client silently treats as success (the tap already happened)
- `RATE_LIMIT_EXCEEDED` → 429 pattern with `X-RateLimit-Reset`
- `NOT_FOUND` → post no longer visible; client removes the card from the feed

**Optimistic update design note (for Phase 4):**
The client increments the reaction counter immediately on tap (optimistic update).
If the server returns `ALREADY_REACTED`, the client does nothing (counter was already correct).
If the server returns an error, the client rolls back the counter increment.
This pattern makes reactions feel instant even on slow connections.

---

## `apiFetchPostById`

**Type:** `createServerFn`
**Input shape:** `{ id: string }`
**Delegation:** `fetchPostById(env, id)`

**Response shape:**
```
{
  ok: true,
  data: {
    post: Unsaid | null
  }
}
```

**Who calls it:** `src/routes/read.tsx` — the share link reading page. When a user opens a
share URL (`/c/{id-fragment}`), this function fetches the specific post.

---

# PHASE 3-D — DUELS SERVER FUNCTIONS

**File:** `src/routes/api/duels.ts`

---

## `apiFetchActiveDuel`

**Type:** `createServerFn`
**Input shape:** `{ deviceToken?: string }` — optional, for "already voted" status
**Delegation:** `fetchActiveDuel(env, deviceToken)`

**Response shape:**
```
{
  ok: true,
  data: {
    duel: Duel | null,
    alreadyVoted: boolean,
    userChoice?: 0 | 1
  }
}
```

**Who calls it:** `src/routes/duel.tsx` in its `loader()` function.

---

## `apiSubmitDuelVote`

**Type:** `createServerFn` with `method: 'POST'`
**Input shape:**
```
{
  duelId: string,
  choiceIndex: 0 | 1,
  deviceToken: string
}
```

**Validation:**
- `choiceIndex` must be exactly `0` or `1` — no other value accepted
- `duelId` must be a non-empty string

**Delegation:** `submitDuelVote(env, input)`

**Response shape:**
```
{
  ok: true,
  data: {
    choiceIndex: 0 | 1,
    votesA: number,
    votesB: number
  }
}
```

**Error cases:**
- `ALREADY_VOTED` → `{ ok: false, error: { code: "ALREADY_VOTED" } }` — client shows "You voted" state
- `INVALID_DEVICE_TOKEN_*` → prompt user to refresh

---

# PHASE 3-E — AUTH SERVER FUNCTIONS

**File:** `src/routes/api/auth.ts`

---

## `apiMigrateGuestToAccount`

**Type:** `createServerFn` with `method: 'POST'`
**Authentication level:** JWT required (user just signed in via Google OAuth)

**Input shape:**
```
{
  deviceToken: string,
  handle: string,
  avatarSeed?: number
}
```

**JWT extraction at this layer:**
TanStack Start server functions run on the server and have access to the request object
via `getEvent()`. The `Authorization: Bearer <jwt>` header is read from `getEvent().node.req`
(or the equivalent Cloudflare Request object). The JWT is passed to the Phase 2 auth function
to verify and extract `userId`.

**Important distinction:** Phase 3 is responsible for extracting the JWT from the HTTP request.
Phase 2's `migrateGuestToAccount` expects the userId already extracted. So Phase 3's auth server
function:
1. Reads the `Authorization` header
2. Calls the Supabase anon client's `getUser(jwt)` to verify and extract `userId`
3. Passes `userId` + `deviceToken` to `migrateGuestToAccount(env, { userId, deviceToken, handle, avatarSeed })`

**Where the JWT comes from:** After Google OAuth, Supabase issues a session JWT.
The client stores it and passes it as `Authorization: Bearer <token>` in the `createServerFn` call.
TanStack Start's serialization layer preserves custom headers.

**Response shape:**
```
{
  ok: true,
  data: {
    profile: DbProfile   // the full, hydrated profile — client stores this
  }
}
```

**Error cases:**
- `UNAUTHORIZED` (no JWT or invalid JWT) → 401, client triggers re-sign-in
- `PROFILE_NOT_FOUND` after creation → 500, client shows generic error and re-signs in

---

## `apiRefreshProfile`

**Type:** `createServerFn`
**Authentication level:** JWT required

**Input shape:** None (userId extracted from JWT)

**Delegation:** `refreshProfile(env, userId)`

**Response shape:**
```
{
  ok: true,
  data: {
    profile: DbProfile
  }
}
```

**Who calls it:** Called on every app load by signed-in users to sync their server profile
to local React state. If the profile has changed (warmth, purchased items, tabs unlocked),
the client updates its in-memory state.

---

# PHASE 3-F — WARMTH SERVER FUNCTIONS

**File:** `src/routes/api/warmth.ts`

---

## `apiClaimDailyBonus`

**Type:** `createServerFn` with `method: 'POST'`
**Authentication level:** JWT required

**Input shape:** None (userId extracted from JWT)

**Delegation:** `claimDailyBonus(env, userId)`

**Response shape:**
```
{
  ok: true,
  data: {
    warmthTotal: number,
    visitStreak: number,
    lastVisit: string,       // YYYY-MM-DD
    bonusAwarded: number,    // the warmth amount awarded this claim
    warmthLog: WarmthLogEntry[]
  }
}
```

**Error cases:**
- `ALREADY_CLAIMED_TODAY` → `{ ok: false, error: { code: "ALREADY_CLAIMED_TODAY" } }`
  Client updates the warmth orb text to "See you tomorrow" without an error toast
- `UNAUTHORIZED` → 401

**When it is called:** On every app load for signed-in users. If `ALREADY_CLAIMED_TODAY`
is returned, the client skips the toast. If a new claim succeeds, the client shows the
streak toast (currently hardcoded in `__root.tsx` using localStorage — Phase 4 will wire this
to the server response instead).

---

## `apiPurchaseStoreItem`

**Type:** `createServerFn` with `method: 'POST'`
**Authentication level:** JWT required

**Input shape:**
```
{
  itemId: string   // must be one of the STORE_ITEMS ids
}
```

**Delegation:** `purchaseStoreItem(env, userId, itemId)`

**Response shape:**
```
{
  ok: true,
  data: {
    warmthTotal: number,
    purchasedItems: string[],
    purchasedItem: StoreItem
  }
}
```

**Error cases:**
- `ALREADY_PURCHASED` → `{ ok: false, error: { code: "ALREADY_PURCHASED" } }` — show "Already owned" badge
- `INSUFFICIENT_WARMTH` → `{ ok: false, error: { code: "INSUFFICIENT_WARMTH", message: "Need X more warmth" } }`
- `UNAUTHORIZED` → 401

---

# PHASE 3-G — MODERATION SERVER FUNCTIONS

**File:** `src/routes/api/moderation.ts`

---

## `apiReportPost`

**Type:** `createServerFn` with `method: 'POST'`
**Authentication level:** Anonymous (device token only — reporting does not require sign-in)

**Input shape:**
```
{
  postId: string,
  deviceToken: string
}
```

**Delegation:** `reportPost(env, input)`

**Response shape:**
```
{
  ok: true,
  data: {
    reported: boolean,
    message: string
  }
}
```

**Error cases:**
- `SELF_VETO_FORBIDDEN` → `{ ok: false, error: { code: "SELF_VETO_FORBIDDEN" } }` — show "Can't report your own post"
- `ALREADY_REPORTED` → `{ ok: false, error: { code: "ALREADY_REPORTED" } }` — show "Already flagged"
- `RATE_LIMIT_EXCEEDED` → show countdown

---

# PHASE 3-H — NOTIFICATIONS SERVER FUNCTIONS

**File:** `src/routes/api/notifications.ts`

---

## `apiSavePushSubscription`

**Type:** `createServerFn` with `method: 'POST'`
**Authentication level:** JWT required

**Input shape:**
```
{
  subscription: {
    endpoint: string,
    keys: {
      p256dh: string,
      auth: string
    }
  }
}
```

**JWT extraction:** Same pattern as auth functions — reads `Authorization` header, verifies, extracts `userId`.

**Delegation:** `savePushSubscription(env, { userId, subscription })`

**Response shape:**
```
{
  ok: true,
  data: { saved: boolean }
}
```

**Error cases:**
- Missing or malformed `endpoint` → 400 validation error
- `UNAUTHORIZED` → 401

---

# PHASE 3-I — GET-ENV UTILITY

**New file:** `src/server/lib/get-env.ts`

**Purpose:** Single place where Cloudflare Worker env bindings are extracted.
Every server function in `src/routes/api/` imports this utility.

**What it does:**
1. Attempts to call `getEvent()` from `vinxi/http` (TanStack Start's server context accessor)
2. Reads `event.context.cloudflare?.env` from the Cloudflare runtime context
3. If `cloudflare.env` is not available (local dev), reads from `import.meta.env` (Vite's env)
   and/or `process.env` as fallback
4. Returns a typed `DatabaseEnv` object matching what Phase 2 functions expect

**Why a separate utility (not inline in each server function):**
If the Cloudflare binding name changes (e.g., `SUPABASE_URL` becomes `DATABASE_URL`),
only this one file needs updating. All 10+ server functions update for free.

**Security guarantee:**
This function only runs inside server-context code paths (`createServerFn` implementations).
It is never imported by any file in `src/client/` or `src/routes/*.tsx` component bodies.
The 3-zone import rule (from Phase 1) enforces this.

---

# PHASE 3-J — WRAP SERVER FUNCTION UTILITY

**New file:** `src/server/lib/wrap-server-fn.ts`

**Purpose:** A single higher-order utility that wraps every `createServerFn` handler
to provide consistent error catching and response envelope formatting.

**What it does:**
1. Accepts an async handler function as its argument
2. Calls the handler in a try/catch
3. On success: returns `{ ok: true, data: result }`
4. On error: maps the error to the error envelope using the code table from Phase 3-A
5. Never throws — always returns a serializable object

**Why this is critical for bulk traffic:**
If any Phase 2 function throws an unexpected error (network timeout to Supabase, unexpected DB error),
without this wrapper the server function throws an unhandled rejection that Cloudflare Workers
surface as a 500 with no useful body. With the wrapper, every error becomes `{ ok: false, error }`.
The client always gets a structured response it can handle. No silent failures for users.

**The error mapping logic:**
```
DeviceTokenError → MISSING_DEVICE_TOKEN / INVALID_DEVICE_TOKEN_* (status 400)
RateLimitError   → RATE_LIMIT_EXCEEDED (status 429), also attaches rate limit headers
Error.message contains "already reacted"   → ALREADY_REACTED (status 409)
Error.message contains "already voted"     → ALREADY_VOTED (status 409)
Error.message contains "Author cannot"     → SELF_VETO_FORBIDDEN (status 403)
Error.message contains "already claimed"   → ALREADY_CLAIMED_TODAY (status 409)
Error.message contains "Already purchased" → ALREADY_PURCHASED (status 409)
Error.message contains "Insufficient"      → INSUFFICIENT_WARMTH (status 402)
Error.message contains "not found"         → NOT_FOUND (status 404)
All others                                 → UNEXPECTED_ERROR (status 500)
```

The mapping reads from `error.code` first (structured errors), then falls back to
`error.message` pattern matching (plain errors). This ensures both DeviceTokenError
and plain `new Error("...")` from Phase 2 are handled correctly.

---

# PHASE 3-K — EXTENDED VERIFICATION

**Additions to:** `src/server/__tests__/phase2.test.ts`

The Phase 2 test verified function-to-function calls internally.
Phase 3 verification must confirm the createServerFn wrapping is correct.

However, `createServerFn` handlers are only callable from within TanStack Start's runtime —
they cannot be tested directly with `node --import tsx`. The Phase 3 test strategy is therefore:

**Method:** Direct invocation of the `createServerFn` handler callbacks (before the HTTP
serialization layer wraps them). This is identical to the Phase 2 test approach but now calls
the Phase 3 wrapper directly, verifying:

**What Phase 3 verification tests:**

| Test ID | Target Layer | Verification |
|---------|-------------|--------------|
| V-01 | `wrapServerFn` utility | Clean result returns `{ ok: true, data: ... }` |
| V-02 | `wrapServerFn` utility | DeviceTokenError returns `{ ok: false, error: { code: "MISSING_DEVICE_TOKEN" } }` |
| V-03 | `wrapServerFn` utility | RateLimitError returns `{ ok: false, error: { code: "RATE_LIMIT_EXCEEDED" } }` |
| V-04 | `apiFetchFeed` handler  | Returns `{ ok: true, data: { posts: [], page: 0, hasMore: false } }` |
| V-05 | `apiSubmitPost` handler | Returns `{ ok: true, data: { id, status, createdAt } }` on valid input |
| V-06 | `apiSubmitPost` handler | Returns `{ ok: false, error: { code: "MISSING_DEVICE_TOKEN" } }` on missing token |
| V-07 | `apiFetchWinner` handler| Returns `{ ok: true, data: { winner, hook, isFallback } }` |
| V-08 | `apiReactToPost` handler| Returns `{ ok: true, data: { reactions } }` on first reaction |
| V-09 | `apiReactToPost` handler| Returns `{ ok: false, error: { code: "ALREADY_REACTED" } }` on duplicate |
| V-10 | `apiSubmitDuelVote`     | Returns `{ ok: true, data: { choiceIndex, votesA, votesB } }` |

**10 verification tests, all passing, before Phase 4 begins.**

---

# Complete File List for Phase 3

## New Files Created

```
src/server/lib/get-env.ts             ← Cloudflare env binding extractor
src/server/lib/wrap-server-fn.ts      ← Error catching + response envelope utility
src/routes/api/wall.ts               ← apiFetchFeed, apiFetchWinner, apiSubmitPost, 
                                         apiReactToPost, apiFetchPostById
src/routes/api/duels.ts              ← apiFetchActiveDuel, apiSubmitDuelVote
src/routes/api/auth.ts               ← apiMigrateGuestToAccount, apiRefreshProfile
src/routes/api/warmth.ts             ← apiClaimDailyBonus, apiPurchaseStoreItem
src/routes/api/moderation.ts         ← apiReportPost
src/routes/api/notifications.ts      ← apiSavePushSubscription
```

## Modified Files

```
src/start.ts      ← Add security response headers middleware
src/server.ts     ← Add CORS origin checking in the Worker fetch handler
```

## Unchanged Files (Zero Modifications)

```
src/server/functions/*.ts     ← Phase 2 functions unchanged
src/server/db/*.ts            ← Phase 2 DB modules unchanged
src/server/middleware/*.ts    ← Phase 2 middleware unchanged
src/routes/*.tsx              ← Route files unchanged until Phase 4
```

---

# How Phase 3 Connects to Phase 4

Phase 4 is the **Client Wiring Layer** — replacing localStorage data access with server function calls.

In Phase 4:
- `src/routes/index.tsx` imports `apiFetchFeed`, `apiFetchWinner` from `src/routes/api/wall.ts`
- The route `loader()` function calls these server functions for SSR data pre-loading
- TanStack Query client wraps the server function calls for caching, background refresh, and optimistic updates
- `localStorage` is demoted from primary data source to client-side optimistic state mirror
- The response envelope (`{ ok, data, error }`) is the only data contract between client and server

Phase 3's `wrapServerFn` utility and the error code table are the foundation that Phase 4's
TanStack Query wrappers are built on. Without Phase 3's consistent envelope format, Phase 4
would have ad-hoc error handling in every component — the single most common cause of brittle
React codebases.

---

# What I Need From You Before Phase 3 Starts

> [!IMPORTANT]
> Phase 3 has **zero prerequisites** from you. Everything is automatable.
> There are no Supabase migrations. No new credentials. No manual steps.
>
> When you say "proceed", I execute Phase 3 completely:
> - Create all files
> - Run the 10 verification tests against your live Supabase database
> - Run `npm run build` to confirm Cloudflare Worker compiles cleanly
> - Commit and push to `origin/main`

However, one **optional decision** I would like your input on:

### Optional: Should the API endpoint paths be versioned?

Standard API versioning adds `/v1/` to paths for future compatibility: e.g., `api/wall` becomes `/api/v1/wall`.

**Option A — No versioning (recommended for Phase 3):**
- Simpler. All paths stay as `api/wall`, `api/duels`, etc.
- Easy to add `/v1/` in a later phase when needed
- No overhead in Phase 3

**Option B — Version immediately:**
- Paths become `/api/v1/wall`, `/api/v1/duels`, etc.
- More future-proof if you expect third-party clients
- Slightly more boilerplate now

For a single-team app with an internal client, Option A is correct.
For an app you expect to expose as a public API to third parties eventually, Option B.

**I will default to Option A unless you say otherwise.** Tell me to start and Phase 3 executes immediately.

---

*End of Phase 3 Plan*
*Next: Phase 4 — Client Wiring Layer (replace localStorage with server function calls, TanStack Query integration)*
