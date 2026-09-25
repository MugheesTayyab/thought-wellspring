# Implementation Plan — Complete BajiHears Retention Engine (Phases 0–5)

Develop and integrate the complete retention, engagement, and viral distribution architecture for **BajiHears** as defined in [developer_spec.md](file:///C:/Users/mughe/.gemini/antigravity-ide/brain/51b63b24-a1ee-4e90-86d7-324f9c3a0a51/developer_spec.md). This elevates the platform from an anonymous post board into a high-retention community ecosystem powered by persistent identity, algorithmically curated hero feeds, a tangible Warmth economy, viral duel & deep-link loops, community trust/veto moderation, and membership rewards.

---

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions & Client-First Strategy:**
> 1. **Zero-Friction Anonymous Identity (`bh:identity`):** Visitors receive a persistent pseudo-identity (handle from 300+ curated Desi prefixes/suffixes + avatar seed + pseudonymous device token) on first boot without any login forms or email barriers.
> 2. **Client-Side Simulation with Backend Hooks (`// LATER: backend`):** Since there is no remote database currently, multi-user behaviors (post pending queues, echo veto threshold, duel vote scarcity counters, and warmth gifting) will be faithfully simulated and stored in `localStorage`, with clear `// LATER: backend` demarcations for future migration to Supabase/Cloudflare.
> 3. **Progressive Tab Disclosure (Hick's Law):** New visitors will initially only see the Wall and Writing Box. "The Duel" tab unlocks at 3 total interactions, and "Baji Read" unlocks at 5 interactions, preventing cognitive overload and driving immediate engagement.
> 4. **Hero Feed Scoring Algorithm:** Chronological feed is replaced by a freshness-decay scoring formula `(Echoes×4 + Reactions) × 0.5^(ageHours/8)`, pinning the top 24h winner and dividing older content into a distinct "From Earlier" section.

---

## Open Questions

None at this time — the technical specification in [developer_spec.md](file:///C:/Users/mughe/.gemini/antigravity-ide/brain/51b63b24-a1ee-4e90-86d7-324f9c3a0a51/developer_spec.md) provides exact data models, algorithms, and component contracts.

---

## Proposed Changes

### Phase 0: Pre-Launch Infrastructure

#### [NEW] [identity.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/identity.ts)
- Define `BajiIdentity` schema:
  - `handle`: e.g. `chaiwala_99`, `raat_ki_baat_42` from 300+ desi prefixes and 100 suffixes.
  - `avatarSeed`: integer 1–500.
  - `memberSince`: ISO string.
  - `deviceToken`: 16-character random hex string.
  - `visitStreak`: consecutive daily visits (48h reset rule).
  - `lastVisit`: YYYY-MM-DD.
  - `streakFreezeUsed`: boolean.
  - `totalActions`: counter across reactions, echoes, posts, and votes.
  - `tabsUnlocked`: `{ duel: boolean; read: boolean }`.
- Export core functions:
  - `getOrCreateIdentity(): BajiIdentity`
  - `updateVisitStreak(): void`
  - `getStreakStatus(): { streak: number; isNewDay: boolean; justReset: boolean }`
  - `recordAction(): void` (unlocks Duel at 3 actions, Read at 5 actions)
  - `useStreakFreeze(): boolean`
  - `STREAK_MILESTONES` constants

#### [NEW] [sw.js](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/public/sw.js)
- Service Worker handling push notifications and notification click events with `tag: 'bajihears-daily'`.

#### [NEW] [notifications.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/notifications.ts)
- Web push helper utilities with SSR guards:
  - `registerServiceWorker()`
  - `requestPushPermission()`
  - `hasPushPermission()`
  - `shouldShowPushPrompt()`
  - `markPushPromptShown()`

#### [NEW] [PushPermissionSheet.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/PushPermissionSheet.tsx)
- Bottom sheet appearing after first reaction: "Get notified when someone echoes yours." with "Yes, tell me" and "Maybe later".

#### [NEW] [seedData.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/seedData.ts)
- 150 authentic pre-written confessions covering all 5 categories (30 posts per category) in Hinglish / Urdu-English natural mix, with realistic reaction counts and echo threads.

#### [MODIFY] [warmth.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/warmth.ts)
- Add `"daily_bonus"` to `ActionType` with value 5.
- Implement `claimDailyBonus()` checking `bh:lastDailyBonus` and scaling reward with streak (5, 15, 25, 50 Warmth).

#### [MODIFY] [bajihears.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/bajihears.ts)
- Extend `Unsaid` type with `status`, `pendingUntil`, `deviceToken`, `vetoCount`, `vetoedBy`, `type`, and `whichOne`.
- Implement `initializeWall()` to populate `bh:unsaids` from `seedData.ts` on first load.
- Implement `scorePost(post: Unsaid): number` and `getSortedFeed(posts: Unsaid[])`.
- Implement `getWinner(posts: Unsaid[])` with 1-hour TTL cached in `bh:currentWinner`.
- Implement `generateShareCode(postId)` and `buildShareUrl(postId)`.
- Implement `vetoPost(postId, deviceToken)`.
- Add `EXCLUSIVE_PRESETS` catalog.

#### [MODIFY] [__root.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/__root.tsx)
- Initialize identity, streak tracking, daily bonus claiming, and wall seeding on mount in root component.
- Display a celebratory toast when the daily bonus is claimed.

---

### Phase 1: Engineer the Aha Moment

#### [NEW] [FeedWritingPrompt.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/FeedWritingPrompt.tsx)
- In-feed card component injected every 5 cards with 10 rotating subtext prompts and a "Write it" button that scrolls to and focuses the `WritingBox`.

#### [MODIFY] [index.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/index.tsx)
- Render Winner card first with `isWinner={true}`.
- Sort feed with `getSortedFeed()`.
- Inject `<FeedWritingPrompt />` after every 5th confession card.
- Insert "From Earlier" divider and render `earlierFeed` below with muted styling.
- Integrate `recordAction()` on reactions and echoes.

#### [MODIFY] [BottomNav.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/BottomNav.tsx)
- Progressive tab disclosure based on `identity.tabsUnlocked`.
- Dim locked tabs (`opacity-30`) with a helpful toast explaining the unlock criteria.
- Animated spring unlock when criteria are met.

#### [MODIFY] [UnsaidCard.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/UnsaidCard.tsx)
- Add `isWinner` visual styling (gold top-border accent and "⭐ Baji Heard This" badge).
- Add Warmth tier aura styling on author handles.
- Add Warmth gifting button (🎁) with 10 Warmth transfer simulation.
- Add three-dot menu with subtle "Something feels off" Echo Veto action.
- Add pending review badge for un-promoted posts submitted by current device.

---

### Phase 2: Warmth as Social Currency

#### [NEW] [warmthStore.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/warmthStore.ts)
- Item catalog (`STORE_ITEMS`): Deeper Baji Read, Pin to Category Top, New Avatar, Baji Spotlight, Aurora Preset, Baji Regular Badge.
- Helpers to purchase items and manage `bh:purchasedItems`.

#### [NEW] [WarmthStore.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/WarmthStore.tsx)
- Dedicated sheet for browsing and purchasing Warmth items with balances, progress bars, and feedback animations.

#### [NEW] [CommunityRegulars.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/CommunityRegulars.tsx)
- Wall component celebrating 30-day streak users, with a motivational countdown for users with 14+ days.

#### [MODIFY] [WarmthSheet.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/WarmthSheet.tsx)
- Add "Browse the Warmth Store →" button that triggers the `WarmthStore` sheet.

---

### Phase 3: Viral Distribution Flywheel

#### [NEW] [c.$code.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/c.$code.tsx)
- Deep-link route for `/c/[code]` rendering the Wall with the targeted confession pinned and highlighted with a "Someone sent you here ✨" badge.

#### [NEW] [duel.$id.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/duel.$id.tsx)
- Deep-link route for `/duel/[id]` displaying a challenged duel with custom social headers and immediate vote feedback.

#### [NEW] [WhichOneCard.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/WhichOneCard.tsx)
- Side-by-side interactive card for `which_one` posts with tactile voting, percentage split bars, and "Share Your Side" actions.

#### [MODIFY] [DuelCard.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/DuelCard.tsx)
- Pre-seeded scarcity counter ("X votes in — Y more to reveal the results").
- Animated odometer count-up upon hitting 100 votes.
- "Share Your Side" button generating a customized duel share card.

#### [MODIFY] [WritingBox.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/WritingBox.tsx)
- Mode toggle: "Write a confession" vs "Which one are you?" (dual-input A/B mode).

#### [MODIFY] [read.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/read.tsx)
- Support referral query param `?ref=share` with personalized locked state ("Someone who knows you sent you here").

---

### Phase 4: Trust Infrastructure & Quality Control

#### [NEW] [spamFilter.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/spamFilter.ts)
- Comprehensive client-side spam validation: URL blocking, Pakistani phone regexes, 7+ character repetition, all-caps screamer detector, word repetition ratio check, and 3 posts/hour rate limiting.

#### [MODIFY] [index.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/index.tsx)
- Integrate `checkSpam()` and rate limiting during confession submission.
- Warmth-gated 30-minute pending queue for users with < 50 Warmth.
- Auto-publish polling interval for pending confessions.

---

### Phase 5: Membership & Monetization

#### [NEW] [membership.ts](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/lib/membership.ts)
- `MembershipStatus` data model, `getMembershipStatus()`, `isMember()`, and code activation helper.

#### [NEW] [MembershipSheet.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/MembershipSheet.tsx)
- Luxury dark-gold sheet showcasing "Baji Regular ✦" perks: seasonal preset drops, weekly confession insights, and VIP badge with a direct WhatsApp waitlist connection.

#### [MODIFY] [corner.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/routes/corner.tsx)
- Add the `StreakCard` component displaying streak flame tiers, 7-day dot progress, and milestone progress.
- Add "Become a Baji Regular ✦" entry point.

#### [MODIFY] [BajiReadShareDialog.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/BajiReadShareDialog.tsx) & [QuoteCardDialog.tsx](file:///c:/Users/mughe/OneDrive/Desktop/Personal%20projects/thought-wellspring/src/components/bajihears/QuoteCardDialog.tsx)
- Integrate exclusive preset selection gated by membership or store purchase.

---

## Verification Plan

### Automated Checks
- `npm run lint`: Verify 0 syntax or TypeScript lint errors.
- `npm run build`: Confirm both client and SSR Vite bundles compile with 0 errors.

### Browser & User Journey Testing
- Test with `browser_subagent`:
  1. Verify identity initialization, handle generation, and daily bonus claiming on first visit.
  2. Verify feed sorting (winner pinned, hero feed, in-feed prompt every 5 posts, "From Earlier" divider).
  3. Verify progressive tab disclosure (tabs locked at 0 actions, unlock as reactions are added).
  4. Verify Warmth store browsing and gifting interaction.
  5. Verify "Which One Are You?" post creation and voting.
  6. Verify deep-link routes (`/c/[code]` and `/duel/[id]`).
  7. Verify Corner page Streak Card and Membership sheet.
