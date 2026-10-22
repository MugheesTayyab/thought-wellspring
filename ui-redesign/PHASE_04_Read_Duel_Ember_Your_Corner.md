# PHASE 04 / 05 | BAJI READ, THE DUEL, EMBER & YOUR CORNER

**Execution brief for GPT-6.1 Sol · Signature feature experiences, mobile-first, not implementation code**  
**Priority:** P1 after the Wall and composer are reliable · **Prerequisites:** Phases 01–03  
**Next file:** `PHASE_05_Motion_Mobile_Polish_Quality_Assurance.md`

> **Mission:** Give BajiHears recognizable, screenshot-worthy secondary experiences while protecting the product's main reason to exist: being able to express and encounter thoughts without pressure. **Baji Read** should feel like a personal editorial mini-zine; **Duel** should feel like a beautiful social choice; **Ember** should be a small, optional joy; **Your Corner** should feel like an organized home rather than a collection of dense dialogs.

---


## COPY-PASTE AGENT PROMPT: PHASE 04 ONLY

> Read the attached PHASE_04_Read_Duel_Ember_Your_Corner.md from beginning to end. Using the established brand system, implement PHASE 04 ONLY in BajiHears. Make Baji Read an easily scanned editorial experience with transparent non-scientific explanations; make Duel a thumb-friendly, two-choice interaction with meaningful loading, retry and honest results; make Ember an unobtrusive participation layer using only real values; and make Your Corner a calm, organized personal space with working identity/settings, saved activity, and clear guest/account behavior. Keep primary Wall navigation and writing flows intact. Test empty states, loading failures, saved items, and 320/360/390px layouts; show actual screenshots and changed components. DO NOT push, deploy, reset data or fabricate user data. Stop after Phase 04.


### Mandatory scope and safety rules for this phase

- Read the entire attached file, the current source files, and relevant output from earlier phases; **implement only this phase's scope**. Treat the Markdown as the product and design specification, not as a list of literal code snippets.
- Work in the current repository and on a local branch if useful. **DO NOT GIT PUSH, DO NOT DEPLOY, DO NOT MODIFY LIVE PRODUCTION SETTINGS, DO NOT RESET DATA, and DO NOT DELETE OR REPLACE FUNCTIONING FEATURES.** Commit locally only if the repository workflow allows it; never publish.
- **Mobile source of truth: 390px width**, verify also 320px and 360px. Use real browser renders rather than generated screenshots or static Figma-like mockups.
- Preserve auth, real backend writes, content persistence, profile identity, Wall/Read/Duel/Ember functionality, saved posts, reports, and existing permission constraints. No invented activity counts, fake endorsements, or misleading anonymity guarantees.
- Don't require the user to write intimate or sensitive content to unlock recognition. Don't confuse warmth with fake intimacy. The brand supports curiosity and humor as well as quiet reflection.
- Produce evidence: actual route/component changes, 360px and 390px screenshots, working interactions, errors checked, accessibility and mobile keyboard observations, and any remaining risks.
- **Stop after this phase and report results. Do not start the next phase unless I explicitly ask.**

---

## 1. The emotional architecture of the four features

The **current 22 October mobile recording** shows an already light interface, but Baji Read is text-heavy, Duel remains stuck on a loading message during the recorded visit, and Your Corner and Ember feel too dense and administrative. Each needs an intentional, branded mobile hierarchy without changing core behavior.

| Feature | Core emotional purpose | Ideal mobile presentation | Never become |
|---|---|---|---|
| **Baji Read** | Lighthearted self-reflection and curiosity | Beautiful full-screen, scrollable editorial feature | Fake diagnosis, scientific personality test, or claim to read others' secret thoughts |
| **The Duel** | Playful recognition through a choice | Thumb-friendly pick-one interaction with honest outcome | Sensational or coercive engagement trap |
| **Ember** | Acknowledgment of ordinary participation | Small rewards summary + optional full-page detail | Streak anxiety, daily posting pressure, or a paywall-like hierarchy |
| **Your Corner** | Control, continuity and organization | Calm personal screen, settings and archive | Confusing hybrid of public profile and hidden account state |

### Navigation relationship

From Phase 02, top-level bottom tabs are **Wall / Read / Duel / Corner** with **Write** a separate action. Ember is reached through a clearly labeled chip in Corner or a small contextual indicator, not a fifth competing feed tab. Adjust only after testing actual navigation complexity; maintain one consistent solution across screens.

### Universal feature constraints

- Every screen loads meaningfully with zero participation history.
- Show actual data or clearly described demos only; never invent percentages, votes or streaks.
- All marketing metaphors ("vibe", "read", "ember") must have plain-language explanations in context.
- Participation in one feature must not make another feature unusable without an honest, reasonable product rationale.
- Close/back always works; user never gets trapped in a modal cycle.
- Large touch targets and readable copy are mandatory at 360px.

---

## 2. BAJI READ: a personalized-feeling mini editorial without false intimacy

### Why it has potential

In the **new mobile recording (about 01:14–01:22)**, Baji Read reveals an archetype titled **“The Clear-Eyed Friend”** and long paragraphs inside a continuous panel. This is the newest observed behavior. Older archetypes such as The Quiet Observer may still exist in the code; retain their content and personalization logic where valid. Redesign the newest screen as a generous, scannable light editorial experience with a clear “why this appeared” explanation.

### Product positioning

**Title:** Baji Read  
**Short description:** "A playful little reflection, inspired by what you've explored here."  
**Optional editorial line:** "Not a label. Just a different way to look at your vibe."

This wording does not imply BajiHears has clinically accurate insight into a user. If personalization is based on public activity, explain **which activity** and how much; if it is a random playful archetype, label it as such. Do not pretend to infer the real feelings of people the user knows.

### First arrival on Read tab

Mobile hierarchy:

1. Short, recognizable header with "Baji Read" and a delicate editorial glyph.
2. Two-line explanation that puts users in control.
3. An art-directed hero preview: an illustrated letter/note or a gentle character symbol.
4. Primary action **"See a little read"** or **"Explore Read"**, depending on availability.
5. Transparent eligibility/unlock explanation if the existing product has a genuine requirement.
6. Optional one-sentence explanation of what the reading is and isn't.

### Example entrance copy

**Heading:** "A little read, just for fun."  
**Body:** "A playful take on the patterns you leave behind when you explore the Wall."  
**Soft disclaimer:** "For reflection, not a personality diagnosis."  
**Action:** "See my Read" (only if available).

Alternative softer heading: **"See your Baji vibe."** Test for understanding; "vibe" should not replace clearer detail.

### Unlock design

The current recording says "Read 5 more confessions to unlock" and provides an instant unlock action. If that logic is active and must remain:

- Show progress with ordinary words, e.g., **"2 of 5 thoughts explored"** if accurate.
- Say what action actually counts; do not mislead users into reading content solely to satisfy an obscure gate.
- Avoid a modal popping up repeatedly each time the tab is opened.
- Present alternative when supported, and do not pretend "instant unlock" is a purchase or reward if it is not.
- Explain that reading content without posting is valuable; don't add pressure to publish vulnerable text to unlock.
- Consider removing participation gating in future product iteration if analytics/research show it obscures the product; **do not change the current backend requirement silently**.

### The Read result: a five-act editorial scroll

Use a smooth, vertically scrolling **single-column mobile feature** rather than dozens of tiny cards.

**Act 1 | Reveal (top fold):**
- Small eyebrow: "YOUR BAJI READ".
- Distinct illustration/symbol in a cozy muted color field.
- Archetype title: **"The Quiet Observer"** only if this is the actual result.
- A short one-line description e.g. **"Not every thought needs to be spoken to matter."**
- If result is genuinely personalized, show **"Inspired by your activity"** with explanation; otherwise call it "a playful reading".

**Act 2 | Familiar patterns:**
- A paragraph broken into 2–3 breathable sections instead of a wall of text.
- Specific readable subheadings, such as **"What tends to catch your eye"**.
- No authoritative claims like "Everyone secretly admires your mysterious presence".

**Act 3 | Your little contrasts:**
- Two or three small responsive paired statements, such as "You notice details" / "You take time before jumping in", with careful language **"You might relate to…"** rather than "You are…".
- If user behavior doesn't justify this, frame as prompts for self-reflection, not results.

**Act 4 | Optional patterns, backed by data:**
- Only use bar charts or numerical summaries for precisely defined actual measures, such as category-view distribution, with clear label and explanation. Do not call proportions of visited categories "emotional depth" or "personality confidence".
- If no valid data exists, omit charts and offer simple reflection prompts instead.

**Act 5 | Close and share:**
- A graceful concluding line: **"Take what fits. Leave what doesn't."**
- **"Save this Read"** and **"Share this card"** (if genuinely supported); remove identity-sensitive data from share card by default.
- **"Back to the Wall"**.

### Visual system for Read

- Warm canvas with a lilac editorial accent and clean white page sections.
- Use Fraunces for archetype name; DM Sans for labels and paragraphs.
- One genuine art-directed icon/illustration per archetype, with cohesive stroke/material across types.
- Each section separated through whitespace and small eyebrow labels, not a border around every paragraph.
- Rare subtle transitions as sections enter viewport; preserve scroll and never block content.
- Do not default to a dark, high-contrast black neon page just because Read is "mysterious".

### Copy and claim correction

**Avoid:** "What do people secretly think of your personality?"  
**Use:** "What might your Wall habits say about your vibe?" (only when derived from behavior)  
**Better if unpersonalized:** "Meet a little character you might relate to."

**Avoid:** "92% Personality Match" without defensible calculation.  
**Use:** no score, or a plainly descriptive verified signal that the user understands. The result should never imply clinical truth or access to others' private thoughts.

---

## 3. THE DUEL: an instantly recognizable, genuinely fun mobile choice

### What exists

In the **new mobile recording (about 01:24–01:30)**, the Duel destination shows **“Loading the current Duel...”** without revealing a choice during the captured interval. This is a more immediate UX problem than the older desktop view of two dark statement cards. First ensure an understandable loading, fallback and retry flow; then present the existing two-choice Duel in thumb-friendly stacked cards whenever real backend data is available.

### Signature concept

**"Two thoughts. One feels more you."**

Duel must be playful without emotional stereotyping. Questions may be reflective, funny or everyday relatable; do not make users choose between distressing disclosure options to earn points. The experience should be enjoyable even if the user skips a day.

### Mobile layout, top to bottom

1. **Duel header** with back or tab context and subtle accent.
2. Small indicator **"TODAY'S DUEL"** (only if it really rotates daily).
3. One engaging headline: **"Which one is more you?"**
4. Subheading: "Pick the thought that feels closer today."
5. **Option A** as a large comfortable selectable card.
6. Small **"or"** divider, visually delicate.
7. **Option B** as equally sized large selectable card.
8. Clear bottom instructions/one active submit if required by backend.
9. Result area follows selection without a jarring full-page reload.

### Card structure

- Category eyebrow, optional small decorative mark, 18–20px readable statement.
- 16–20px internal padding, border radius 20–24px.
- Minimum tap area significantly above 48px; whole card may be the selected control.
- Selected state: stronger warm outline and cream/butter fill; not a generic violent color flash.
- Avoid length disparities making one option visually preferable. Match layout weight and allow long text to wrap.
- No side-by-side on narrow mobile unless copy can actually remain readable; stacked is the primary format.

### Example creative layout test

**TODAY'S DUEL**  
**Which one sounds more like you?**

A: "I write a reply, read it twice, then decide to send it tomorrow."  
**or**  
B: "I reply instantly, then spend ten minutes wondering if it sounded weird."

Example only, never fake a real daily Duel or community votes in production. Use actual configured options once integrated.

### Vote behavior

1. Tap card → immediate pressed/selected feedback.
2. State updates reliably via backend or optimistic process with rollback.
3. Show a modest transition into result.
4. If the system has legitimate comparison data, reveal percentages/counts with source explained and accessible labels.
5. If community vote data is absent or too sparse, say **"Your choice is in"** and omit fake consensus charts.
6. If actual reward is granted, show a tiny Ember toast, not a huge gamification modal.
7. User can review result and return; no repeated modal begging for more activity.

### After-vote wording

**Selected:** "That one's yours today."  
**Count confirmed:** "Your pick is in."  
**Community comparison:** "Here's how people chose." (only with real votes)
**No data:** "Still early. There aren't enough picks to show a meaningful split yet."  
**Return:** "Back to the Wall".

### Freshness and fairness

- Display the date only if daily questions are real.
- A user cannot cast unlimited unearned votes if backend disallows it.
- Ensure same challenge identity across refreshes and devices as applicable.
- Protect the result's credibility: no invented activity, “everyone thinks like you,” or popularity labels for small samples.
- Shareable graphic may show user's chosen statement, not their username or private details unless expressly chosen.

### Visual personality

Duel can use the **butter accent** as its identity color plus neutral paper. One **curious little split mark** or editorial "VS" divider gives it personality. Don't turn it into a full-size arcade game or dark, glowing battle arena. This is a relatable choice, not a fight.

---

## 4. EMBER: a quiet extra, not the reason to use BajiHears

### What the recording shows

Around **00:45–00:48** and **02:06–02:09**, an Ember sheet displays points balance, streak, rank, milestones, earning activities, gift/perk tabs and limits. Useful functionality, but too many tiny blocks, accent bars and rules arrive at once.

### Reposition Ember

**Label:** Ember  
**Explanation on first contact:** "Little points for taking part."  
**Brand metaphor:** a warm glow of contribution, not a competitive score for sharing painful content.

Ember is secondary. A user who reads without participating should still experience the complete core community appropriate to access rules.

### Compact Ember indicator

- Place in Your Corner summary or top-right occasionally where justified.
- A small icon and verified balance, for example "7 Ember" if that's actual current data.
- Do not dominate header with fiery glow or attention badge.
- Tapping goes to a calm, full-height mobile sheet or page with room for readable text.

### Ember detail information hierarchy

**Section 1 | Summary:**
- Ember balance.
- Current rank if real.
- One supporting line: **"A little thank-you for joining in."**

**Section 2 | How it works:**
- Three clear reward actions with real quantities, e.g. Post a thought, Leave an Echo, Relate to a thought, if these are actually rewarded.
- Plain explanation of limits; avoid dense legalistic microtype.

**Section 3 | Perks:**
- Only perks that truly exist and are available.
- Locked perks state exact requirement and what the perk actually does.
- No artificial rarity or countdowns.

**Section 4 | Streak information, if retained:**
- Explain streak as optional and harmless.
- Avoid copy that frames missing a day as personal failure.
- If a streak expires, use **"Your streak can start again whenever you like."**

### Ember copy bank

- "Little points for joining in."
- "You're welcome here, with or without a streak."
- "This is just an extra. The Wall's still yours to explore."
- "Your Ember balance"
- "Ways to earn Ember"
- "One small thank-you, added."
- "Today's limit reached. Come back whenever." (only if limit is real)
- "You're all caught up on this reward."

**Avoid:** "Don't break your streak!", "Only real members earn", "Unlock your true personality by sharing more secrets", "Post something personal to level up".

### Ember testing

- Points appear consistently across tabs, confirmation and Corner.
- Failed backend update doesn't permanently show extra balance.
- Actual reward limits are represented correctly, not arbitrary timers.
- A point-reward event does not cover the newly posted thought or force an extra click.
- Users with zero points don't feel penalized or excluded from the basic product.

---

## 5. YOUR CORNER: personal, organized, quietly welcoming

### Existing structure

The **new mobile recording (about 01:32–01:46)** shows Your Corner with **0 thoughts, 0 responses, 1 saved, Ember 22** in the recorded state, plus segmented My thoughts/Saved/Settings, avatar and optional handle controls, and a dense Ember breakdown. These are observed values for one session, not figures to hardcode. Convert this into a coherent, calm **full mobile screen**, retaining current data/guest behavior.

### Top-of-page structure

**Header:** "Your Corner"  
**Secondary:** "Your posts, saved thoughts, and little settings."  
**Identity block:** chosen avatar + "Anonymous guest" or chosen display handle, and an **Edit** action.

If guest data is stored locally, make the device-only nature discoverable without alarming the user. If signed in, show accurate account status and account-specific controls. Don't imply data is backed up if it isn't.

### Information hierarchy

1. **Identity summary:** avatar, public handle state, signed-in/guest state, Edit.
2. **Your activity:** "My thoughts" / "My Whispers", "Replies"/"Echoes", "Saved". Make labels consistent with navigation and backend. "Liked Tea" should not be used for all liked posts if it confuses the category and action.
3. **Content list:** readable post cards or compact rows. Never blank blocks without explanation.
4. **Ember:** small summary linking to full reward detail.
5. **Settings:** identity, notifications, privacy, data, help and sign-out where applicable.

### Welcome state, brand fitting

**Header:** "Your Corner"  
**Subline:** "A spot for the things you choose to keep close."  
**Empty saved state:** "Nothing saved just yet. If a thought stays with you, save it for later."  
**Empty whispers:** "No thoughts from you yet. You can write when you're ready."  
**Empty replies:** "No Echoes from you yet. Reading's good too."  
**Call to action:** "Browse the Wall".

Do not make the empty state guilt-inducing: users are allowed to have zero posts forever.

### Identity editing: distinguish private settings and public presentation

The user should clearly understand:

- **Avatar**: decorative or displayed publicly? Say which.
- **Handle**: is it publicly shown only when user chooses handle-based posting, or globally attached to their public profile? Make the real answer explicit.
- **Email**: private contact/account field, never displayed on public posts.
- **Notifications**: default state and exact kinds of messages.
- **Login**: what guest history is synced/migrated and what is not.
- **Delete/clear**: what gets cleared, from where, and what may remain publicly visible.

### Avatar selection

A gentle visual gallery of cohesive mini-avatar illustrations; use the Baji brand style or coherent simple character set. Don't force a new avatar to publish anonymously. Allow change and preview without losing other setting values.

### Account linking

Suggested copy after verifying persistence:

**Heading:** "Keep your Corner across devices."  
**Body:** "Sign in to save the parts of your Corner we can sync."  
**Button:** "Continue with Google"  
**Secondary:** "Maybe later".

Do not say "Keep everything forever" or "secure your Corner" without validating actual data handling. If auth fails, show a recoverable state and retain the existing guest session.

### Email and notifications

- Optional email means optional in behavior, not merely appearance.
- Notification opt-in should clearly state what will be sent and where, with quiet defaults.
- Allow easy notification settings changes.
- Do not send marketing messages based on emotionally sensitive posts without explicit, appropriate consent.
- Avoid manipulative "Someone is thinking about you" notifications if not objectively true.

---

## 6. Cohesion: these experiences must belong to one brand

### Identical foundation

- All four features use warm-paper canvas + clean white surfaces + ink text.
- Coral remains action/selection accent; Read may use muted lilac, Duel butter, Ember mellow gold, Corner oat/ivory. These are **subordinate signatures**, not four separate apps.
- Shared screen titles, navigation, icon weight, radius, sheet behaviors, focus indicators and status messages.
- Same mascot illustration style. Baji appears sparingly in Read cover or Corner empty state, not in every reward confirmation.

### One piece of content, many places

Follow a single thought from Wall → Save → Corner → Reopen → Share. The card should feel recognizable in all contexts, with contextual density adjustments only. Follow a user from Duel → Ember reward → Corner: number and status must remain correct. These cross-feature journeys are more important than isolated splash screenshots.

---

## 7. Sample microcopy matrix

| Feature/state | Suggested interface text | Condition |
|---|---|---|
| Read intro | "A little read, just for fun." | All eligible users |
| Read definition | "A playful reflection. Not a personality test." | No validated psychometrics |
| Read insufficient data | "Not quite enough to make this personal yet." | Only if true |
| Read closing | "Keep what fits. Leave the rest." | Result ending |
| Duel entry | "Which one feels more you today?" | Daily, only if truly daily |
| Duel decision | "Pick the one that sounds closer." | Before vote |
| Duel result | "Your choice is in." | After confirmed choice |
| Duel sparse data | "Not enough picks to show a split yet." | Real sparse data |
| Ember header | "Little points for being part of things." | Reward overview |
| Ember return | "Take your time. There's no rush." | Optional interaction |
| Corner intro | "A place for your little saved things." | If archive exists |
| Empty Corner | "Still a little quiet here. That's okay." | Zero activity |
| Auth benefit | "Keep your Corner on more than one device." | Only if verified sync exists |
| Auth error | "Couldn't sign you in right now. Try again?" | Actual auth failure |
| Privacy settings | "What shows up when you post" | Identity controls |
| Sign out | "Sign out" | Real signed-in state |

Copy should be tested with actual readers for warmth **and clarity**. Don't ship all lines merely because they are provided; keep the best one per place.

---

## 8. Detailed mobile journey tests

### A. First-time Baji Read visitor

1. Tap Read from Wall.
2. Understand this is a fun reflection, not a claim of scientific insight.
3. View a real preview or transparent unlock state.
4. Unlock if eligible; no misleading gating.
5. Read a page with comfortable text and no required horizontal gestures.
6. Save/share only information permitted by the actual system.
7. Return with route state intact.

**Failure examples:** it claims to know what other people secretly think, displays unsupported "92% match", or uses illegibly small text in a popup.

### B. Daily Duel

1. Tap Duel.
2. Understand the question without a lengthy tutorial.
3. Tap either stacked statement easily with one thumb.
4. Observe a truthful outcome and legitimate Ember grant if configured.
5. Revisit; existing vote state appears consistently.
6. Access result with a screen reader.

**Failure examples:** phantom votes, forced sharing, ambiguous selected state, clipped statement at 360px.

### C. Ember clarity

1. Find the balance from Corner.
2. Learn how to earn and spend from one readable overview.
3. Compare UI balance with actual backend state after an event.
4. Understand that nonposting participation is allowed.
5. Close without covering or losing content.

**Failure examples:** repeated blocking dialogs, vague rewards, pressure to keep streak.

### D. Your Corner identity and history

1. See guest avatar and appropriate identity label.
2. Understand which details are public.
3. Choose an avatar and edit handle without accidentally publishing an email.
4. Check My Whispers/Saved/Replies, including empty state.
5. Sign in if desired; know what actually syncs.
6. Lose network during sign-in; return safely to existing state.

**Failure examples:** blank blocks, settings buried in reward card, silent guest-history loss.

---

## 9. Mobile visual acceptance: what a reviewer must see

- Baji Read reads like a little beautifully typeset magazine, not an analytics dashboard.
- Duel's two options are fully readable on a narrow device without awkward horizontal shrinking.
- Ember's first screen explains more with **fewer** items; its detailed rules remain accessible further in.
- Your Corner remains useful even when every activity count is zero.
- Each screen feels distinctly branded yet shares the exact same foundations.
- Colors are gentle and trendy without unreadable pale-on-pale text.
- No screen demands emotional disclosure or claims special knowledge of the visitor.
- Back navigation, connectivity problems and screen readers are handled respectfully.

---

## 10. Deliverables and phase gate

1. **Read:** entrance, honest unlock/insufficient data, full editorial result, share/saved view, error and loading states.
2. **Duel:** readable two-choice mobile layout, selected/confirmed/result/sparse-vote states, accurate reward interaction.
3. **Ember:** compact balance display and detailed full mobile page/sheet, all rules clarified and real counts verified.
4. **Your Corner:** personal identity, activity, saved thoughts, settings, avatar, guest and authenticated states, empty states.
5. **Copy audit:** remove pseudo-scientific and misleading claims; remove FOMO and streak punishment language.
6. **Working integrations:** verify existing Read data, Duel votes, rewards and profile save logic remain intact.
7. **Cross-feature tests:** Wall → Save → Corner, Duel → Ember, Anonymous post → My Whispers, Login → preserved guest context if supported.
8. **Mobile recordings:** capture representative flows at 360/390/430px, including keyboard and network-error scenarios where relevant.

### Do not advance unless

- [ ] No false personality percentage or unauthorized claim survives.
- [ ] Votes/rewards reflect actual data, not decorations.
- [ ] Every feature has a comprehensible zero-history experience.
- [ ] Read, Duel, Ember and Corner look like siblings, not unrelated templates.
- [ ] User can leave every feature or modal without friction.
- [ ] Rewards remain secondary to belonging and expression.

**The best reaction to Phase 04 should be "that's so BajiHears," not "that looks like four different AI templates."**

---

## PHASE HANDOFF CONTRACT (required output from agent)

At the end of this phase, report exactly: **(1)** user-facing problems solved; **(2)** repository files/routes edited; **(3)** genuine 360px and 390px screenshots; **(4)** interactions, accessibility and network behavior actually tested, with pass/fail results; **(5)** anything incomplete or blocked; **(6)** confirmation that no Git push or deployment occurred. **STOP HERE. Await explicit approval before beginning the next Markdown phase.**
