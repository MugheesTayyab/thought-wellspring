# BajiHears — Developer Technical Specification
### Retention Plan: Complete Build Guide

**Who this is for**: A developer picking this project up cold. Every system, schema, algorithm, component, and interaction is specified here. No prior context assumed.

**Existing tech stack**: React + TanStack Start (SSR), TanStack Router, Tailwind CSS v4, TypeScript, all state in `localStorage` (no backend currently). The plan below works within these constraints and flags clearly where a backend is eventually needed.

---

## How to Read This Document

- **[NEW FILE]** = create this file from scratch
- **[MODIFY]** = edit an existing file
- **[NEW COMPONENT]** = create a new React component
- **`bh:key`** = a `localStorage` key used in this system
- **`// LATER: backend`** = currently localStorage, needs a real DB when scaling

---

## Phase 0: Pre-Launch Infrastructure

These are systems that must exist before the first real user ever arrives. They are not features — they are the floor the product stands on.

---

### 0.1 — Persistent Soft Identity System

**Goal**: Every visitor gets a persistent anonymous identity — a handle and avatar — that follows them across page refreshes and return visits. No login. No email. No friction. Just a character that's "theirs."

#### [NEW FILE] `src/lib/identity.ts`

This module owns the entire identity lifecycle.

**What it stores** (`bh:identity` in localStorage):
```typescript
type BajiIdentity = {
  handle: string;          // e.g. "chaiwala_99", "raat_ki_baat_42"
  avatarSeed: number;      // integer 1–500, maps to a pre-generated avatar set
  memberSince: string;     // ISO date string "2025-01-15"
  deviceToken: string;     // 16-char random hex, used as a pseudonymous device ID
  visitStreak: number;     // consecutive daily visits, resets if gap > 48h
  lastVisit: string;       // YYYY-MM-DD of last visit
  streakFreezeUsed: boolean; // whether the user has used their one streak freeze
}
```

**Handle generation**: Build a list of 300+ desi-flavored prefixes and 100 suffixes hardcoded in the module:
```typescript
const PREFIXES = [
  "chaiwala", "raat_ki", "dil_ki", "ghumakkad", "khamoshi",
  "subah_ka", "sheher_ka", "pagal_sa", "roz_ka", "andhere_mein",
  "ek_baat", "sunta_hai", "jazbaat", "alfaaz", "khoya_sa",
  // ... 285 more
];
const SUFFIXES = ["_baat", "_raaz", "_lamha", "_pal", "_dil", "_99", "_42", ...];

function generateHandle(): string {
  const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${p}${s}`;
}
```

**Device token generation**:
```typescript
function generateDeviceToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Key functions to export**:
- `getOrCreateIdentity(): BajiIdentity` — reads from localStorage or creates fresh if missing. Always call this on app boot.
- `updateVisitStreak(): void` — called once per app open. Increments streak if last visit was yesterday, resets to 1 if gap > 48h, does nothing if same day.
- `getStreakStatus(): { streak: number, isNewDay: boolean, justReset: boolean }` — used by UI components.
- `useStreakFreeze(): boolean` — spends one freeze, returns false if already used.

**Where to call**: In `src/routes/__root.tsx`, inside the root `useEffect` that runs on mount:
```typescript
useEffect(() => {
  const identity = getOrCreateIdentity();
  updateVisitStreak();
  // then check streak milestones...
}, []);
```

---

### 0.2 — Visit Streak Engine & UI

**Goal**: Show the user their streak in a satisfying, emotionally resonant way. Make breaking a streak feel like a real loss.

#### [MODIFY] `src/routes/corner.tsx`

This is the "profile" page. Add a **Streak Card** at the top of the Corner page:

**Visual design of the Streak Card**:
- A dark glass card (`bg-white/5 border border-white/10 rounded-2xl p-4`)
- Left side: A large flame emoji that scales with streak length
  - 1–2 days: 🔥 (small, static)
  - 3–6 days: 🔥 (medium, pulsing)
  - 7–13 days: ⚡🔥 (large, animated flicker)
  - 14–29 days: 🌙🔥 (deep purple ambient glow behind it)
  - 30+ days: 👑🔥 (gold crown above, particle sparkles)
- Right side: `"${streak} day streak"` in large text, subtitle: last visit date
- Below: A row of 7 dot indicators (Mon–Sun), filled for days visited this week, empty for days missed
- Bottom: A subtle progress bar showing days until next streak milestone

**Streak milestones and rewards** (hardcode in `src/lib/identity.ts`):
```typescript
const STREAK_MILESTONES = [
  { days: 3,  reward: "Your posts get a 🔥 badge for 24 hours", label: "3-Day Spark" },
  { days: 7,  reward: "Unlock the 'Night Owl' sharing preset (exclusive dark purple)", label: "Week One" },
  { days: 14, reward: "+50 bonus Warmth, automatically awarded", label: "Fortnight" },
  { days: 30, reward: "Your handle appears in the Community Regulars section on the Wall", label: "Baji Regular 👑" },
];
```

**Streak Freeze mechanic**:
- At day 5 streak, show a one-time offer: *"Miss a day? Your streak freeze is ready — it'll protect you once."*
- Store `streakFreezeUsed: false` in identity. When a user misses a day but has a freeze available, auto-apply it and show a toast: *"Streak protected. Don't make it a habit. 😄"*

---

### 0.3 — Daily Warmth Bonus System

**Goal**: Every day a user returns, they earn +5 Warmth just for opening the app. Make claiming it feel satisfying.

#### [MODIFY] `src/lib/warmth.ts`

Add to `ActionType`: `"daily_bonus"` with value `5`.

Add a new `localStorage` key `bh:lastDailyBonus` that stores `YYYY-MM-DD`.

Add function:
```typescript
export function claimDailyBonus(): { claimed: boolean; amount: number } {
  const today = getTodayKey();
  const lastClaim = localStorage.getItem("bh:lastDailyBonus");
  if (lastClaim === today) return { claimed: false, amount: 0 };

  const streak = getOrCreateIdentity().visitStreak;
  let amount = 5;
  if (streak >= 7)  amount = 15;
  if (streak >= 14) amount = 25;
  if (streak >= 30) amount = 50; // streak bonus scales

  localStorage.setItem("bh:lastDailyBonus", today);
  return { claimed: true, amount };
}
```

**Where to call**: In `src/routes/__root.tsx` root `useEffect`, immediately after `updateVisitStreak()`. If `claimed === true`, trigger a `WarmthToast` with message: *"+${amount} Warmth — welcome back 🔥"*

---

### 0.4 — Web Push Notification Infrastructure

**Goal**: Ask for push permission at the highest-intent moment. Send one meaningful push per day maximum.

#### [NEW FILE] `public/sw.js` — Service Worker

A minimal service worker that handles push events:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'BajiHears', {
      body: data.body ?? 'Something new is on the wall.',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'bajihears-daily',    // tag ensures only one notification at a time
      renotify: false,
      data: { url: data.url ?? '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

#### [NEW FILE] `src/lib/notifications.ts`

```typescript
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function requestPushPermission(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function hasPushPermission(): boolean {
  return Notification.permission === 'granted';
}

// Key: "bh:pushPromptShown" — so we only ask once
export function shouldShowPushPrompt(): boolean {
  return !localStorage.getItem("bh:pushPromptShown") && Notification.permission === 'default';
}

export function markPushPromptShown() {
  localStorage.setItem("bh:pushPromptShown", "true");
}
```

> **Note**: Actual push delivery requires a backend (a VAPID key pair, a push subscription endpoint stored server-side, and a cron job to send daily pushes). For MVP: store the `PushSubscription` object in localStorage and manually trigger via a simple serverless function (Cloudflare Worker). Add a `// LATER: backend` comment here.

**Where to prompt**: In `src/components/bajihears/UnsaidCard.tsx`, after a user taps any reaction button for the **first time ever**, if `shouldShowPushPrompt()` returns true, show a bottom sheet:

**The push permission bottom sheet** ([NEW COMPONENT] `src/components/bajihears/PushPermissionSheet.tsx`):
- Appears from the bottom, smooth slide-up animation
- Copy: *"Get notified when someone echoes yours."*
- Subtext: *"No feeds. No noise. Just that one moment."*
- Two buttons: `"Yes, tell me"` (calls `requestPushPermission()`) and `"Maybe later"` (calls `markPushPromptShown()`)
- Auto-dismisses after 8 seconds if no action

---

### 0.5 — Wall Content Seeding Tool

**Goal**: Before launch, populate the wall with 150 authentic confessions. This is a one-time data loading step.

#### [NEW FILE] `src/lib/seedData.ts`

Create a module that exports 150 pre-written `Unsaid` objects. Structure them exactly like the existing `Unsaid` type in `bajihears.ts`. Cover all 5 categories (30 posts each). Key rules for the content:
- Write in first-person, conversational Urdu-English (Hinglish natural mix)
- Include specific concrete details, not generic feelings
- 40% should have pre-seeded reaction counts (5–25 hearts, 3–12 fires, etc.)
- 20% should have 1–3 pre-written `Echo` replies
- Distribute `createdAt` timestamps over the past 18 hours so the feed looks live

#### [MODIFY] `src/lib/bajihears.ts`

The existing code has hardcoded mock data. Replace it with the seeded data from `seedData.ts`. Add a function:
```typescript
export function initializeWall(): void {
  const key = "bh:wallInitialized_v1";
  if (localStorage.getItem(key)) return; // only run once
  const existing = readUnsaids();
  if (existing.length === 0) {
    const seeded = SEED_DATA.map(post => ({ ...post, id: crypto.randomUUID() }));
    localStorage.setItem("bh:unsaids", JSON.stringify(seeded));
  }
  localStorage.setItem(key, "true");
}
```

Call `initializeWall()` in `src/routes/__root.tsx` on first mount.

---

## Phase 1: Engineer the Aha Moment (Days 1–30)

---

### 1.1 — Hero Feed Algorithm

**Goal**: The top 3 posts in the feed are always the best content from the last 12 hours. Not pure chronological, not pure reaction count — a weighted formula that rewards quality and freshness.

#### [MODIFY] `src/lib/bajihears.ts`

Add a `scorePost(post: Unsaid): number` function:

```typescript
export function scorePost(post: Unsaid): number {
  const ageHours = (Date.now() - post.createdAt) / 3_600_000;

  // Reaction weights
  const reactionScore =
    (post.reactions.heart * 2.5) +
    (post.reactions.fire  * 2.0) +
    (post.reactions.hug   * 2.0) +
    (post.reactions.sad   * 1.5);

  // Echo weight (echoes are the strongest social signal)
  const echoScore = post.echoes.length * 4;

  // Freshness decay: exponential, half-life = 8 hours
  const decay = Math.pow(0.5, ageHours / 8);

  // Hard cap: posts over 36 hours old cannot appear in the main Hero feed
  if (ageHours > 36) return -1;

  return (reactionScore + echoScore) * decay;
}
```

Add `getSortedFeed(posts: Unsaid[]): { heroFeed: Unsaid[], earlierFeed: Unsaid[] }`:
```typescript
export function getSortedFeed(posts: Unsaid[]) {
  const scored = posts
    .map(p => ({ post: p, score: scorePost(p) }))
    .sort((a, b) => b.score - a.score);

  const heroFeed = scored.filter(p => p.score >= 0).map(p => p.post);
  const earlierFeed = scored.filter(p => p.score < 0).map(p => p.post)
    .sort((a, b) => b.createdAt - a.createdAt); // chronological for "From Earlier"

  return { heroFeed, earlierFeed };
}
```

#### [MODIFY] `src/routes/index.tsx`

Replace the current feed rendering with:
1. Call `getSortedFeed(allPosts)`
2. Render `heroFeed` posts normally
3. After the hero feed, insert a subtle divider: a thin horizontal rule with label `"From Earlier"` styled in muted text
4. Render `earlierFeed` below it with slightly lower opacity (`opacity-70`)

---

### 1.2 — Progressive Tab Disclosure (Hick's Law)

**Goal**: New users see only the Wall and Write. The Duel and Baji Read tabs are revealed progressively after they take real actions.

#### [MODIFY] `src/lib/identity.ts`

Add to `BajiIdentity`:
```typescript
totalActions: number;  // incremented on every reaction, echo, post, duel vote
tabsUnlocked: {
  duel: boolean;   // unlocks at totalActions >= 3
  read: boolean;   // unlocks at totalActions >= 5
};
```

Add function:
```typescript
export function recordAction(): void {
  const identity = getOrCreateIdentity();
  identity.totalActions = (identity.totalActions ?? 0) + 1;

  if (identity.totalActions >= 3) identity.tabsUnlocked.duel = true;
  if (identity.totalActions >= 5) identity.tabsUnlocked.read = true;

  localStorage.setItem("bh:identity", JSON.stringify(identity));
}
```

Call `recordAction()` at every interaction point: reaction tap, echo submission, post submission, duel vote.

#### [MODIFY] `src/components/bajihears/BottomNav.tsx`

Read `tabsUnlocked` from identity. For locked tabs:
- The tab icon is **visible but dimmed** (`opacity-30`), not hidden — hiding is jarring
- On tap of a locked tab, show a bottom toast: *"Do 3 things on the wall — then The Duel opens for you."*
- When a tab unlocks, play a subtle unlock animation: the icon scales from 0.6 to 1.0 with a spring bounce and emits a brief glow pulse

---

### 1.3 — The "One More" In-Feed Writing Prompt

**Goal**: After the user reads 5 consecutive cards without writing, insert a soft writing CTA directly in the feed as a card — not a popup.

#### [NEW COMPONENT] `src/components/bajihears/FeedWritingPrompt.tsx`

A card that lives in the feed at position 6 (every 5 cards), styled identically to a confession card but with:
- A quill icon at the top
- Copy: *"You've been listening for a while."*
- Subtext (rotated randomly from 10 options): 
  - *"Anything you've been afraid to say out loud?"*
  - *"Someone on this wall probably said something you needed to hear."*
  - *"The one thing you'd post if no one knew it was you."*
- A single button: `"Write it"` — taps scroll to the WritingBox and focus the textarea

#### [MODIFY] `src/routes/index.tsx`

In the feed render loop, after every 5th `UnsaidCard`, inject `<FeedWritingPrompt />`. Keep a `feedCardsRead` counter in local component state (incremented when a card becomes visible via `IntersectionObserver`).

---

### 1.4 — Engineered First-Impression: The Winner Card Pinning

**Goal**: The very first card a new user sees is always the highest-quality post of the last 24 hours — the "Baji Heard It" winner. It must feel curated, not algorithmic.

#### [MODIFY] `src/lib/bajihears.ts`

Add `getWinner(posts: Unsaid[]): Unsaid | null`:
- Filter posts to last 24h
- Run through `scorePost()`, take the top result
- Cache the winner in `bh:currentWinner` with a 1-hour TTL so it doesn't shift every second

#### [MODIFY] `src/routes/index.tsx`

Before rendering the hero feed, always render the winner card first if one exists. The winner card uses the existing `UnsaidCard` component but with:
- An extra prop `isWinner={true}` that adds a gold top-border accent and a `"⭐ Baji Heard This"` label badge
- A `RevealCountdown` component below it: *"Posted on @bajihears_ig in [X hours Y minutes]"*

---

## Phase 2: Make Warmth the Real Social Currency

---

### 2.1 — Visible Warmth Aura on Handle Posts

**Goal**: When a user posts under their handle (non-anonymously), their Warmth tier is visually signalled on their post — making high-Warmth users recognizable.

#### [MODIFY] `src/components/bajihears/UnsaidCard.tsx`

The post header area shows `handle | category`. When `handle !== null`:
- Read the Warmth tier from `bh:warmth` in localStorage
- Apply a CSS class that adds a colored glow to the handle text:
  ```
  Ember  (0–149):    no aura
  Flicker (150–599): subtle amber text glow `text-shadow: 0 0 8px rgba(255,133,51,0.6)`
  Glow (600–1499):   violet pulse (CSS animation)
  Blaze (1500–3999): bright orange-red glow
  Bonfire (4000+):   animated gold shimmer + a 👑 icon prepended to handle
  ```

> **Important**: Only show aura for posts by the current device's handle. We cannot know other users' Warmth since there's no backend. For now: if the handle matches `identity.handle`, apply tier aura. Mark as `// LATER: backend — pull warmth tier from user profile`.

---

### 2.2 — The Warmth Economy: Full Item Store

**Goal**: Make Warmth spendable on things users genuinely want. Build a Warmth Store.

#### [NEW FILE] `src/lib/warmthStore.ts`

Define the catalog of purchasable items:
```typescript
type StoreItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'feature' | 'cosmetic' | 'social';
  icon: string;
  isLimited?: boolean;          // for seasonal drops
  usesRemaining?: number;       // if limited supply
  action: 'pin_post' | 'new_avatar' | 'spotlight_nomination' | 'exclusive_preset' | 'baji_regular_badge' | 'deep_read';
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'deep_read',
    name: 'Deeper Baji Read',
    description: 'Unlock the bonus line in your Baji Read — the one that hits harder.',
    cost: 30,
    category: 'feature',
    icon: '🔮',
    action: 'deep_read',
  },
  {
    id: 'pin_post',
    name: 'Pin to Category Top',
    description: 'Your post stays at the top of its category feed for 2 hours.',
    cost: 50,
    category: 'social',
    icon: '📌',
    action: 'pin_post',
  },
  {
    id: 'new_avatar',
    name: 'New Avatar',
    description: 'Get a fresh random avatar seed. New look, same soul.',
    cost: 75,
    category: 'cosmetic',
    icon: '🎭',
    action: 'new_avatar',
  },
  {
    id: 'spotlight_nomination',
    name: 'Baji Spotlight',
    description: 'Your post is nominated for this week\'s Instagram feature.',
    cost: 100,
    category: 'social',
    icon: '✨',
    action: 'spotlight_nomination',
  },
  {
    id: 'exclusive_preset_aurora',
    name: 'Aurora Preset',
    description: 'A sharing preset not available in the free set. Limited drop.',
    cost: 200,
    category: 'cosmetic',
    icon: '🌌',
    action: 'exclusive_preset',
    isLimited: true,
    usesRemaining: 50,
  },
  {
    id: 'baji_regular',
    name: 'Baji Regular Badge',
    description: 'A permanent 👑 badge shown next to your handle on every post.',
    cost: 300,
    category: 'social',
    icon: '👑',
    action: 'baji_regular_badge',
  },
];
```

Store purchased items in `bh:purchasedItems: string[]` (array of item IDs).

#### [NEW COMPONENT] `src/components/bajihears/WarmthStore.tsx`

A full-screen bottom sheet (using existing `Sheet` component) accessible from the WarmthSheet:
- Header: `"Spend Your Warmth"` with current Warmth balance shown
- Grouped sections: Feature / Social / Cosmetic
- Each item: card with icon, name, description, and a `"Spend [X] Warmth"` button
- Button state: disabled + muted if user can't afford it; shows progress `"[current] / [cost]"` for unaffordable items
- On purchase: confirmation animation (Warmth counter ticks down), WarmthToast fires with negative amount
- Link from WarmthSheet's bottom: `"Browse the Warmth Store →"`

---

### 2.3 — The Warmth Gift Mechanic

**Goal**: Allow users to give 10 Warmth to any post they loved. Creates emotional reciprocity and a reason to return.

#### [MODIFY] `src/components/bajihears/UnsaidCard.tsx`

Add a small gift icon button (🎁) to the bottom-right of each card, next to the existing share/echo icons.

**Interaction flow**:
1. User taps 🎁
2. A small popover appears: *"Send 10 Warmth to this post?"*
3. Two buttons: `"Send it"` (costs 10 Warmth from giver, adds nothing to receiver — `// LATER: backend to credit receiver`) and `"Never mind"`
4. On send: button becomes ✅ (disabled, already gifted), WarmthToast shows `"-10 Warmth — sent with kindness"`
5. Store gifted post IDs in `bh:giftedPosts: string[]` to prevent double-gifting

**Notification simulation** (since no backend yet): Store a `bh:giftNotifications: { postId, timestamp, amount }[]` and show a badge on the Corner tab indicating pending gifts to read. `// LATER: backend push notification`

---

### 2.4 — Community Regulars Wall Section

**Goal**: Users who maintain a 30-day streak earn a spot in a visible "Community Regulars" section on the Wall, giving them a reason to protect that streak.

#### [NEW COMPONENT] `src/components/bajihears/CommunityRegulars.tsx`

A collapsible card at the top of the Wall (above the WritingBox, below the winner card):
- Title: `"Baji Regulars 👑"` with subtitle `"30+ day streaks"`
- Shows a row of small avatar circles (pixel-art style) with handles
- For MVP: since there's no backend, this shows only the current user if they have a 30+ day streak. Mark prominently as `// LATER: backend — pull from leaderboard`
- If the current user has 14+ days but less than 30: shows a teaser: *"${30 - streak} days until you're a Baji Regular"*

---

## Phase 3: Build the Viral Distribution Flywheel

---

### 3.1 — Deep Link Share Cards

**Goal**: Every shared confession generates a URL that lands on that exact post — not the homepage.

#### [MODIFY] `src/lib/bajihears.ts`

Add a function to generate a shareable short code for any post:
```typescript
export function generateShareCode(postId: string): string {
  // 8-character URL-safe base from the post ID
  return postId.replace(/-/g, '').substring(0, 8).toUpperCase();
}

export function buildShareUrl(postId: string): string {
  return `https://bajihears.com/c/${generateShareCode(postId)}`;
}
```

#### [NEW ROUTE] `src/routes/c.$code.tsx`

A TanStack Router route at `/c/[code]` that:
1. Reads all posts from localStorage
2. Finds the matching post by comparing `generateShareCode(post.id)` against the URL param
3. If found: renders the Wall with that post pinned to the top and visually highlighted (gold border, `"Someone sent you here ✨"` badge)
4. If not found: shows a soft fallback — *"This post may have expired. Here's what's on the wall right now."* — and renders the normal feed

#### [MODIFY] `src/components/bajihears/UnsaidCard.tsx`

When the user taps the Share button:
1. Generate the share URL via `buildShareUrl(post.id)`
2. The existing `BajiReadShareDialog` / quote card flow: add the share URL subtly at the bottom of the generated card image (styled in the aesthetic: `bajihears.com/c/XXXXXX`)
3. Also add a plain `"Copy Link"` button that copies just the URL to clipboard
4. The link text in the image should be styled in the card's `ink` color — feels native to the design, not a footer

---

### 3.2 — Duel Viral Loop: Vote Scarcity + Share Your Side

**Goal**: Transform the Duel from a passive poll into a viral sharing engine with real stakes.

#### [MODIFY] `src/lib/bajihears.ts`

Add to the Duel data model (in the duels array / localStorage):
```typescript
type Duel = {
  id: string;
  optionA: string;
  optionB: string;
  category?: string;
  totalVotesNeeded: number;  // default: 100
  votesA: number;            // simulated + real
  votesB: number;
  revealedAt: number | null; // timestamp when result first became visible (votesA+votesB >= 100)
  createdAt: number;
}
```

For MVP (no real multi-user backend): simulate `votesA` and `votesB` with a realistic pre-seeded count (e.g., 60–85 total votes already in) so that the **first user to vote pushes it over the 100 threshold**. This makes every single visitor feel like they were the deciding vote. Mark `// LATER: backend — real vote counts`.

#### [MODIFY] `src/components/bajihears/DuelCard.tsx`

**Before voting state**:
- Show vote counts hidden: `"?? vs ??"`
- Show a live counter: `"[X] votes in — [Y] more to reveal the results"` where Y = 100 - (votesA + votesB)
- This creates FOMO. The user sees "8 more votes" and feels compelled to be one of them.

**After voting state** (when total >= 100):
- Reveal the split with a dramatic animation: numbers count up from 0 over 1.5 seconds
- Show `"You were the [X]th vote 🎉"` — always make it feel significant
- Immediately display a Share button: **"Share Your Side"**

**Share Your Side flow**:
1. Generates a card (using canvas, same mechanism as BajiReadShareDialog) that says:
   - `"I voted Team A"` (or B)
   - The duel question in smaller text
   - `"Which side are you on? → bajihears.com/duel/[id]"` 
2. On mobile: `navigator.share({ text, url })` for native share sheet
3. On desktop: copy to clipboard with confirmation

#### [NEW ROUTE] `src/routes/duel.$id.tsx`

A route at `/duel/[id]` that deep-links to a specific duel:
1. If duel exists and isn't resolved: show it prominently with `"Someone challenged you to vote on this"` header
2. If already voted by this device: show the result and share
3. Award `+5 Warmth` on vote (already exists in warmth.ts — just ensure it fires here too)

---

### 3.3 — Baji Read Acquisition Loop

**Goal**: Baji Read archetype cards drive new users to earn their own read.

#### [MODIFY] `src/components/bajihears/BajiReadCard.tsx`

When the user taps `Share` on their archetype card, the generated image must include:
- The archetype name and emoji
- Hook line quote
- Bottom text: *"Find yours at bajihears.com/read"*

The `/read` route already exists. Ensure the share URL in the card is `bajihears.com/read` (not the homepage).

#### [MODIFY] `src/routes/read.tsx`

When the page loads and the user is new (no actions taken yet), show a different locked state message based on a URL param `?ref=share`:

```typescript
// If URL has ?ref=share, the user arrived from someone's shared Baji Read card
const isReferral = new URLSearchParams(window.location.search).get('ref') === 'share';
```

If `isReferral`:
- Replace the generic locked message with: *"Someone who knows you sent you here."*
- Show their sharer's archetype name (not person — just the archetype): e.g., *"An Overthinker shared this. What are you?"*
- Show the exact 3 actions needed with animated progress dots: `"React to 2 posts → Vote in 1 Duel → Your Baji Read unlocks"`

This creates a compelling, personalized onboarding moment for referred users.

---

### 3.4 — The "Which One Are You?" Duel Post Type

**Goal**: Implement the Phase 3 vision from PROJECT_VISION.md — A/B interactive posts side by side.

#### [MODIFY] `src/lib/bajihears.ts`

Extend the `Unsaid` type to support a new `type` field:
```typescript
type Unsaid = {
  // ... existing fields
  type: 'confession' | 'which_one';   // new field, default 'confession'
  whichOne?: {                         // only present when type === 'which_one'
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
  };
}
```

#### [MODIFY] `src/components/bajihears/WritingBox.tsx`

Add a toggle at the top of the writing interface:
- Two mode buttons: `"Write a confession"` | `"Which one are you?"`
- When `"Which one are you?"` is selected, the textarea splits into two side-by-side input boxes labeled `"Option A"` and `"Option B"` with a `"vs"` divider

#### [NEW COMPONENT] `src/components/bajihears/WhichOneCard.tsx`

A card that renders `type === 'which_one'` posts differently from confessions:
- Side-by-side layout: two rounded panels (`A` | `B`)
- Each panel shows the option text
- Tap one panel to vote — panel scales up, other fades to 60% opacity
- After vote: show vote percentages as progress bars inside each panel
- Share button on the voted panel: same "Share Your Side" mechanic as Duels

---

## Phase 4: Trust Infrastructure & Content Quality

---

### 4.1 — Warmth-Gated 30-Minute Publish Queue

**Goal**: New devices (0 Warmth, no history) have their posts held for 30 minutes before publishing. Prevents spam while being invisible to legitimate users.

#### [MODIFY] `src/lib/bajihears.ts`

Extend `Unsaid` type:
```typescript
type Unsaid = {
  // ... existing fields
  status: 'published' | 'pending' | 'rejected'; // default 'published'
  pendingUntil?: number;   // timestamp when it auto-publishes
  deviceToken: string;     // which device submitted it
}
```

When submitting a post (in `index.tsx`'s `handleSubmit`):
```typescript
const identity = getOrCreateIdentity();
const totalWarmth = readWarmth().total;
const isPending = totalWarmth < 50;

const newPost: Unsaid = {
  // ... existing fields
  status: isPending ? 'pending' : 'published',
  pendingUntil: isPending ? Date.now() + 30 * 60 * 1000 : undefined,
  deviceToken: identity.deviceToken,
};
```

In `readUnsaids()` / feed rendering: filter out posts where `status === 'pending'` **unless** `post.deviceToken === identity.deviceToken` (user always sees their own pending post with a *"Your post is warming up — visible to others in [countdown]"* status badge).

A `useEffect` in the root that runs every 60 seconds: loop through all posts, auto-promote any `pending` post whose `pendingUntil < Date.now()` to `published`.

---

### 4.2 — Echo Veto (Community Moderation)

**Goal**: Community members can "un-echo" a post. 5 un-echoes hides it from the main feed pending review.

#### [MODIFY] `src/lib/bajihears.ts`

Extend `Unsaid`:
```typescript
type Unsaid = {
  // ...
  vetoCount: number;          // number of unique devices that have vetoed
  vetoedBy: string[];         // array of deviceTokens that vetoed (for deduplication)
  status: 'published' | 'pending' | 'review' | 'rejected';
}
```

Add function `vetoPost(postId: string, deviceToken: string): void`:
- Guard: cannot veto your own post (`post.deviceToken === deviceToken`)
- Guard: cannot veto twice (check `post.vetoedBy.includes(deviceToken)`)
- Increment `post.vetoCount`, push `deviceToken` to `post.vetoedBy`
- If `post.vetoCount >= 5 && post.echoes.length < 3`: change status to `'review'`
- Posts in `'review'` status are hidden from the main feed, visible only to the submitter with a neutral `"This post is being reviewed"` message

Store veto rewards: if a vetoed post is confirmed as spam (it expires without being un-vetoed within 24h), award `+2 Warmth` to each device that vetoed it. Store pending rewards in `bh:pendingVetoRewards`.

#### [MODIFY] `src/components/bajihears/UnsaidCard.tsx`

Add a very subtle overflow menu (three-dot `•••`) on each card. Inside:
- `"Something feels off"` — triggers the Echo Veto (styled softly, not as "Report")
- `"Copy text"` (already exists)
- `"Share"` (already exists)

The veto action should feel gentle — not punitive. The language is intentionally understated.

---

### 4.3 — Spam Filter (Auto-Check on Submit)

**Goal**: Run a fast client-side filter before any post is accepted. Block obvious spam patterns.

#### [NEW FILE] `src/lib/spamFilter.ts`

```typescript
const BLOCKED_PATTERNS = [
  /https?:\/\//i,                   // any URL
  /wa\.me\/\d+/i,                   // WhatsApp links
  /\+92\d{10}/,                     // Pakistani phone numbers
  /(.)\1{6,}/,                      // 7+ repeated characters (aaaaaaa)
  /[A-Z\s]{20,}/,                   // all-caps screaming (20+ chars)
  /\bfollow me\b/i,
  /\binstagram\.com\b/i,
];

const MIN_WORDS = 4;
const MAX_IDENTICAL_WORDS_RATIO = 0.7; // if 70%+ of words are the same word, likely spam

export type FilterResult = {
  passed: boolean;
  reason?: string;
};

export function checkSpam(text: string): FilterResult {
  if (!text.trim()) return { passed: false, reason: "Empty post" };

  const words = text.trim().split(/\s+/);
  if (words.length < MIN_WORDS) return { passed: false, reason: "Too short" };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) return { passed: false, reason: "Contains blocked content" };
  }

  // Word repetition check
  const wordCounts = words.reduce((acc, w) => {
    acc[w.toLowerCase()] = (acc[w.toLowerCase()] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxRepeat = Math.max(...Object.values(wordCounts));
  if (maxRepeat / words.length > MAX_IDENTICAL_WORDS_RATIO) {
    return { passed: false, reason: "Repetitive content" };
  }

  return { passed: true };
}
```

**Rate limiting**: Store `bh:postTimestamps: number[]` — array of timestamps for posts in the last 60 minutes. If count >= 3, block with message: *"You've posted 3 times this hour — give others some space. Come back soon."*

---

## Phase 5: Membership & Monetization (Day 120+)

---

### 5.1 — The Baji Regular Membership System

**Goal**: A voluntary monthly membership with cosmetic + social benefits. No paywalling of core features.

#### [NEW FILE] `src/lib/membership.ts`

```typescript
type MembershipStatus = {
  isActive: boolean;
  plan: 'free' | 'regular';
  expiresAt: number | null;      // timestamp
  exclusivePresets: string[];    // keys of unlocked exclusive presets
}

const DEFAULT_STATUS: MembershipStatus = {
  isActive: false,
  plan: 'free',
  expiresAt: null,
  exclusivePresets: [],
};

export function getMembershipStatus(): MembershipStatus {
  const stored = localStorage.getItem("bh:membership");
  return stored ? JSON.parse(stored) : DEFAULT_STATUS;
}

export function isMember(): boolean {
  const status = getMembershipStatus();
  if (!status.isActive) return false;
  if (status.expiresAt && status.expiresAt < Date.now()) {
    // Membership expired — downgrade silently
    localStorage.setItem("bh:membership", JSON.stringify({ ...status, isActive: false, plan: 'free' }));
    return false;
  }
  return true;
}
```

> **Note**: Real membership requires a payment backend (Stripe, Gumroad, or simple DM-based manual activation for early MVP). For MVP: provide a `activateMembership(code: string)` function that validates a hardcoded list of activation codes issued manually. `// LATER: backend — Stripe webhook sets membership status`.

#### [NEW COMPONENT] `src/components/bajihears/MembershipSheet.tsx`

A bottom sheet accessible from the Corner page (a subtle `"Baji Regular ✦"` button at the bottom):
- Styled in deep dark gold tones — premium feel
- Header: `"Become a Baji Regular"` with animated gold shimmer on the title
- Three benefit cards:
  1. 🌙 `"Seasonal Presets"` — 3 exclusive sharing presets per month, dropped as limited batches
  2. 📊 `"Weekly Insights"` — *"This week, 73% of the wall was about loneliness. You were one of them."* (personalized weekly summary)
  3. 👑 `"The Badge"` — your handle gets a subtle `✦` symbol on all posts
- Price shown prominently in local currency context (to be decided, but show a placeholder: `"Coming Soon — join the waitlist"` for the MVP)
- A waitlist form: just a WhatsApp number input that opens a pre-filled WhatsApp message to the Baji account

---

### 5.2 — Exclusive Seasonal Preset Drops

**Goal**: Themed sharing presets released in limited quantities (e.g., 100 copies). Creates scarcity and desire.

#### [MODIFY] `src/lib/bajihears.ts`

Add to `PRESETS`:
```typescript
// Exclusive presets — only available via Warmth Store or Membership
export const EXCLUSIVE_PRESETS: (Preset & { isExclusive: true; totalSupply: number; remaining: number })[] = [
  {
    key: "aurora-borealis",
    name: "Aurora",
    from: "#0f2027",
    to: "#203a43",
    ink: "#a8edea",
    isExclusive: true,
    totalSupply: 100,
    remaining: 100, // // LATER: backend — track globally
  },
  {
    key: "rose-dust",
    name: "Rose Dust",
    from: "#4b1248",
    to: "#f10711",
    ink: "#ffe8e8",
    isExclusive: true,
    totalSupply: 50,
    remaining: 50,
  },
];
```

In `BajiReadShareDialog.tsx` and `QuoteCardDialog.tsx`: check `getMembershipStatus().exclusivePresets` and `localStorage.getItem("bh:purchasedItems")` to decide which presets to show in the preset selector. Locked presets show as blurred with a `"Warmth Store"` label.

---

## Summary: Full File Change Map

```
Phase 0:
  [NEW] src/lib/identity.ts
  [NEW] src/lib/notifications.ts
  [NEW] src/lib/seedData.ts
  [NEW] public/sw.js
  [NEW] src/components/bajihears/PushPermissionSheet.tsx
  [MODIFY] src/lib/warmth.ts          — claimDailyBonus()
  [MODIFY] src/lib/bajihears.ts       — initializeWall(), scorePost()
  [MODIFY] src/routes/__root.tsx      — call identity, streak, daily bonus on mount
  [MODIFY] src/routes/corner.tsx      — add StreakCard component

Phase 1:
  [NEW] src/components/bajihears/FeedWritingPrompt.tsx
  [MODIFY] src/lib/bajihears.ts       — getSortedFeed(), getWinner()
  [MODIFY] src/routes/index.tsx       — hero feed algorithm, winner card, in-feed prompt
  [MODIFY] src/components/bajihears/BottomNav.tsx     — progressive tab unlock
  [MODIFY] src/components/bajihears/UnsaidCard.tsx    — isWinner prop

Phase 2:
  [NEW] src/lib/warmthStore.ts
  [NEW] src/components/bajihears/WarmthStore.tsx
  [NEW] src/components/bajihears/CommunityRegulars.tsx
  [MODIFY] src/components/bajihears/WarmthSheet.tsx   — link to store
  [MODIFY] src/components/bajihears/UnsaidCard.tsx    — gift button, warmth aura

Phase 3:
  [NEW] src/routes/c.$code.tsx        — deep link landing for confessions
  [NEW] src/routes/duel.$id.tsx       — deep link landing for duels
  [NEW] src/components/bajihears/WhichOneCard.tsx
  [MODIFY] src/lib/bajihears.ts       — generateShareCode(), buildShareUrl(), Duel model
  [MODIFY] src/components/bajihears/DuelCard.tsx      — vote scarcity, Share Your Side
  [MODIFY] src/components/bajihears/BajiReadCard.tsx  — share URL to /read
  [MODIFY] src/routes/read.tsx        — referral state (?ref=share)
  [MODIFY] src/components/bajihears/WritingBox.tsx    — Which One mode

Phase 4:
  [NEW] src/lib/spamFilter.ts
  [MODIFY] src/lib/bajihears.ts       — Unsaid status, vetoPost(), pending queue
  [MODIFY] src/components/bajihears/UnsaidCard.tsx    — echo veto menu
  [MODIFY] src/routes/index.tsx       — post submit spam check, rate limit

Phase 5:
  [NEW] src/lib/membership.ts
  [NEW] src/components/bajihears/MembershipSheet.tsx
  [MODIFY] src/lib/bajihears.ts       — exclusive presets
  [MODIFY] src/components/bajihears/BajiReadShareDialog.tsx  — member preset gating
  [MODIFY] src/components/bajihears/QuoteCardDialog.tsx      — member preset gating
  [MODIFY] src/routes/corner.tsx      — membership entry point
```

---

## Backend Migration Checklist

When BajiHears is ready for a real backend (Supabase, PlanetScale, Cloudflare D1, or similar), every `// LATER: backend` comment marks an exact migration point. The priority order:

1. **Posts storage** — move `bh:unsaids` from localStorage to a real DB table. All other users can then see each other's posts.
2. **Push subscriptions** — store VAPID subscription endpoints server-side; set up a cron job for daily push sends.
3. **Vote/reaction counts** — Duel votes and reaction counts become real multi-user aggregate data.
4. **Warmth ledger** — per-user Warmth transactions stored server-side (enables cross-device continuity and prevents manipulation).
5. **Membership payments** — Stripe integration, webhook updates membership status in DB.
6. **Identity** — optional: allow users to "claim" their device identity with an email, preserving their Warmth and streak across devices.
