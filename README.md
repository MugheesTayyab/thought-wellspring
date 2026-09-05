# Thought Wellspring

# Thought Wall — UI/UX Implementation Plan (for Lovable)
### Document 1 of 2 — Frontend design & interaction spec, no backend logic

This document describes every screen, state, and interaction needed to build the frontend in Lovable. It assumes Lovable will connect to a backend later (Document 2), so every interactive element here should be built with mock/local state first, then wired to real data once the backend exists. Written so a UI/UX developer can build this without needing to ask "what happens when—" for any case.

---

## 1. Design Direction

**Visual identity — carry over from the existing Instagram account:**
- Dark mode as the default and only theme (matches existing reel aesthetic, matches late-night "overthinking" emotional tone, and it's what the audience already associates with the brand).
- Accent gradient: orange → red (already established brand color from the reels — pull directly from the account's visual style so the site feels like a natural extension, not a separate product).
- Typography: bold, high-contrast, centered text for quote cards (mirrors reel text style exactly). Body/UI text: clean sans-serif, high legibility on dark background.
- Mobile-first, full stop. Assume 95%+ of traffic arrives from an Instagram bio link on a phone. Desktop is a secondary, "nice to have" breakpoint, not a primary design target.

**Tone of UI copy:**
- First-person, intimate, slightly poetic — never corporate. Buttons and empty states should sound like the account's own voice ("overthinking out loud"), not generic SaaS copy.
- Example: instead of "Submit," consider "Say it." Instead of "No results," consider "Nothing here yet. Be the first to say it."

---

## 2. Core Screens

### 2.1 Landing / Feed Screen (Home)
This is the screen 95% of new visitors land on directly from the bio link.

**Layout (top to bottom):**
1. **Header bar** — site name/logo (small, left-aligned), no navigation clutter. Optional small "submit" icon top-right that scrolls to/opens the submission box.
2. **"Today's Top Thought" hero card** — visually distinct (larger card, subtle glow/border, "🔥 Today's Top" label). This is the first thing every visitor sees — it must load instantly and be readable in under 2 seconds of attention, since most visitors are impulse-clicking from a reel.
3. **Submission box** — sits directly below the hero, not buried in a separate page. The primary action (submitting) should require zero navigation.
4. **Sort tabs** — Top (24h) / New / All-Time Loved. Default: Top (24h).
5. **Infinite scroll card feed** — one thought per card.
6. **Sponsored slot** — visually distinguished (subtle "Sponsored" label, slightly different card treatment) inserted at a fixed position (e.g., always 2nd card) so it's honest but not disruptive.

**Card feed interaction states:**
- Default state: text, relative timestamp, reaction icons row, upvote count.
- On tap of a reaction: immediate optimistic UI update (count increments instantly, icon fills/animates) — do not wait on network round-trip, this is critical for a "feels alive" experience.
- Already-reacted state: icon shown filled/highlighted, tapping again removes the reaction (toggle behavior).
- "Featured on Reel 🎬" badge: small pill in the corner of any card that made it into a reel — tapping it could deep-link to that reel (nice-to-have, not MVP-critical).
- Reply thread (if implemented): collapsed by default, showing "2 replies" as a tappable link that expands inline — never navigates to a new page, keep it in-feed to preserve scroll momentum.

**Empty/loading/error states (must all be designed, not left to chance):**
- Initial load: skeleton cards (pulsing placeholder shapes), never a blank white/black screen or spinner-only state.
- No submissions yet (cold start day one): a warm, on-brand empty state — "Nothing here yet. Be the first to say what you've been holding back." with the submission box emphasized.
- Feed load failure: friendly retry state, not a technical error message.
- End of feed reached: soft message, e.g. "You've read them all. Come back tomorrow." — this reinforces the daily-return habit loop rather than feeling like a dead end.

---

### 2.2 Submission Flow

This is the single most important interaction in the entire product — it must have the least possible friction.

**Step 1 — Text input**
- Single text box, placeholder text that invites vulnerability (e.g., "What did you never get to say...").
- Live character counter (max 280), counter changes color as it approaches the limit (e.g., turns orange at 250, red at 275).
- No other fields visible yet — keep the first interaction to just typing.

**Step 2 — Identity choice**
- Appears only after text is entered (progressive disclosure — don't front-load decisions).
- Two large, clearly distinct tap targets: "Post Anonymous" vs "Tag my @handle" (if tagging, a small inline field appears for the handle).
- Anonymous should be the visually default/pre-highlighted option — this is intentional, since lowering the barrier to vulnerable content is core to the product's value.

**Step 3 — Optional email**
- A single small, clearly optional field: "Want us to notify you if this gets featured? (optional)"
- Must be visually de-emphasized (smaller, muted color) so it never feels like a requirement blocking submission.

**Step 4 — Submit confirmation**
- On tap: button shows a brief loading micro-state (not a spinner-only screen — keep the whole page visible).
- Success state: the just-submitted thought animates into the top of the feed (or a dedicated "Your thought is live" confirmation card), reinforcing that the action mattered and was seen.
- Immediately after: replace the submission box with the **lockout state**.

**Lockout state (post-submission, 1-per-day rule):**
- Submission box is replaced with a countdown: "Your thought is live. Next submission unlocks in 23h 59m."
- Countdown should visually tick (even if just updating on screen focus/refresh, not necessarily real-time-per-second) so it feels alive rather than static text.
- Below the countdown: a soft nudge to browse the feed instead — "While you wait, see what others are saying" with the feed still fully visible/scrollable.

**Validation & edge cases to design for:**
- Empty submission attempt: button stays disabled (grayed) until minimum text length (e.g., 3 characters) is entered — don't rely on an error message after the fact.
- Already submitted today (returning visitor): show the lockout state immediately on page load, don't let them re-enter the flow only to be rejected after typing.
- Handle field with @ symbol typed redundantly: auto-strip leading @ so display stays consistent.
- Very short device/browser windows (small phones): submission box must never be pushed below the fold entirely — test at smallest common viewport (iPhone SE width).

---

### 2.3 Reaction & Interaction Micro-details

- Reaction row per card: ❤️ (love/relate), 😢 (hits deep), 🔥 (relatable hard), 🫂 (comfort/solidarity). Keep to 4 max — more creates decision fatigue and visual clutter on a small card.
- Each reaction shows a live count; on tap, count updates optimistically and icon animates (subtle scale/bounce — not a jarring animation).
- Reply interaction (if in scope): tapping "Reply" opens an inline single-line input directly under the card, not a modal or new page — preserves context and scroll position.
- Share-to-Story action: a small share icon on each card that generates a branded quote-card image (see 2.5) and opens the native share sheet (or, at minimum, downloads the image with clear instructions if native share isn't available).

---

### 2.4 Mood/Category Filter (if in scope for launch)

- A horizontally scrollable pill/chip row above the feed: All, Heartbreak, College, Friendship, Late Night, Family, etc.
- Selecting a chip filters the feed in place (no page reload feel) and updates the sort tabs to apply within that filtered set.
- Design so this row can be entirely absent without breaking layout — this is a Phase 2 addition, the MVP screen should look complete without it.

---

### 2.5 Shareable Quote Card Generator

- Triggered from the share icon on any card.
- Generates an image matching the exact visual style of the existing Instagram reels (orange/red gradient background, bold centered text, small site watermark/logo in a corner).
- Preview shown before sharing/downloading — user should see exactly what will be shared, not be surprised by the output.
- This is a critical growth lever: every shared card is a piece of branded content leaving the platform for free, so the visual polish here matters as much as the reels themselves.

---

### 2.6 Archive / "Featured on Reel" Page (Phase 2)

- A simple chronological or grid list of every thought that has been turned into a reel.
- Each entry: the thought text, date featured, and (if available) a thumbnail/link to the actual reel.
- Purpose: gives submitters a visible goal to chase, and gives you a ready-made portfolio page to show potential sponsors without extra work.

---

### 2.7 Leaderboard (Phase 2, optional)

- Simple list: top 10 tagged (non-anonymous) submitters this month by total upvotes received.
- Keep light-touch — this should feel like a fun mention, not a competitive scoreboard with rankings/medals that could discourage new/lower-engagement users.

---

### 2.8 Weekly Digest Landing (for email subscribers, Phase 2)

- A simple, scannable web version of "This week's most loved thoughts" that the email links to — 5-10 cards, no submission box needed here (this page is for reading, not converting).
- Include one visually distinct sponsor slot at the top, matching the in-feed sponsored card treatment for consistency.

---

## 3. Interaction Principles (apply across every screen)

1. **Never block the read experience.** A visitor should be able to scroll and read the feed even while in a lockout state, even before submitting, even without an account. Reading must always be frictionless.
2. **Optimistic UI everywhere.** Reactions, submissions, and shares should visually respond instantly, not after a network round trip. This is what makes the product feel "alive" rather than like a form.
3. **Progressive disclosure in the submission flow.** Never show all fields (text, identity, email) at once — reveal each only once the prior step is complete, to reduce perceived effort.
4. **Every empty/loading/error state is designed, not default.** No blank screens, no generic browser error pages, no bare spinners with nothing else on screen.
5. **The brand voice must be consistent in every microcopy string** — buttons, placeholders, empty states, error messages. This is a small product; a mismatched tone anywhere (e.g., a generic "Error 404" page) breaks the emotional immersion that makes people submit vulnerable content in the first place.
6. **Design for the countdown/lockout state as a first-class screen**, not an afterthought — a large fraction of daily returning visitors will see this state before anything else.

---

## 4. Screen Inventory Summary (for Lovable build checklist)

| Screen/Component | Priority | Notes |
|---|---|---|
| Home/Feed (with hero "Today's Top") | MVP | Core screen, must be flawless |
| Submission flow (3-step + lockout) | MVP | Core interaction |
| Reaction system (4 icons, optimistic) | MVP | |
| Sponsored card slot | MVP | Needed from day 1 to start selling placements |
| Empty/loading/error states | MVP | All variants, not just happy path |
| Shareable quote card generator | MVP | Primary organic growth lever |
| Mood/category filter | Phase 2 | Design so absence doesn't break layout |
| Reply threads | Phase 2 | |
| Archive/"Featured on Reel" page | Phase 2 | |
| Leaderboard | Phase 2 | Optional, light-touch |
| Weekly digest web page | Phase 2 | |
| Streak indicator (Phase 3, requires accounts) | Phase 3 | Depends on backend auth existing first |

---

## 5. Handoff Notes to the Software Engineer (Document 2)

- Every screen above should be built first against local/mock state in Lovable so the full interaction flow can be demoed and user-tested before any backend exists.
- Flag clearly in the Lovable build which pieces of state are currently mocked (submission lockout timer, reaction counts, sponsored slot content) so the backend engineer knows exactly what needs a real data source.
- The "1 submission per 24h" and "1 reaction per thought per device per day" rules are enforced here only visually/optimistically (localStorage-based) — the real enforcement and anti-spam logic belongs entirely in Document 2's backend plan. The frontend should be built to *trust* a backend response about whether a user can submit/react, not to be the source of truth itself, so this can be swapped in cleanly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3393e900-aa94-4cbd-a3c7-90910392ab32).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
