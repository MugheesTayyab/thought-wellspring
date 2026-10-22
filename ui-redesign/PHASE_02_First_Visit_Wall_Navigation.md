# PHASE 02 / 05 | THE FIRST FIVE SECONDS, MOBILE NAVIGATION & THE WALL

**Execution brief for GPT-6.1 Sol · Specific mobile-screen experience, not code**  
**Priority:** P0 · **Prerequisite:** approved Phase 01 design system · **Default artboard:** 390 × 844 CSS px  
**Next file:** `PHASE_03_Writing_Echoes_Identity_Trust.md`

> **Mission:** Design and implement the part of BajiHears a visitor actually experiences before they decide to trust it: first visit, orientation, scrolling and discovering relatable thoughts. It must feel beautifully finished in one hand, on an ordinary phone. Convert the existing Wall into the social heart of the product, not an anonymous-feed demo surrounded by decoration.

---


## COPY-PASTE AGENT PROMPT: PHASE 02 ONLY

> Read and execute the attached PHASE_02_First_Visit_Wall_Navigation.md completely. Use the implementation, tokens, typography and design decisions from Phase 01. Implement PHASE 02 ONLY in the current BajiHears repository: redesign the first ten seconds, explain what BajiHears does without a wall of onboarding copy, create premium mobile navigation, clear Write entry, beautiful featured/standard thought hierarchy, understandable Relate/Echo actions, sorting, filters, and trustworthy empty/loading/error states. The first viewport at 390px must communicate the purpose and reveal actual community content. Do not replace backend posts with dummy content. Test new/returning user scenarios at 320, 360, and 390px and provide actual screenshots and a first-time-user walkthrough. Preserve all existing functionality. DO NOT push or deploy. Stop after Phase 02; wait for my instruction.


### Mandatory scope and safety rules for this phase

- Read the entire attached file, the current source files, and relevant output from earlier phases; **implement only this phase's scope**. Treat the Markdown as the product and design specification, not as a list of literal code snippets.
- Work in the current repository and on a local branch if useful. **DO NOT GIT PUSH, DO NOT DEPLOY, DO NOT MODIFY LIVE PRODUCTION SETTINGS, DO NOT RESET DATA, and DO NOT DELETE OR REPLACE FUNCTIONING FEATURES.** Commit locally only if the repository workflow allows it; never publish.
- **Mobile source of truth: 390px width**, verify also 320px and 360px. Use real browser renders rather than generated screenshots or static Figma-like mockups.
- Preserve auth, real backend writes, content persistence, profile identity, Wall/Read/Duel/Ember functionality, saved posts, reports, and existing permission constraints. No invented activity counts, fake endorsements, or misleading anonymity guarantees.
- Don't require the user to write intimate or sensitive content to unlock recognition. Don't confuse warmth with fake intimacy. The brand supports curiosity and humor as well as quiet reflection.
- Produce evidence: actual route/component changes, 360px and 390px screenshots, working interactions, errors checked, accessibility and mobile keyboard observations, and any remaining risks.
- **Stop after this phase and report results. Do not start the next phase unless I explicitly ask.**

---

## 1. The first impression is a product interaction, not a pitch deck

The first viewport must answer three questions before any tutorial: **What is this? Can I look around? What can I do?**

### Five-second promise

A new visitor should immediately perceive:

1. A recognizable BajiHears mark/wordmark, not a long logo animation.
2. A warm phrase that acknowledges the situation without claiming to know them.
3. A real, readable piece of community content or an honest empty state.
4. A clear low-pressure action to explore and a path to write.
5. Familiar, understandable navigation.

**No required sign-in. No compulsory questionnaire. No forced mascot dialogue. No consent-masking popups.** If login is truly required for a particular backend operation, delay the request until the user takes that action and explain why.

### Recommended initial fold (new visitor at 390 × 844)

Treat dimensions as composition guides, **not hard-coded positions**:

| Area | Approximate design intent | Content and visual notes |
|---|---|---|
| Top safe area + compact header | device top + 50–58px | Small Baji mark/wordmark left; understated profile/corner access right. Do not show all rewards and every action at once. |
| Welcome editorial moment | ~96–140px | Light background, one memorable headline and a short reassuring sentence. |
| Single explanatory line | ~28–45px | "Read for a while, or leave a thought of your own." Optional tiny progress-free indicator about how the Wall works. |
| Featured human thought | ~185–250px | One real verified post, legible instantly; not fake engagement theater. |
| Subtle browse/filter controls | ~44–60px as revealed | Compact, clearly labeled chips; avoid two rows of confusing control pills at the top. |
| Bottom navigation | ~64–76px + safe area | Persistent labeled destinations; enough clearance for scrolling content and writing action. |

**Do not cram all six features into the first fold.** Show the emotional core and let discovery follow. The first post may be partially visible depending on device height; its first meaningful sentence should never be hidden under the navigation.

### Suggested welcome copy combinations (choose ONE, test in context)

**Variant A, warm/editorial (recommended):**

> For the thoughts you keep to yourself.  
> Read what others are thinking. Share when you feel like it.

**Variant B, short/casual:**

> Some thoughts just need somewhere to go.  
> This little corner is for them.

**Variant C, softer:**

> You can just be here for a while.  
> Read a little. Relate a little. Say something if you want.

Under the welcome, use **"Explore the Wall"** if the first hero is separate from the feed; otherwise avoid a button that redundantly navigates to where the user already is. A gentle **"Write a thought"** secondary action may appear below the hero. Do not write "We know what's on your mind" or imply the site reads feelings.

---

## 2. How the first visit flows, frame by frame

### Scene 01: arrival (0–2 seconds)

- The page appears on warm-paper canvas with a real header and legible interface, not a 3-second splash or animated loading logo.
- Logo draws minimal attention; headline and the first real post draw the eye.
- Entrance motion is subtle: a one-time upward settle of the editorial intro. It must not block interaction or restart on back navigation.
- A text line communicates reading is allowed without posting.

### Scene 02: first scroll (2–8 seconds)

- User scrolls into a continuous feed rather than jumping through a giant marketing section.
- Intro compresses naturally; the Wall remains the same route and scroll position is preserved.
- A compact category row appears at a predictable point, not a sticky row that eats half the viewport.
- The first confession has enough vertical breathing room that it can be read without accidental reactions.

### Scene 03: first intent

The user can take any path:

- **Read:** simply scroll. Do not nag for account creation.
- **Relate:** tap reaction and receive clear feedback; request sign-in only if actually required.
- **Reply:** open the Echo thread, retaining context.
- **Write:** tap clear composer entry; check whether a draft exists; do not demand a lengthy onboarding step.
- **Explore Read/Duel:** switch via bottom nav, with clear expectation and no surprise paywall-style popup.

### Scene 04: returning visit

- Collapse the first-time introductory hero or replace it with a one-line brand welcome depending on user preference and available state. Do not store sensitive inference for this.
- Restore feed route, filter and scroll position where sensible.
- No recurring full-screen welcome popup.
- If there is a legitimate new product change, use a small dismissible inline notice, not a repeated modal.

---

## 3. Mobile navigation: familiar enough to feel effortless

### Recommended persistent bottom navigation

Use **four clearly labeled destinations**, with an icon and a readable label on every destination:

1. **Wall** | primary community feed.
2. **Read** | Baji Read reflective editorial experience.
3. **Duel** | daily pick-one experience.
4. **Corner** | the user's posts, saved items, identity and settings.

Use an accessible active indicator, controlled coral accent and subtle background pill. Labels must remain recognizable at 360px. Primary tabs are **destinations**, not buttons that unexpectedly open modal dialogs. If product architecture strongly favors the recording's three tabs plus a profile avatar, test both, but prioritize four labeled destinations if it removes ambiguity.

### Writing action: separate from destinations

**"Write" / pencil-plus** is an action, not a top-level destination. Present it as a consistently positioned, elegant elevated compose button on the Wall only, or a persistent action above the tab bar when user testing shows benefit. Do not create a giant central plus that makes other destinations unreachable. Never overlap post actions or last lines of content.

When the keyboard opens in composer, hide or adapt navigation intentionally; it must not cover the focused field or button. When navigating back from a thread, restore the correct selected tab and scroll position.

### Top bar details

- Left: brand symbol + **BajiHears** short wordmark, usable size.
- Right: compact account/avatar shortcut or a clearly labeled contextual control; do not put an oversized Ember badge, avatar, live counter and help icon together by default.
- Use a sticky header only if it is actually useful. Header should reduce visual weight while scrolling, not perform constant hide/show gymnastics.
- Treat safe areas, display cutouts, browser dynamic toolbars, and top scroll bounce as real test cases.

### Deep navigation

- A post detail route may temporarily hide bottom bar or keep it if compatible; don't switch strategies unpredictably.
- Back button must have an obvious target of at least 44px and return to the previous context.
- If user returns from Read/Duel to Wall, their feed state should be preserved.
- No gesture should be the sole means of reaching or exiting a screen.

---

## 4. Redesign the Wall's information architecture

**Priority order:** authentic confession → readable context → easy relation → optional discussion → browsing modes → gamification.

### Proposed Wall content sequence

**New visitor:** small welcome → one real featured or relatable post → category/sort controls → regular post stream → optional inline 'how it works' trust explanation → subsequent posts.

**Returning visitor:** compact header → controls → post stream; show featured post only when useful, not necessarily pinned forever.

**Sparse or new community:** don't fabricate a busy feed. Use a curated, **clearly identified sample/demo** only in a separated preview area if there is no real content, or show a welcoming genuine empty state. Seed content from founders is acceptable only with honest identity and permission. Fake "4.8k loves" is not.

### Wall top copy

**Primary header:** "The Wall"  
**Small subhead:** "A few words from people you'll probably never meet, but might understand."  
**Alternative:** "Different lives. Familiar thoughts."

Choose one. This should appear as editorial supporting copy, not repeated in every card.

### Sorting and filtering

- Primary modes: **New** and **Trending** (renamed from Latest/Spicy if clear enough). Do not claim an algorithm tracks "trending" unless it does; use **Recent** and **Most reacted** where strictly accurate.
- Categories as horizontally scrollable chips: **All**, **Spill the Tea**, **Silent Thoughts**, **Plot Twist**, **Hard Truth**, and any real categories from the backend.
- Place a subtle partial chip at the right edge to suggest horizontal scrolling, and provide accessible alternatives for keyboard users.
- Avoid mixing categories, post creation, feeds, rewards and filtering inside one cramped control group.
- On selection, keep users in place, update selection visually and show clear content-loading feedback. No entire-screen flashing or scroll reset by default.

### No-content state

**Title:** "A little quiet here."  
**Body:** "No thoughts in this corner yet. Want to look around somewhere else?"  
**Primary action:** "See all thoughts"  
**Optional secondary:** "Write something" (only if appropriate).

Never imply silence is a failure and never auto-generate random people to fill the feed.

---

## 5. The signature thought card: make words feel worth reading

This card is the central product component. It needs a distinct visual identity capable of supporting one sentence or longer confessions.

### Regular thought card: anatomy in order

1. **Identity line:** small neutral avatar or Baji listening mark; clear display "Anonymous" or verified chosen handle; human-readable posting time if supported.
2. **Category label:** compact, calm, optional. Never louder than the thought.
3. **Main text:** highest hierarchy; 18–21px readable sans for regular thoughts; comfortable 1.4–1.6 line height.
4. **Interaction row:** clearly labeled "Relate"/reaction count, "Echo"/reply count, save and share actions as appropriate.
5. **Optional overflow:** report, copy link and any owner actions, with accessible target.

### Card geometry

- Width: full available page content width minus 16–20px side padding.
- Padding: around 18–22px, slightly reduced at 360 width if necessary.
- Radius: 20–24px, light warm border, or ultra-subtle shadow; not both heavily.
- Regular background: `#FFFFFF` on `#FAF7F3` paper.
- Use a quiet divider only where it helps a specific long card.
- No huge empty space under one-sentence thoughts; let cards size naturally.
- Thought words cannot be clipped by fixed heights; show **Read more** for long posts only if the expanding/collapsing behavior is accessible, predictable and preserves meaning.

### Featured thought variant

A featured card is a special editorial treatment, **not** a glowing orange frame. Use one of these carefully evaluated approaches:

- An off-white **editorial note** with a tiny warm corner label and Fraunces sentence.
- A restrained blush or cream tinted card, with small "From the Wall" / "Community pick" eyebrow.
- A narrow terracotta rule and a slightly elevated typographic scale.

Only one signature featured style should ship. The champion can be credited through a muted separate metadata row. Explain why it is featured if a truthful curation system exists. Do not use manipulative countdowns or turn posts into contests around sensitive content.

### Sample card, purely for layout tests

**Anonymous · 2h ago**  
**Silent Thoughts**  
"I was going to text first, then remembered I always do."  
**Relate · Echo · Save**

This sentence is a **design placeholder**, not a real community post. It must never appear in production as a genuine member submission without explicit labeling.

### Emotional variety

Test card rendering for:

- A 12-word funny confession.
- A 140-word vulnerable thought.
- A neutral everyday observation.
- A longer paragraph with line breaks.
- Mixed Roman Urdu/English.
- Emojis used by the author.
- A reported or removed post.
- A post with zero reactions and zero replies.

The card styling should work for all moods, not only melodramatic one-liners.

---

## 6. How reactions should feel

The current UI shows heart-style reactions and Echo counts. Make the distinction intuitive.

### Reaction label strategy

Use a clear verb:
- **"Relate"** (a gentler, brand-fitting action than "Like").
- If current backend has a fixed like action, preserve it and consider labeling it **Like** until the semantic change is safely supported.
- After tapping, show active icon, updated count if real, and screen-reader confirmation.

### Motion

Tap should register **immediately** with a small downscale (~0.97) and soft release; not a firework. If backend fails, restore state and show a small actionable error. Avoid rendering a false increase as final before backend confirmation without error recovery.

### Counts

- Zero does not mean the post is unworthy. Prefer compact **"Relate"** without an emphasized 0 count if sensible.
- Use exact backend values for visible counts. No inflated marketing figures.
- "People reading right now" should disappear unless supported by real presence tracking with clear definitions.
- Avoid leaderboards that pressure vulnerable users to post more revealing content.

---

## 7. Trust is part of the visible feed

The Wall should not pretend anonymous communities have no risks.

### Lightweight "How this place works" education

Make an accessible inline explainer once near the start of new-user feed, and permanently reachable from menu/help:

**Heading:** "A few things worth knowing"  
**Line 1:** "Posts on the Wall are visible to other members or visitors according to the site's actual access rules."  
**Line 2:** "You choose whether to display a handle when you post, where that option exists."  
**Line 3:** "If something crosses a line, you can report it." (only when the control works)

Actual microcopy must be shortened into a readable mobile presentation and tied to real backend/privacy implementation. Do not claim encryption, deletion guarantees or total anonymity without evidence.

### Reporting

- An overflow menu should include **Report post**.
- Tapping it opens a calm, clear sheet explaining what happens next and offering appropriately scoped reasons.
- Require an actual submission confirmation or explain if reporting is unavailable; no fake success.
- Allow dismiss/back without losing the post.
- Prevent exposing the reporter's identity to the reported author if the system promises confidentiality, and verify backend.

### Content presentation

Avoid graphic previews and misleading shock treatments. Where moderation or content warnings are necessary, use a gentle user-controlled reveal. Do not turn personal distress into an engagement category.

---

## 8. Scrolling and visual rhythm like a premium consumer app

### Rhythm guidelines

- First fold: brand moment + meaningful content.
- Feed: visually stable, largely white cards on warm canvas.
- Every few posts, if relevant, a different **functional** element can appear: category prompt, short product help, or a community guideline note. Never an unrelated fake chat bubble.
- Differentiate visual treatment by content role, not randomness; consistent regular posts, rare feature cards, thoughtful empty states.
- Use controlled variable spacing, for example 12px between standard cards and 20–28px before a section transition.
- Prefer no decorative background images behind the feed; content has enough character.

### Avoid Reel-style behavioral traps

Do **not** force full-screen swipe snapping, auto-advancing thoughts, autoplay sound, or a "one more post" cinematic transition. Borrow **Instagram-level interaction fluency**, not compulsory engagement mechanics. Keep natural vertical scroll and permit natural stopping points.

### Loading

- Initial load: show skeletons that roughly match actual card height and typography, with no aggressive shimmer.
- Paginated load: append content without scroll jumps, preserve place.
- Network error: show "Couldn't load the Wall just now" + **Try again**; retain any already fetched content.
- Offline: explain the state honestly; don't simulate successful reactions or publishing.
- No posts: genuine empty state, not blank page or animated fake activity.

---

## 9. Microcopy by mobile state

| User moment | Approved starting copy | Tone goal |
|---|---|---|
| First visit | "You can read for a while." | Permission, not urgency |
| First wall introduction | "Small thoughts. Familiar feelings." | Recognition without emotional assumption |
| First post prompt | "Anything on your mind?" | Invite without pressure |
| Post preview context | "A thought from the Wall" | Be clear, not sensational |
| Loading | "Getting the Wall ready…" | Brief, not theatrical |
| No category results | "Nothing in this corner yet." | Nonjudgmental |
| Failed load | "Couldn't bring in new thoughts. Try again?" | Honest, useful |
| Saved successful | "Saved to your Corner." | Clear result |
| Reply CTA | "Add an Echo" with introduction "a reply" | Playful and understandable |
| Report submission | "Thanks. Your report was sent for review." | Only when backend confirms |
| Returning reader | "Good to see you around." | Familiar without claiming to know them |

Don't automatically use all of these. Each line must appear only in its relevant state. Never tell someone "you're not alone" as a generic spam notification; let the community content create that recognition.

---

## 10. Four detailed mobile journeys GPT-6.1 Sol must verify

### Journey A: Curious first-time reader

1. Open BajiHears on a 390px phone.
2. Understand the proposition in under five seconds.
3. Scroll through two real thought cards.
4. Understand anonymous labels and categories.
5. Try a category without losing orientation.
6. Choose to leave without signing in; no guilt overlay.

**Pass:** navigation, typography and purpose are immediately clear; writing is optional.

### Journey B: Curious person who wants to react

1. Open Wall.
2. Read one confession.
3. Tap Relate.
4. See immediate feedback and accurate state; if auth required, see just-in-time explanation.
5. Return to same post without losing place.

**Pass:** one clear intention produces one clear result.

### Journey C: Returning community member

1. Return via a saved link.
2. See compact navigation rather than giant first-visit pitch.
3. Browse Recently shared or the same filter.
4. Enter post thread and navigate back.

**Pass:** context and scrolling don't reset unnecessarily.

### Journey D: Minimal 360px Android browser

1. Load with browser toolbar visible.
2. Use all nav tabs without overlapping controls.
3. Open category carousel and reaction menu.
4. Increase browser text size.
5. Rotate and return.

**Pass:** no clipped labels, invisible CTAs, fixed-width popups or endless horizontal overflow.

---

## 11. Desktop is a derivative, not the product

After mobile is approved:

- At tablet widths, use generous reading measure and a contextual secondary rail only where helpful.
- At desktop, don't stretch post paragraphs across 1000px; expand composition via a genuine editorial welcome rail, adjacent controls and related content.
- Remove the enormous empty desktop wallpaper effect visible in the recording.
- Keep mobile core components and language intact rather than creating a separate visual brand for desktop.

---

## 12. Deliverables & gate criteria

### Produce

1. Three distinct mobile-first **first-fold compositions**, each with real copy and honest content treatment. Select the most understandable one with rationale.
2. Approved and implemented **header + four-destination labeled bottom navigation + writing action**.
3. Wall screen specifications and working UI for normal, loading, empty, error and longer-post states.
4. A cohesive regular card and featured card with accurate data dependencies.
5. Working mobile sorting/category filtering integrated with existing logic.
6. Reaction, save and share state handling in the actual UI.
7. Screenshots or visual review at 360, 390 and 430px, including short and long text.
8. A visible before/after comparison showing readability and one-thumb flow improvement.

### Reject the phase if any of these occur

- [ ] A user must close a giant popup before seeing content.
- [ ] Most of the viewport is decorative gradient or fake content.
- [ ] Cards are tiny, dense or unreadable on a phone.
- [ ] The writing button hides a card action or is mistaken for navigation.
- [ ] Public/anonymous status is unclear.
- [ ] Feed shows fabricated counts or fake "live" population.
- [ ] Loading or failure looks like a blank screen.
- [ ] Switching tabs wipes the user's context unnecessarily.
- [ ] Final output looks like a narrow desktop screenshot scaled down to phone width.

**Phase 02 is complete only when a visitor would happily read three posts without needing instructions.**

---

## PHASE HANDOFF CONTRACT (required output from agent)

At the end of this phase, report exactly: **(1)** user-facing problems solved; **(2)** repository files/routes edited; **(3)** genuine 360px and 390px screenshots; **(4)** interactions, accessibility and network behavior actually tested, with pass/fail results; **(5)** anything incomplete or blocked; **(6)** confirmation that no Git push or deployment occurred. **STOP HERE. Await explicit approval before beginning the next Markdown phase.**

### Special first-visit no-confusion gate

At 390px width, make the product meaning legible in the first visible screen: “read other people's thoughts, react/leave a public Echo, or write one of your own.” It should not require opening About, reading feature jargon, completing onboarding, understanding Ember, or scrolling through a full-screen featured item before seeing the Wall. Use actual persisted posts only.
