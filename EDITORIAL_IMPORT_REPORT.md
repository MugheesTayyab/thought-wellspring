# BajiHears | Phase A: Editorial Launch Collection Report

**Audit & Staging Date:** 24 October 2026  
**Auditing & Engineering Scope:** Phase A Editorial Launch Collection (`MugheesTayyab/thought-wellspring`)  
**Target Repository:** `MugheesTayyab/thought-wellspring` (Branch: `main`)  
**Content Source:** `BAJIHEARS_FINAL_30_SEED_POSTS.csv` (Verbatim 30 Manus Originals)  
**Status:** **STAGED LOCALLY & VALIDATED · OWNER APPROVAL GATE ACTIVE**  
*(Zero production data modified, zero production migrations applied, zero production rows inserted)*  

---

## 1. Executive Summary & Verdict

Phase A (Editorial Launch Collection) has been successfully implemented and verified locally in accordance with all prompt criteria and strict ethical constraints:

1. **Verbatim Content Integrity:** All 30 Manus original stories from `BAJIHEARS_FINAL_30_SEED_POSTS.csv` have been validated without a single word paraphrased, rewritten, or re-ranked.
2. **Strict Provenance & Zero Forgery:** Editorial posts are segregated via an explicit `source_type = 'editorial'` column. Their `device_token`, `handle`, and `profile_id` are strictly `NULL`. No user IDs, fake browser tokens, synthetic handles, or fabricated timestamps are ever generated.
3. **Pristine Community Statistics & Wall Isolation:** The public chronological Wall defaults to querying `source_type = 'community'`. Existing community posts (~161 rows), pagination, submission cooldowns, and duels remain completely uncontaminated.
4. **Unambiguous Editorial Disclosure:** Every editorial card, share canvas (`QuoteCardDialog`), clipboard export, and discussion sheet renders the required visible label:  
   **“BajiHears Original · Fictional Story”** alongside its curated story number (e.g. `#01`) and category pill.
5. **Curated & Discoverable UX:** Visitors can toggle seamlessly between **The Wall** (Community Confessions) and **BajiHears Originals** (30 Curated Stories in exact CSV sequence `#01` to `#30`) with category filters.
6. **Owner-Approval Gate:** Automatic production execution is strictly blocked. A deterministic script (`scripts/editorial-seed-manager.mjs`) manages dry-run testing, JSON preview generation, and safe idempotent production import/rollback upon explicit owner sign-off.

---

## 2. Architectural & Engineering Decisions

### 2.1 Minimally Invasive Data Model
Rather than creating an isolated schema that complicates shared card components, reader reactions, and moderation queues, we implemented a lightweight provenance extension on `public.unsaids`:

```sql
-- Provenance Columns
ALTER TABLE public.unsaids 
    ADD COLUMN source_type TEXT NOT NULL DEFAULT 'community' 
    CHECK (source_type IN ('community', 'editorial')),
    ADD COLUMN editorial_seed_id TEXT UNIQUE 
    CHECK (editorial_seed_id IS NULL OR editorial_seed_id ~ '^BH-[0-9]{3}$'),
    ADD COLUMN editorial_label TEXT DEFAULT NULL,
    ADD COLUMN display_order INTEGER UNIQUE DEFAULT NULL,
    ADD COLUMN editorial_metadata JSONB DEFAULT NULL;
```

### 2.2 Principled `device_token` Constraint Adjustment
In the original schema, `device_token` was defined as `NOT NULL`. Forcing a synthetic token would forge user identity and contaminate abuse limits. We dropped `NOT NULL` on `device_token` and replaced it with a strict conditional check constraint:

```sql
ALTER TABLE public.unsaids ALTER COLUMN device_token DROP NOT NULL;

ALTER TABLE public.unsaids ADD CONSTRAINT unsaids_device_token_check 
    CHECK (source_type = 'editorial' OR (device_token IS NOT NULL AND char_length(device_token) = 16));
```
- **Community posts:** Must still provide a valid 16-hex character device token.
- **Editorial posts:** Strictly `device_token = NULL`, `profile_id = NULL`, and `handle = NULL`.

### 2.3 Author vs. Reader Role Separation
- **Authorship:** Because `unsaid.device_token` is NULL, no visiting browser can ever match the author token. `isOwnPost` evaluates to `false`, preventing visitors from editing or claiming ownership.
- **Reader Engagement:** Readers **can** relate/react to editorial posts (stored in `reactions` ledger via `set_reaction_atomic`) and participate in reader echoes/comments (`addEcho`).
- **Moderation Safety:** Readers can report an editorial story via `report_post_atomic`. Because `v_post.device_token IS NULL`, the report is never falsely rejected as a self-report.
- **Administration:** Only Supabase `service_role` (admin) is granted execution rights on `import_editorial_seed_atomic`. Anonymous and authenticated public roles are explicitly denied.

### 2.4 Indexing & Query Performance
Two targeted partial indexes ensure high performance and zero table scan overhead:
1. `idx_unsaids_editorial_order`: `ON public.unsaids (source_type, display_order ASC) WHERE source_type = 'editorial'`
2. `idx_unsaids_community_feed`: `ON public.unsaids (source_type, status, created_at DESC) WHERE source_type = 'community'`

---

## 3. Content Validation Summary

Validation executed via `scripts/validate-editorial-csv.mjs` and `src/server/__tests__/editorial-collection.test.ts`:

| Requirement | Specification | Validation Result | Status |
| :--- | :--- | :--- | :---: |
| **Row Count** | Exactly 30 records | 30 records parsed | **PASS** |
| **Seed ID Range** | `BH-001` through `BH-030` | 30 unique, sequential IDs | **PASS** |
| **Display Order** | Contiguous `1` through `30` | 30 unique, sequential integers | **PASS** |
| **Content Non-blank** | Min length >= 3 characters | All rows non-blank (Min: 199 chars) | **PASS** |
| **Max Character Limit**| `<= 280` characters | Max length: 258 chars | **PASS** |
| **Categories** | 5 valid application categories | Spill The Tea (5), Silent Thoughts (5), Plot Twist (7), Hard Truth (7), Vibe Check (6) | **PASS** |
| **Review Status** | `Pending Editorial Approval` | 30 / 30 records match | **PASS** |
| **CSV Editorial Label**| `BajiHears Original / Fictional Scenario` | 30 / 30 records match | **PASS** |
| **Rendered Card Label**| `BajiHears Original · Fictional Story` | 100% applied across all UI surfaces | **PASS** |
| **Initial Reactions** | Exactly 0 across all keys | `{"heart":0,"sad":0,"fire":0,"hug":0}` | **PASS** |

### Category Distribution Breakdown:
- **Plot Twist:** 7 stories (23.3%)
- **Hard Truth:** 7 stories (23.3%)
- **Vibe Check:** 6 stories (20.0%)
- **Spill The Tea:** 5 stories (16.7%)
- **Silent Thoughts:** 5 stories (16.7%)

---

## 4. Dry-Run & Simulation Output

Executing `node scripts/editorial-seed-manager.mjs --dry-run` in isolated PostgreSQL (`PGlite`):

```text
=== CSV Content Validation Report ===
Headers: [
  'seed_id',
  'display_order',
  'content',
  'language',
  'country_context',
  'category',
  'editorial_label',
  'fictional_or_editorial',
  'character_count',
  'quality_score',
  'review_status',
  'source_provenance_category'
]
Parsed 30 rows.
Unique seed_id count: 30 / 30
Unique display_order count: 30 / 30
PASS: All 30 CSV records meet all specification requirements!
=================================================================
   BAJIHEARS EDITORIAL LAUNCH COLLECTION: SEED MANAGER
=================================================================

[1/4] Validating CSV Content Integrity...
  ✓ All 30 seed_id entries verified (BH-001 through BH-030)
  ✓ All display_order values contiguous and unique (1 through 30)
  ✓ All character counts strictly within 3..280 range (Max: 258 chars, Min: 199 chars)
  ✓ Category distribution:
     - Spill The Tea   : 5 posts
     - Silent Thoughts : 5 posts
     - Plot Twist      : 7 posts
     - Hard Truth      : 7 posts
     - Vibe Check      : 6 posts

[2/4] Editorial Catalog Preview (Sample of 30 Curated Stories):
--------------------------------------------------------------------------------
[#01 | BH-001] Category: Spill The Tea (247 chars, Score: 92)
     Label: BajiHears Original · Fictional Story
     Text : "I told my family I had an early lecture so I could escape the mehndi before the aunties asked a..."

[#02 | BH-002] Category: Plot Twist (235 chars, Score: 93)
     Label: BajiHears Original · Fictional Story
     Text : "For six months, I thought the encouraging notes on my desk were from my manager. They were from..."

[#03 | BH-003] Category: Hard Truth (248 chars, Score: 89)
     Label: BajiHears Original · Fictional Story
     Text : "My roommate keeps ordering food for both of us. I thought she was being generous until I realis..."

[#04 | BH-004] Category: Silent Thoughts (225 chars, Score: 94)
     Label: BajiHears Original · Fictional Story
     Text : "I found an old voice note from my abba: 'Call me when you reach.' I saved it because I was anno..."

[#05 | BH-005] Category: Vibe Check (258 chars, Score: 91)
     Label: BajiHears Original · Fictional Story
     Text : "I waved at someone across the train platform. He waved back. We walked toward each other smilin..."

... and 25 more stories in verified order (BH-006 through BH-030).
--------------------------------------------------------------------------------

[3/4] Running Transactional Database Dry-Run in Isolated PostgreSQL (PGlite)...
  ✓ Simulated import of 30 / 30 records into public.unsaids.
  ✓ get_editorial_originals returned 30 rows in exact display_order 1..30.
  ✓ Verified: 0 editorial posts have fabricated device tokens (all strictly NULL).
  ✓ Verified: 0 fake reactions or seeded engagement (all start at 0).
  ✓ Verified: Existing community posts completely untouched (2 posts preserved).
  ✓ Verified: Dry-run transaction rolled back. Editorial rows in DB: 0.

[4/4] Saved preview data to supabase/.temp/editorial_seed_preview.json

=================================================================
   GATE CHECK: OWNER APPROVAL GATE ACTIVE
   NO DATA HAS BEEN IMPORTED OR PUBLISHED TO PRODUCTION.
   PRODUCTION IMPORT AWAITS EXPLICIT SUBSEQUENT OWNER SIGN-OFF.
=================================================================
```

---

## 5. Test Suite Verification & Quality Results

| Test Suite / Tool | Command | Scope | Result |
| :--- | :--- | :--- | :---: |
| **Vitest Units** | `npm test` | 9 test files (84 tests passed), including `editorial-collection.test.ts` | **PASS (84/84)** |
| **Database Behaviors** | `npm run test:database` | 26 behavior & security checks in isolated PostgreSQL | **PASS (26/26)** |
| **TypeScript Compiler** | `npm run typecheck` | Strict `tsc --noEmit` validation | **PASS (0 errors)** |
| **ESLint Linter** | `npm run lint` | Code style, accessibility, and naming | **PASS (0 errors, 0 warnings)** |
| **Production Build** | `npm run build` | Full Vite + Nitro SSR compilation for Cloudflare | **PASS** |
| **Cloudflare Worker** | `npx wrangler deploy --dry-run` | Bundle packaging and bindings inspection | **PASS** |

---

## 6. Inventory of Files Changed & Created

### New Files Created:
1. `supabase/migrations/20261025000000_editorial_collection_schema.sql`:
   - Adds provenance columns, updates `device_token` check constraint, creates partial indexes, and establishes `import_editorial_seed_atomic` and `get_editorial_originals` RPCs.
2. `scripts/validate-editorial-csv.mjs`:
   - Standalone CSV parser and validator for the 30 seed posts.
3. `scripts/editorial-seed-manager.mjs`:
   - Deterministic management script with `--dry-run`, `--preview`, `--import-production`, and `--rollback-production`.
4. `src/client/components/bajihears/EditorialOriginalsSection.tsx`:
   - Contained UI component rendering the 30 curated stories in exact sequence with category filtering, provenance badges, and zero seeded engagement.
5. `src/client/hooks/use-editorial-originals.ts`:
   - TanStack Query hook fetching editorial originals from the server endpoint.
6. `src/server/__tests__/editorial-collection.test.ts`:
   - Vitest suite covering CSV integrity, data model mapping, and community isolation.
7. `BAJIHEARS_FINAL_30_SEED_POSTS.csv`:
   - The authoritative 30 Manus originals data source.

### Files Modified:
1. `src/shared/types/unsaid.ts`:
   - Added provenance types: `sourceType`, `editorialSeedId`, `editorialLabel`, `displayOrder`, `editorialMetadata`.
2. `src/server/db/unsaids.ts`:
   - Added `fetchEditorialOriginals()` and defaulted `fetchPublishedFeed()` to `source_type = 'community'`.
3. `src/server/functions/posts.ts`:
   - Exported `getEditorialOriginals()`.
4. `src/server/handlers/wall.ts`:
   - Exported `handleFetchEditorialOriginals()`.
5. `src/routes/api/wall.ts`:
   - Exported `apiFetchEditorialOriginals` server function.
6. `src/client/lib/query-keys.ts`:
   - Added `originals` query key to `queryKeys.posts`.
7. `src/client/components/bajihears/UnsaidCard.tsx`:
   - Rendered **“BajiHears Original · Fictional Story”** badge in header, updated `copy()` attribution, styled warm paper background, and ensured `isOwnPost` is false.
8. `src/client/components/bajihears/QuoteCardDialog.tsx`:
   - Rendered **“BajiHears Original · Fictional Story”** on Instagram share card canvas.
9. `src/client/components/bajihears/EchoThreadSheet.tsx`:
   - Rendered **“BajiHears Original · Fictional Story”** in echo discussion header.
10. `src/routes/corner.tsx`:
    - Displayed editorial label on saved editorial stories.
11. `src/routes/index.tsx`:
    - Added section switcher (`The Wall` vs `BajiHears Originals`), discovery banner on The Wall, and URL parameter synchronization (`?section=originals` / `#originals`).
12. `src/server.ts`:
    - Fixed Node 22 Undici private `#state` clone issue in development server request interception.
13. `vitest.config.ts`:
    - Added `editorial-collection` to test include filter.
14. `scripts/test-database.mjs`:
    - Verified migration and behavior tests for editorial seeding, idempotency, reader reactions, and rollback.

---

## 7. Mobile UI Visual Preview & Inspection

Visual verification was conducted on a mobile viewport (`390 × 844`):

- **First Visit / The Wall Screen:**
  - Displays `The Wall` with the **Hero Intro** ("For the thoughts you keep to yourself").
  - Features the clean **View Switcher**: `The Wall (Community)` and `BajiHears Originals (30 Stories)`.
  - Prominently showcases the **Curated Launch Collection Discovery Banner** ("30 curated fictional scenarios by Manus · Exact sequence [Browse Originals →]").
- **BajiHears Originals Screen:**
  - Displays the editorial collection header with transparency badges: `Exact Curated Sequence (#01–#30)`, `Fictional Scenarios · Real Reader Reactions`, and `Zero Fake Engagement`.
  - Category selector pills: `All (30)`, `Plot Twist (7)`, `Hard Truth (7)`, `Vibe Check (6)`, `Spill The Tea (5)`, `Silent Thoughts (5)`.
  - Staged story cards display the visible badge:  
    `[✨ BajiHears Original · Fictional Story] #01` with category tag `#spillthetea`.

Artifacts recorded:
- Mobile First Screen: `mobile_first_screen.png`
- Editorial Section Screen: `editorial_card_preview.png`
- Full Interaction Recording: `mobile_editorial_preview_1792854524357.webp`

---

## 8. Exact Production Approval & Deployment Runbook

Nothing has been applied to production. To publish the 30 Manus originals to production, execute the following owner-approved sequence:

### Step 1: Owner Review
Review this report (`EDITORIAL_IMPORT_REPORT.md`), the generated JSON preview (`supabase/.temp/editorial_seed_preview.json`), and the mobile screenshots.

### Step 2: Apply Database Schema Migration (Production)
Run the migration script against Supabase production via the Supabase CLI or Dashboard SQL Editor:
```bash
# Via Supabase CLI (if configured)
npx supabase db push

# OR apply the SQL migration directly in Supabase Dashboard SQL Editor:
# Copy and execute: supabase/migrations/20261025000000_editorial_collection_schema.sql
```

### Step 3: Execute Idempotent Production Seed Import
Once the schema is migrated, run the import script with the explicit approval flag:
```bash
node scripts/editorial-seed-manager.mjs --import-production --confirm-owner-approval
```
Expected output:
- Connects to production database with TLS and verified CA cert.
- Verifies existing community post count.
- Inserts/upserts all 30 records into `public.unsaids` via `import_editorial_seed_atomic`.
- Verifies community post count remains identical.

### Step 4: Verification
Verify in the Supabase SQL Editor:
```sql
-- 1. Verify exactly 30 editorial rows exist
SELECT count(*) FROM public.unsaids WHERE source_type = 'editorial'; -- Expected: 30

-- 2. Verify exact display order and zero fake device tokens
SELECT editorial_seed_id, display_order, category, editorial_label 
FROM public.unsaids 
WHERE source_type = 'editorial' 
ORDER BY display_order ASC;

-- 3. Verify zero fake tokens
SELECT count(*) FROM public.unsaids WHERE source_type = 'editorial' AND device_token IS NOT NULL; -- Expected: 0
```

### Step 5: Safe Production Rollback (If Ever Needed)
If the owner ever wishes to retract or reset the 30 editorial originals without affecting organic community posts:
```bash
node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval
```
Or execute the atomic SQL statement:
```sql
DELETE FROM public.unsaids WHERE source_type = 'editorial';
```
*Note: Because foreign keys on reactions and echoes cascade, removing editorial posts cleanly removes any reader reactions attached to them while leaving all community confessions and user data 100% intact.*
