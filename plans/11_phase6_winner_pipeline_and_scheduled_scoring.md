# Phase 6 — Automated 12-Hour Winner Pipeline, Algorithmic Scoring Engine & Edge-Cached Hero Delivery
*Exhaustive Master Implementation Plan for Senior Engineering Execution*

---

> [!IMPORTANT]
> **Prerequisite Gate:** Phase 4 ([09_phase4_real_data_wiring.md](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/plans/09_phase4_real_data_wiring.md)) and Phase 5 ([10_phase5_server_spam_and_multi_tier_moderation.md](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/plans/10_phase5_server_spam_and_multi_tier_moderation.md)) must be fully deployed and operational.
> The database contains clean, verified confessions with atomic rate limiting and multi-tier moderation actively shielding the feed.
> Phase 6 establishes the **heartbeat of BajiHears**: the automated 12-hour cycle engine that selects, crowns, hooks, and edge-caches the most resonant confession across the platform.

> [!NOTE]
> **Implementation Standard:** This document contains **no application code implementations**. It is a comprehensive architectural, mathematical, and infrastructural blueprint engineered for a principal software engineer. It specifies exact mathematical decay models, atomic database procedures, idempotency guarantees, Cloudflare edge caching policies, and developer verification suites.

---

## Part 0: Executive Architecture & System Overview

### 0-A: The 12-Hour Synchronous Cultural Cycle

BajiHears operates on an intentional, synchronous psychological rhythm (`CYCLE_MS = 12 * 3600 * 1000`), anchored to **00:00 UTC** and **12:00 UTC**:

- **00:00 UTC (05:00 AM PKT):** The "Dawn Crown" — captures the raw, vulnerable midnight and late-night confessions of students and young adults across the region.
- **12:00 UTC (05:00 PM PKT):** The "Dusk Crown" — captures daytime campus tension, relationship breakthroughs, commute reflections, and unexpressed thoughts.

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                 12-HOUR CYCLE TIMELINE                      │
                  └─────────────────────────────────────────────────────────────┘
  Cycle N Start                                                                   Cycle N Close
   [00:00 UTC] ────────────────────────── 12 Hours ──────────────────────────► [12:00 UTC]
        │                                                                             │
        │ Confessions submitted, reactions accumulated, echoes appended               │
        │ Status: published, veto_count: 0                                            │
        ▼                                                                             ▼
 ┌──────────────┐                                                           ┌───────────────────┐
 │ Hero Card:   │                                                           │ Scheduled Cron:   │
 │ Displays     │                                                           │ • Score cycle     │
 │ Cycle N-1    │                                                           │ • Crown winner N  │
 │ Winner       │                                                           │ • Purge edge CDN  │
 └──────────────┘                                                           │ • Dispatch Push   │
                                                                            └───────────────────┘
```

---

### 0-B: System Architecture Topology

The Phase 6 winner pipeline is architected across four distinct execution layers to ensure **zero downtime, zero race conditions, sub-50ms global hero delivery, and strict idempotency**:

```mermaid
graph TD
    subgraph Trigger Layer
        CRON[Cloudflare Cron / pg_cron: 0 0,12 * * *]
        MANUAL[Supabase Admin Manual Override]
    end

    subgraph Execution & Compute Layer
        ENDPOINT[/api/cron/winner-cycle Endpoint]
        AUTH_GUARD[Bearer CRON_SECRET & Cloudflare Worker Verification]
        JOB[server/jobs/winner-selection.ts]
        SQL_ENGINE[PostgreSQL Stored Procedure: select_and_crown_winner]
    end

    subgraph Data & Persistence Layer
        DB[(Supabase PostgreSQL)]
        UNSAIDS_TABLE[unsaids: is_winner=true, winner_cycle, winner_hook]
        CYCLE_LOG[winner_cycles: audit log & metrics]
    end

    subgraph Delivery & Edge Cache Layer
        EDGE_CACHE[Cloudflare Edge Cache: s-maxage=300, SWR=3600]
        WINNER_FN[server/functions/posts.ts: fetchWinner]
        CLIENT_HOOK[client/hooks/use-winner.ts: React Query]
        HERO_CARD[client/components/bajihears/WinnerHeroCard.tsx]
        PUSH_QUEUE[Phase 7 Push Dispatch Bridge]
    end

    CRON -->|HTTP POST with Secret| ENDPOINT
    MANUAL -->|Direct DB Update| UNSAIDS_TABLE
    ENDPOINT --> AUTH_GUARD
    AUTH_GUARD --> JOB
    JOB --> SQL_ENGINE
    SQL_ENGINE --> DB
    DB --> UNSAIDS_TABLE
    DB --> CYCLE_LOG
    SQL_ENGINE -->|Post Winner Crowned| PUSH_QUEUE
    
    HERO_CARD --> CLIENT_HOOK
    CLIENT_HOOK --> WINNER_FN
    WINNER_FN --> EDGE_CACHE
    EDGE_CACHE -.->|Cache Hit <15ms| CLIENT_HOOK
    EDGE_CACHE -->|Cache Miss| DB
```

---

### 0-C: Subsystem State Transition Matrix

| Subsystem | State Before Phase 6 | Target Production State (After Phase 6) |
|---|---|---|
| **Winner Selection Mechanism** | Hardcoded static fallback object (`FALLBACK_WINNER`) in `fallback-winner.ts`. Zero automated calculation. | Automated 12-hour idempotent scoring pipeline executed via atomic database procedure with sub-10ms query execution. |
| **Scoring Formula** | Rudimentary client-side helper in `scoring.ts` evaluating arbitrary posts in memory without cycle boundary guards. | Mathematically weighted multi-signal scoring model incorporating reaction tiers, echo depth, continuous half-life decay, and veto disqualifiers. |
| **Winner Storage Schema** | Boolean `is_winner` and timestamp `winner_cycle` on `unsaids`, but lacking editorial hook text and cycle execution history. | Full schema support including `winner_hook` column, partial unique index preventing duplicate winners per cycle, and a dedicated `winner_cycles` audit ledger. |
| **Hero Card Caching** | Direct database query on every client page load without edge-level caching headers. | Cloudflare Edge Cache (`s-maxage=300, stale-while-revalidate=3600`) delivering sub-20ms hero reads with surrogate tag invalidation. |
| **Cycle Transition UX** | Static countdown timer with no synchronization to live cron execution. | Synchronized countdown timer with automatic query cache invalidation and subtle micro-celebration animation upon crown transition. |
| **Curator Controls** | None. No mechanism to pin or manually crown an exceptional confession. | Idempotent manual override capability allowing editorial crowning directly via Supabase without cron collision. |

---

## Part 1: Database Schema Enhancements & Index Strategy

### 1-A: Schema Modifications on `unsaids`

The `unsaids` table must be enhanced to support editorial presentation and cycle integrity:

1. **`winner_hook` (TEXT, nullable):**
   - Stores the evocative, contextual editorial headline (e.g., *"The whole wall felt this confession."*, *"2 AM thoughts that struck a chord."*).
   - Generated during the scoring execution based on post category, sentiment, and cycle timestamp.
2. **`winner_score` (NUMERIC(10, 2), nullable):**
   - The exact calculated score at the moment of crowning.
   - Preserves mathematical transparency for platform analytics and historical leaderboards.
3. **Partial Unique Constraint (`idx_single_winner_per_cycle`):**
   - Enforces database-level constraint that **only one post may hold `is_winner = true` for any given `winner_cycle` timestamp**.
   - Guarantees that concurrent cron triggers or race conditions can never produce conflicting winners.

---

### 1-B: The `winner_cycles` Audit Ledger Table

A dedicated table to record the full execution telemetry of every 12-hour cycle:

```
Table: winner_cycles
├── id: UUID (Primary Key, default gen_random_uuid())
├── cycle_start: TIMESTAMPTZ (NOT NULL)
├── cycle_end: TIMESTAMPTZ (NOT NULL)
├── crowned_post_id: UUID (Foreign Key -> unsaids.id, ON DELETE SET NULL)
├── winning_score: NUMERIC(10, 2) (NOT NULL)
├── total_eligible_posts: INTEGER (NOT NULL)
├── total_reactions_evaluated: INTEGER (NOT NULL)
├── execution_duration_ms: INTEGER (NOT NULL)
├── status: TEXT (CHECK: 'crowned', 'skipped_empty', 'manual_override')
├── triggered_by: TEXT (CHECK: 'cron', 'admin_manual', 'recovery_job')
├── hook_applied: TEXT (NOT NULL)
└── created_at: TIMESTAMPTZ (default now())
```

**Indexes for Audit Ledger:**
- `UNIQUE INDEX idx_winner_cycles_range ON winner_cycles(cycle_start, cycle_end)`
- `INDEX idx_winner_cycles_crowned_post ON winner_cycles(crowned_post_id)`

---

### 1-C: Performance Covering Indexes for Fast Scoring

To score hundreds or thousands of confessions within a 12-hour window in milliseconds without table scans:

1. **Covering Query Index:**
   ```sql
   CREATE INDEX idx_unsaids_cycle_scoring 
   ON unsaids (status, created_at, is_winner) 
   INCLUDE (id, reactions, veto_count, category);
   ```
   *Rationale:* Allows the PostgreSQL engine to calculate scores directly from the Index-Only Scan without reading the primary table heap.

2. **Winner Fetch Index:**
   ```sql
   CREATE INDEX idx_unsaids_latest_winner 
   ON unsaids (is_winner, winner_cycle DESC) 
   WHERE is_winner = true;
   ```
   *Rationale:* Guarantees `fetchWinner` executes in <1ms by reading only the single top row of the partial index.

---

## Part 2: The Algorithmic Scoring Engine

### 2-A: Multi-Factor Signal Weighting

Confessions compete on **resonance**, not raw volume. The scoring algorithm balances high-intensity reactions, verbal echo depth, time decay, and safety vetoes:

```
                              ┌────────────────────────────────────────┐
                              │       RAW RESONANCE SCORE (R)          │
                              └────────────────────────────────────────┘
                                                  │
            ┌───────────────────┬─────────────────┴─────────────────┬───────────────────┐
            ▼                   ▼                                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐                   ┌───────────────┐   ┌───────────────┐
    │ Heart (x2.5)  │   │  Fire (x2.0)  │                   │  Hug (x2.0)   │   │  Sad (x1.5)   │
    │ Deep Empathy  │   │ Relatability  │                   │ Comfort/Solace│   │ Shared Grief  │
    └───────────────┘   └───────────────┘                   └───────────────┘   └───────────────┘
            │                   │                                   │                   │
            └───────────────────┴─────────────────┬─────────────────┴───────────────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │   Reaction Sum (Rs)   │
                                      └───────────────────────┘
                                                  │
                                                  ▼
                               ┌─────────────────────────────────────┐
                               │       ECHO DEPTH MULTIPLIER (E)     │
                               │   Echo Count x 4.0 (Active Voice)   │
                               └─────────────────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │   Raw Score = Rs + E          │
                                  └───────────────────────────────┘
```

#### Signal Weights Rationale:
1. **Heart (`2.5`):** The primary emotional currency of BajiHears. Represents profound vulnerability and resonance.
2. **Fire (`2.0`):** High energy, unfiltered honesty, or communal hype.
3. **Hug (`2.0`):** Compassion and solidarity; vital for confessions of loneliness or anxiety.
4. **Sad (`1.5`):** Somber acknowledgment; slightly lower weight to avoid algorithmic bias toward purely depressing content.
5. **Echo Depth (`4.0` per echo):** Writing a thoughtful reply requires significantly higher cognitive commitment than tapping an emoji. A post that triggers active community dialogue receives substantial score boosting.

---

### 2-B: Continuous Exponential Half-Life Decay

A confession posted 11 hours ago with 50 reactions should not automatically defeat a brilliant confession posted 2 hours ago with 35 reactions.

We apply a **continuous exponential half-life decay** model:

$$\text{Decay}(t) = 0.5^{\frac{\Delta t}{\tau}}$$

Where:
- $\Delta t$ is the elapsed age in hours from post creation to cycle closing:
  $$\Delta t = \frac{\text{cycle\_end} - \text{created\_at}}{3,600,000\text{ ms}}$$
- $\tau = 8.0\text{ hours}$ (the half-life constant).
- At $\Delta t = 0\text{ hrs}$ (posted at cycle end): $\text{Decay} = 1.000$ (100% value).
- At $\Delta t = 4\text{ hrs}$: $\text{Decay} = 0.707$ (70.7% value).
- At $\Delta t = 8\text{ hrs}$: $\text{Decay} = 0.500$ (50.0% value).
- At $\Delta t = 12\text{ hrs}$ (posted at cycle start): $\text{Decay} = 0.354$ (35.4% value).

$$\text{FinalScore} = (\text{RawScore}) \times \text{Decay}(t)$$

---

### 2-C: Safety Veto Penalties & Eligibility Gates

Before computing resonance, every candidate confession must pass strict eligibility gates:

1. **Status Gate:** Must strictly equal `published`. Any confession in `review`, `rejected`, or `pending` is hard-excluded.
2. **Winner Invariance:** `is_winner = false`. A confession cannot win two cycles.
3. **Veto Penalty Matrix:**
   - `veto_count = 0`: 100% score retention (no penalty).
   - `veto_count = 1`: 15% score reduction ($\text{FinalScore} \times 0.85$).
   - `veto_count = 2`: 40% score reduction ($\text{FinalScore} \times 0.60$).
   - `veto_count >= 3`: **Automatic Disqualification** from winner consideration (even if not yet quarantined at the 5-report threshold). Community ambiguity prevents risk of elevating controversial or borderline abusive posts to the Hero banner.
4. **Minimum Substance Threshold:**
   - Must contain at least **5 words**.
   - Must have at least **3 total reactions or echoes**. (A post with 0 engagement cannot be crowned winner).

---

### 2-D: Deterministic Tie-Breaking Cascade

If two confessions yield identical final scores (within a tolerance of $\pm 0.01$), the tie is resolved deterministically:

1. **Primary Tie-Breaker:** Highest Echo Count (Active community conversation takes precedence).
2. **Secondary Tie-Breaker:** Highest Heart Reaction Count.
3. **Tertiary Tie-Breaker:** Earliest Submission Timestamp (`created_at ASC` — rewards the pioneer).
4. **Quaternary Tie-Breaker:** Lexicographical sort on UUID (`id ASC` — guarantees zero randomness in automated runs).

---

## Part 3: Editorial Hook Generation & Contextual Framing

A winner card cannot simply present naked text. BajiHears's emotional brand relies on **editorial voice**—a resonant one-sentence frame that contextualizes the confession for the entire community.

### 3-A: Contextual Hook Matrix

The hook generator evaluates the winning confession's **category**, **cycle window (Dawn vs Dusk)**, and **dominant reaction**:

```
                                  ┌─────────────────────────────┐
                                  │   WINNER HOOK MATRIX        │
                                  └─────────────────────────────┘
                                                 │
          ┌──────────────────────┬───────────────┴──────────────┬──────────────────────┐
          ▼                      ▼                              ▼                      ▼
  ┌───────────────┐      ┌───────────────┐              ┌───────────────┐      ┌───────────────┐
  │  Confession   │      │  Heartbreak   │              │   Wholesome   │      │   Academic    │
  └───────────────┘      └───────────────┘              └───────────────┘      └───────────────┘
          │                      │                              │                      │
          ▼                      ▼                              ▼                      ▼
   "Said in secret,       "Some unsaids          "The purest reminder           "Everyone is
    felt by the whole      leave a silence        of what truly                  living this;
    wall today."           that never ends."      matters."                      nobody says it."
```

#### Category-Specific Hook Variations:

1. **Category: `confession`**
   - *"Said in secret, felt by everyone."*
   - *"The confession the whole wall was waiting to hear."*
   - *"Unfiltered truth that struck a chord across the city."*
2. **Category: `heartbreak`**
   - *"Some unsaids leave a silence that never ends."*
   - *"The heaviest words are always the ones kept quiet."*
   - *"A quiet grief that the entire community held together."*
3. **Category: `wholesome`**
   - *"Pure warmth on the wall today."*
   - *"A gentle reminder that kindness still exists."*
   - *"The softness everyone needed to read today."*
4. **Category: `academic`**
   - *"Everyone is feeling this pressure; one person put it into words."*
   - *"The collective sigh of the semester."*
   - *"Campus halls are quiet, but this echoed everywhere."*
5. **Category: `existential`**
   - *"Late night thoughts that resonated with the whole wall."*
   - *"The question none of us know how to answer."*
   - *"Vulnerability that spoke to every single reader."*

#### Cycle Window Tone Shifts:
- **Dawn Cycle (00:00 UTC):** Tone emphasizes intimacy, stillness, and midnight revelations (*"From the midnight hours to the morning light."*).
- **Dusk Cycle (12:00 UTC):** Tone emphasizes shared endurance, evening calm, and daily release (*"As the day closes, this one stayed with us."*).

---

## Part 4: Database-Level Atomic Stored Procedure

To achieve **zero network roundtrips, atomic locking, and sub-10ms scoring**, the entire selection logic must execute directly within PostgreSQL via an atomic function:

### 4-A: Procedure Contract: `crown_cycle_winner`

```
FUNCTION crown_cycle_winner(
    p_cycle_start TIMESTAMPTZ,
    p_cycle_end TIMESTAMPTZ,
    p_triggered_by TEXT DEFAULT 'cron'
)
RETURNS JSONB
```

#### Internal Execution Flow:
1. **Advisory Lock Acquisition:**
   - Calls `pg_try_advisory_xact_lock(hashtext('bajihears_winner_cycle'))`.
   - If lock is held by another concurrent worker, immediately aborts with `{ "status": "locked", "message": "Cycle scoring already in progress" }`.
2. **Idempotency Verification:**
   - Queries `winner_cycles` for existing entry matching `cycle_start = p_cycle_start`.
   - If an entry exists: returns existing winner details with `{ "status": "already_crowned" }`.
3. **Manual Override Detection:**
   - Checks if any row in `unsaids` already has `is_winner = true` AND `winner_cycle = p_cycle_start`.
   - If found (curator set it via dashboard): records `status = 'manual_override'` in `winner_cycles`, logs metrics, and returns without overwriting.
4. **Candidate Extraction & Scoring Table Expression:**
   - Uses a Common Table Expression (`WITH scored_candidates AS (...)`) to calculate raw scores, time delta, decay factors, and veto penalties for all published posts within `[p_cycle_start, p_cycle_end)`.
5. **Zero Candidate Fallback Guard:**
   - If candidate count is zero: records `status = 'skipped_empty'` in `winner_cycles`, leaves previous winner intact, and returns gracefully.
6. **Winner Crowning & State Transition:**
   - Updates the winning row in `unsaids`:
     - Sets `is_winner = true`
     - Sets `winner_cycle = p_cycle_start`
     - Sets `winner_score = calculated_score`
     - Sets `winner_hook = selected_hook`
   - Logs execution row to `winner_cycles`.
7. **Return Payload:**
   - Returns JSONB containing winner UUID, handle, text excerpt, calculated score, hook, and total posts evaluated.

---

## Part 5: Scheduled Ingestion & The API Execution Layer

### 5-A: Dual-Trigger Architecture

To ensure operational reliability regardless of deployment hosting constraints, Phase 6 supports two trigger mechanisms:

```
[Option A: Cloudflare Cron Trigger] ──► [HTTP POST /api/cron/winner-cycle] ──┐
                                                                              ▼
[Option B: Supabase Native pg_cron] ──► [SELECT crown_cycle_winner(...)] ────► [Postgres Atomic Crown]
```

#### Option A: Cloudflare Pages / Worker Scheduled Trigger
- **Route:** `src/routes/api/cron.winner-cycle.ts`
- **Method:** `POST`
- **Security Guard:** `Bearer` token matching server environment variable `CRON_SECRET`.
- **Worker Execution:** Cloudflare Worker Cron event handler triggers route every 12 hours: `0 0,12 * * *`.

#### Option B: Supabase Native `pg_cron` Extension (Recommended Production Baseline)
- Runs directly inside PostgreSQL at zero cost and zero external HTTP latency.
- Executes:
  ```sql
  SELECT cron.schedule(
    'bajihears-12h-winner-crown',
    '0 0,12 * * *',
    $$SELECT crown_cycle_winner(now() - interval '12 hours', now(), 'cron')$$
  );
  ```

---

### 5-B: Security & Authentication Protocol for Cron Endpoint

Any public-facing HTTP endpoint that executes state-altering operations must be cryptographically guarded:

```
Incoming Request: POST /api/cron/winner-cycle
Headers:
  Authorization: Bearer <CRON_SECRET>
  X-Cloudflare-Cron: true (injected by Cloudflare Workers runtime)
```

1. **Constant-Time String Comparison:** Compare authorization token against `process.env.CRON_SECRET` using timing-safe comparison to prevent timing attacks.
2. **Origin Verification:** Verify request origin is internal or authorized scheduler.
3. **Execution Timeout Budget:** Entire execution must conclude in <5000ms. Database stored procedure execution takes <20ms.

---

## Part 6: Edge Caching & High-Performance Delivery

The Winner Hero Card is the single most viewed visual element on BajiHears. Every user landing on `/` views it immediately. Under viral spikes (e.g. 5,000 simultaneous users), querying Supabase on every page load would cause database connection exhaustion.

### 6-A: Cloudflare Edge Cache Strategy

```
Client Browser ────────► Cloudflare Edge (CDN) ────────► Cloudflare Worker (SSR / API) ────────► Supabase DB
                            │                                     │
                     [Cache Hit: <15ms]                   [Cache Miss: ~180ms]
                     Returns cached JSON                  Executes fetchWinner
```

#### Cache Headers for `fetchWinner` Server Function:
```http
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=3600
Surrogate-Key: bajihears-winner
Vary: Accept-Encoding
```

- **`max-age=60`:** Browser caches locally for 60 seconds (prevents reload hammering).
- **`s-maxage=300`:** Cloudflare CDN edge nodes cache the winner for 5 minutes.
- **`stale-while-revalidate=3600`:** If the 5-minute window expires, the edge serves the stale winner instantly while asynchronously refreshing from the database in the background. **Zero user ever experiences a loading spinner**.

---

### 6-B: Cache Purge & Cycle Invalidation

When a new winner is crowned at `00:00` or `12:00`:
1. The cron execution calls Cloudflare's Cache Purge API using the surrogate tag `bajihears-winner`.
2. Edge nodes immediately invalidate the cached winner payload.
3. The next visitor triggers a fresh read, caching the new winner for the subsequent 12 hours.

---

## Part 7: Client-Side Consumption & Synchronized UX

### 7-A: The `use-winner.ts` React Query Hook Specification

**Target File:** `src/client/hooks/use-winner.ts`

The hook manages data fetching, stale-time caching, and background reconciliation:

```
Query Key: ['winner', 'current']
Stale Time: 5 * 60 * 1000 (5 minutes)
GC Time (Garbage Collection): 30 * 60 * 1000 (30 minutes)
Refetch on Window Focus: false (winner changes only every 12 hours)
Refetch on Reconnect: true
```

#### Optimistic Reaction Handling on the Winner Card:
The Winner Card allows users to react directly on the hero banner.
- The hook must maintain **optimistic cache reconciliation**:
  1. When user taps reaction on the winner, update query cache data `['winner', 'current']` immediately.
  2. Simultaneously update feed query cache `['wall', 'feed']` if the winning post is visible in the list below.
  3. Dispatch mutation to `apiReactToPost`.
  4. Roll back on network error.

---

### 7-B: Synchronized Countdown Timer & Crown Transition

**Target Component:** `src/client/components/bajihears/WinnerHeroCard.tsx`

1. **Cycle Countdown Display:**
   - Displays real-time hours, minutes, seconds remaining in the current cycle (`HH:MM:SS`).
   - Calculated against next `00:00` or `12:00` UTC boundary.
2. **Zero-Countdown Revalidation Trigger:**
   - When the countdown reaches `00:00:00`:
   - Enters a brief "Crowning next winner..." subtle pulsing state.
   - Waits a **30-second grace window** (allowing the backend cron to complete execution and edge caches to invalidate).
   - Invalidation query: `queryClient.invalidateQueries({ queryKey: ['winner', 'current'] })`.
   - Triggers a smooth, non-intrusive micro-animation (confetti or gentle gold shimmer border) when the new winner loads.

---

## Part 8: Manual Curator Override Protocol

Automated algorithms occasionally elevate posts that are mathematically resonant but editorial misfits, or fail to crown an extraordinarily touching confession.

### 8-A: The Manual Override Workflow

```
Administrator in Supabase Dashboard
               │
               ▼
1. Open 'unsaids' Table Editor
2. Locate desired confession
3. Set is_winner = true
4. Set winner_cycle = <Current Cycle Timestamp, e.g. '2026-09-25 12:00:00+00'>
5. Set winner_hook = "Special Curator Selection: A confession that touched us all."
6. Save Row
               │
               ▼
Scheduled Cron fires at 12:00 UTC
               │
               ▼
Stored Procedure runs:
1. Queries: Does any row have is_winner=true AND winner_cycle=2026-09-25 12:00:00+00?
2. MATCH FOUND -> Status: 'manual_override'
3. Skips scoring calculation
4. Preserves manual winner intact
```

*Guarantee:* The administrator has total sovereign control. Automated scoring will never overwrite a human curator's decision.

---

## Part 9: Verification Matrix & Engineering Test Suite

Before Phase 6 is considered complete, the implementation must satisfy 10 mandatory verification gates:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 6 VERIFICATION TEST GATES                                 │
├────┬─────────────────────────────┬─────────────────────────────────────────────────────┤
│ #  │ Test Scenario               │ Expected Deterministic Result                       │
├────┼─────────────────────────────┼─────────────────────────────────────────────────────┤
│ 01 │ Clean Cycle Scoring         │ Highest scored post in 12h window crowned as winner.│
│ 02 │ Continuous Half-Life Decay  │ Newer 2h post with 35 hearts beats 11h with 40 hearts.│
│ 03 │ Veto Disqualification Gate  │ Post with veto_count >= 3 skipped even if #1 score. │
│ 04 │ Idempotency Guard           │ Calling cron endpoint 5 times in same cycle crowns  │
│    │                             │ exactly once with zero duplicate rows.              │
│ 05 │ Zero-Post Fallback          │ Cycle with 0 posts does not crash; retains prior    │
│    │                             │ winner with status 'skipped_empty'.                 │
│ 06 │ Manual Override Invariance  │ Pre-crowned post in Supabase is preserved by cron.  │
│ 07 │ Editorial Hook Assignment   │ Winning post receives non-empty contextual hook.    │
│ 08 │ Edge Cache Headers          │ API response includes s-maxage=300 & SWR=3600.      │
│ 09 │ Partial Unique Index        │ Database rejects any attempt to insert two winners  │
│    │                             │ with identical winner_cycle timestamps.             │
│ 10 │ Hero Card Live React Sync   │ Reacting to hero card updates both hero and feed    │
│    │                             │ without layout jump or desync.                      │
└────┴─────────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## Part 10: Step-by-Step Developer Implementation Directives

A principal developer executing Phase 6 must adhere to this exact sequence:

1. **Step 1 (Database DDL):**
   - Author migration file `supabase/migrations/20260926000000_phase6_winner_pipeline.sql`.
   - Add `winner_hook` (TEXT) and `winner_score` (NUMERIC) to `unsaids`.
   - Create `winner_cycles` table with audit columns.
   - Create covering scoring index and partial unique winner index.
   - Implement `crown_cycle_winner` PostgreSQL stored procedure.
2. **Step 2 (Server Core Scoring Engine):**
   - Update `src/server/lib/scoring.ts` to implement continuous 8-hour exponential decay and reaction weight formulas.
   - Author `src/server/jobs/winner-selection.ts` to orchestrate procedure invocation and telemetry logging.
   - Author `src/server/lib/winner-hooks.ts` containing the contextual hook generation matrix.
3. **Step 3 (API Route & Scheduled Trigger):**
   - Create route handler `src/routes/api/cron.winner-cycle.ts` accepting POST with Bearer token authentication.
   - Wire handler to invoke `winner-selection.ts`.
4. **Step 4 (Database Access Layer Refactor):**
   - Update `src/server/db/unsaids.ts`: ensure `fetchWinner` selects `winner_hook` and `winner_score` with strict ordering by `winner_cycle DESC`.
   - Update `src/server/functions/posts.ts`: attach Cloudflare Edge Cache headers (`Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`).
5. **Step 5 (Client Integration & Hero Polish):**
   - Update `src/client/hooks/use-winner.ts`: configure query caching, background stale-while-revalidate, and optimistic reaction synchronization.
   - Update `src/client/components/bajihears/WinnerHeroCard.tsx`: integrate real-time cycle countdown, contextual hook display, and 30-second post-countdown revalidation trigger.
6. **Step 6 (Push Notification Bridge Stub):**
   - In `src/server/jobs/push-dispatch.ts`, establish the interface bridge ready for Phase 7 notification delivery.
7. **Step 7 (Automated Test Suite):**
   - Create `src/server/__tests__/phase6-winner.test.ts` verifying mathematical scoring, decay, idempotency, tie-breaking, and stored procedure contracts.

---

*Authored for BajiHears Engineering Architecture · Ready for Immediate Technical Execution*
