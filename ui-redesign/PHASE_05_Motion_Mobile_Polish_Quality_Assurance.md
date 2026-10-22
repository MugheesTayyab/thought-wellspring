# PHASE 05 / 05 | SIGNATURE MOTION, MOBILE POLISH, INTEGRATION, TESTING & RELEASE GATE

**Execution brief for GPT-6.1 Sol · Final execution and quality direction, no exact implementation code**  
**Priority:** P0 for release quality · **Prerequisites:** Phases 01, 02, 03 and 04 read and applied in order  
**Mission:** Ship one complete premium mobile community experience without breaking its actual behavior or turning its comforting identity into animation-heavy noise.

> **You are completing an existing application, not producing a Dribbble shot.** The finish line is a believable, trustworthy, surprisingly polished phone website that users can browse, read, write in and return to. A screenshot alone is not proof. Demonstrate it in motion on real mobile viewport sizes, including network failures, content extremes and the keyboard.

---


## COPY-PASTE AGENT PROMPT: PHASE 05 ONLY

> Read the attached PHASE_05_Motion_Mobile_Polish_Quality_Assurance.md thoroughly, plus the implementation delivered in Phases 01–04. Execute PHASE 05 ONLY: unify micro-interactions into a restrained, identifiable BajiHears motion system; fix sheets, page transitions, tap feedback, typography/rendering, visible card boundaries and safe areas; reduce motion when requested; and perform rigorous real mobile UX, accessibility, responsiveness, performance and backend regression testing. Make concrete fixes, not just recommendations. Validate 320, 360, 390, 430, 768 and desktop widths, Android keyboard behavior and iOS Safari if available. Show before/after captures, pass/fail matrix, remaining risks and final readiness assessment. Preserve real user data and functional behaviors. DO NOT push or deploy; leave the changes local and stop with the final report.


### Mandatory scope and safety rules for this phase

- Read the entire attached file, the current source files, and relevant output from earlier phases; **implement only this phase's scope**. Treat the Markdown as the product and design specification, not as a list of literal code snippets.
- Work in the current repository and on a local branch if useful. **DO NOT GIT PUSH, DO NOT DEPLOY, DO NOT MODIFY LIVE PRODUCTION SETTINGS, DO NOT RESET DATA, and DO NOT DELETE OR REPLACE FUNCTIONING FEATURES.** Commit locally only if the repository workflow allows it; never publish.
- **Mobile source of truth: 390px width**, verify also 320px and 360px. Use real browser renders rather than generated screenshots or static Figma-like mockups.
- Preserve auth, real backend writes, content persistence, profile identity, Wall/Read/Duel/Ember functionality, saved posts, reports, and existing permission constraints. No invented activity counts, fake endorsements, or misleading anonymity guarantees.
- Don't require the user to write intimate or sensitive content to unlock recognition. Don't confuse warmth with fake intimacy. The brand supports curiosity and humor as well as quiet reflection.
- Produce evidence: actual route/component changes, 360px and 390px screenshots, working interactions, errors checked, accessibility and mobile keyboard observations, and any remaining risks.
- **Stop after this phase and report results. Do not start the next phase unless I explicitly ask.**

---

## 1. Final creative north star

The experience should be **visually recognizable in three seconds, understandable in five seconds, comfortable for ten minutes, and reliable on a slow phone**.

**Identity:** light warm editorial × digital stationery × subtly playful social polish.  
**Default tone:** ivory, warm-paper, soft rose/lilac, confident ink, strategic coral.  
**Motion:** purposeful and tactile, never loud or constant.  
**Relationship:** Baji is a host with good boundaries, not a bot pretending to be a best friend.  
**Content:** actual community thoughts, actual results, actual controls, actual states.  
**Hierarchy:** read → relate → optionally express → explore; rewards stay tertiary.

### Central go/no-go question

**Would the interface still look excellent if there were no animations, no fake user counts, no full-screen effects, and only one real post?** If not, revisit the art direction. Good typography, layout and truthful content must carry the experience even with JavaScript animations disabled.

### What 'premium Gen Z' means here

- Familiar mobile usability and clear tap feedback.
- Art-directed typography and selective surprise.
- Warm color, easy reading and highly legible touch UI.
- Lightweight delightful micro-motion.
- Honest, emotionally respectful language.
- Contemporary details without borrowed Instagram logos, a faux Reels feed or generic gradient widgets.

It does **not** mean infinite engagement, looping animations, exaggerated slang, colorful chaos or making every feature look like a different template.

---

## 2. Motion is a design system with meaning

Define a small set of motion primitives and use them consistently. Motion should reinforce four metaphors:

1. **Place a note** (new content arrives into the Wall).
2. **Open a note** (card detail and Echo thread).
3. **Choose gently** (filter/mood/Duel selection).
4. **Make room** (composer sheet, keyboard and secondary panel).

### Motion hierarchy

| Motion level | Typical places | Purpose | Intensity |
|---|---|---|---|
| L0 / none | body copy, sensitive content, long reading | Stable, calming experience | none |
| L1 / response | tap, selection, reaction | Confirm user action | tiny scale/color change |
| L2 / transition | sheet, tab content, cards expanding | Explain relationship between views | short positional motion |
| L3 / signature | first welcome, Duel reveal, Read cover | Create a distinctive brand memory | rare, intentional |

A page should almost never have two simultaneous L3 moments. One animation can be memorable; five animations become background static.

### Recommended starting durations (not rigid code rules)

- Press feedback: 90–160ms.
- Chip / segmented selector: 160–230ms.
- Card hover (pointer devices only): 180–240ms.
- Sheet enter/exit: 220–360ms.
- Tab content transition: 180–280ms; preserve content context.
- Duel result reveal: 260–420ms.
- Read cover editorial reveal: 400–600ms, once and skippable.
- Confirmation / toast: appear quickly, stay long enough to read, dismiss unobtrusively.

Use physical, settled easing. Avoid bounce that displaces long reading text or overshoots hit areas. Never animate large blurry background layers or huge box-shadows continuously.

---

## 3. Detailed signature interaction choreography

These are the moments that should feel handcrafted. Create mini storyboards, build them once and reuse patterns.

### 3.1 Launch / welcome

**Trigger:** first relevant visit.

- Header and warm canvas are visible immediately; no forced cinematic delay.
- Main headline settles gently by a few pixels and fades to full opacity.
- First post is ready to read without waiting for animation.
- If the Baji mascot appears in welcome, it may offer one small contextual visual acknowledgement, then remain still.
- Reduce or entirely remove motion on repeat visits.

**Feeling:** invitation, not a product advertisement.

**Reject:** a lengthy animated splash screen, loading particles or mascot spinning before user can read.

### 3.2 Bottom navigation

**Trigger:** tapping a primary tab.

- Hit area darkens/softly compresses within 100–140ms.
- Active-indicator pill slides or crossfades into its new position without moving other destinations.
- Destination content transitions softly, not with a full-screen fake phone-slide animation on every tap.
- Current scroll state preserved when returning.
- If a tab can't load, show a helpful error without silently reverting the selected icon.

**Feeling:** smooth and confident.

### 3.3 Category chip selection

**Trigger:** tap All / Spill the Tea / Silent Thoughts / Plot Twist / Hard Truth.

- Selection change reads immediately through shape, ink and color.
- A subtle 1–2px settle is acceptable; avoid bouncy pills.
- Existing cards transition or skeletonize only as needed; don't blank the entire screen.
- If no posts exist, a gentle empty state occupies content region without layout jumping.

**Feeling:** easy discovery, never disorientation.

### 3.4 Relate / reaction

**Trigger:** tap relevant control on a thought.

- Immediate tiny scale-and-return and selected state.
- Accessible textual status exists independent of motion.
- Count updates only according to legitimate application state.
- Error rolls state back and offers retry.

**Feeling:** a small acknowledgement.  
**Reject:** confetti, hearts flooding the screen or loud sound.

### 3.5 Open Echo thread

**Trigger:** tap Echo.

- Keep clicked thought visually anchored in transition where feasible.
- Show full thought with context at the top of the thread.
- Settle a tall sheet or detail route without body-scroll conflict.
- Original feed position retained when closing.
- Keyboard never traps controls.

**Feeling:** gently unfolding the conversation.

### 3.6 Open and focus composer

**Trigger:** tap Write or write prompt.

- Main composer moves into focus via dedicated screen / tall responsive sheet.
- Soft surrounding transition increases concentration; no heavy blur that slows low-end devices.
- Cursor appears once focused; do not auto-focus on initial page load.
- Keyboard-safe controls settle into place rather than jumping or hiding.
- Identity preview immediately updates when selection changes.

**Feeling:** a blank piece of paper, not a configuration form.

### 3.7 Publish a thought

**Trigger:** legitimate successful submit.

- Button acknowledges processing.
- Successful state is distinguished from pending and from rejected.
- Post appears via a small place-into-feed motion or clearly linked result state.
- Copy says "Your thought is on the Wall" only if truly published; "Sent for review" if pending.
- If Ember is earned, show a tiny nonblocking reward toast after the main completion.

**Feeling:** relief and clarity.  
**Reject:** theatrical reveals around vulnerable content.

### 3.8 Baji Read opening

**Trigger:** open an available Read.

- Cover or archetype symbol has one slightly longer editorial entrance.
- Title and summary follow in natural reading sequence.
- Sections appear with small opacity/position reveals, no parallax that interferes with reading.
- Bar charts show only validated values with static labels, not mysterious animated percentages.
- User can scroll immediately; animations never gate content.

**Feeling:** opening a beautifully printed mini-zine.

### 3.9 Duel selection / result

**Trigger:** select one of two thought cards.

- Selected card gains stronger border/tint, unselected card stays fully legible.
- Submission status shown distinctly when needed.
- Real result reveals with a restrained mask/growth transition if data exists.
- If results aren't available, display "Your choice is in" with no fake graph.
- Reward remains a secondary flourish.

**Feeling:** playful recognition, not a casino or versus-battle animation.

### 3.10 Your Corner / avatar

**Trigger:** enter Corner or change avatar.

- Activity tabs switch instantly and preserve state where possible.
- Avatar selector presents a calm gallery and clear selected treatment.
- Saving updates profile only when acknowledged; no misleading "saved" during failure.
- Empty-state mascot can be a static illustration with one small expressive gesture in rare cases.

**Feeling:** the user owns this space.

---

## 4. Popups and sheets: turn interruptions into understandable layers

One of the new mobile recording's strongest anti-patterns is **weak separation between light surfaces** combined with crowded sheets. Define a **single layered-surface grammar** with stronger edges and calm transitions:

### Use an inline expansion for

- A short "How it works" explanation.
- A minor clarification in a feed card.
- Small visual reward feedback.
- A single optional note not requiring user focus.

### Use a bottom sheet for

- Reporting reasons.
- Share options or save options if needed.
- Selecting a writing mood if horizontal chips aren't enough.
- A short Ember balance overview.
- Action selection for a post.

### Use a full-screen route for

- Long-form writing with keyboard on small phones.
- Your Corner and settings.
- The main Baji Read.
- Duel and its results if there is meaningful reading/interaction.
- Long Echo conversations and post-detail deep links.

### All layered controls must

- Have explicit dismissal or exit.
- Manage focus properly and restore it after closing.
- Remain within screen safe areas.
- Avoid placing destructive controls close to main actions.
- Support reduced motion and device back navigation.
- Avoid nested scroll traps.
- Not repeatedly reopen automatically after user dismisses them.

### Popup behavior contract

Never show an unlock popup immediately upon every visit to Read/Duel if it can be represented as a clearly designed state within that destination. A blocked feature is still a screen; explain the state there. Stop sending people on "Go to Wall → come back → open same modal" loops unless the eligibility mechanism requires it and the user clearly understands progress.

---

## 5. Sound, haptics and social-app polish

For the **website**, don't assume native haptics exist or can be triggered cross-platform. The interface must feel good through visuals and responsiveness alone.

- **No autoplay audio** on normal navigation, posting, Read or Duel.
- Haptics are optional future enhancement only where supported, user-consented and nonessential.
- Do not add click sounds or chimes that might embarrass someone using the site around others.
- Keep feedback short, discreet and predictable.
- Animations must respond at the speed of the user, never make the person wait for a flourish.

This matters especially for an introvert-friendly product: emotional comfort is partly about **control of attention**.

---

## 6. Engineering integration: redesign without breaking the real application

### Phase-05 working method

**Step A | Audit and freeze a baseline**

- Inspect current app routes, components, design tokens, assets, auth, database, data fetching, cached data, theme and deploy environment.
- Make a route matrix: Wall, posting, post details, Read, Duel, Ember, Corner, auth, settings and error states.
- Capture original behavior of all critical flows and note expected outputs.
- Work in a safe branch/isolated revision and avoid migrating data for design reasons.
- Check which counters and content are real; do not silently substitute mock arrays.

**Step B | Implement shared foundation**

- Establish Phase-01 tokens, fonts, card language, buttons, chips, navigation, sheets, layout and states.
- Update shared components before hand-styling feature screens.
- Treat 390px layout as master; extend outward only after it behaves correctly.
- Validate accessibility and contrast before attaching high-level motion.

**Step C | Implement the core loop**

- First visit → Wall → read/reaction → Write → anonymous/handle preview → submit → return to Wall.
- Verify actual data operations, identity labels and error paths.
- Keep account and posting behavior intact.

**Step D | Implement secondary experiences**

- Baji Read → Duel → Ember → Corner, with data backed by existing implementation.
- Remove unsupported personality language and fake data.
- Integrate routes, back behavior, saved items and profiles.

**Step E | Motion and detail pass**

- Only after interactions work, add motion primitives and signature scenes.
- Tune on an ordinary phone, not only a powerful desktop simulator.
- Fix keyboard, scroll restore, clipped content, jitter and accessibility regressions.

**Step F | Release gate and regression**

- Compare to baseline functionality.
- Run viewport and interaction tests.
- Show screenshots/video of actual pages, not design-tool mockups.
- Produce a compact unresolved-issues list instead of claiming everything is perfect.

### Do not prescribe code changes from this brief

Select implementation details that fit the existing framework and technical constraints. If current stack is React/Next.js, motion libraries and accessible primitive systems may help, but **do not replace stack, backend, auth or schema solely to match an aesthetic trend**. No specific JS, CSS, package list or API implementation is required in the answer to this document; the agent should determine that after repo inspection.

---

## 7. Responsive targets and testing reality

**Current evidence comes from a vertical mobile recording (approximately 480 × 1068 pixels, 1:52).** Use it as a baseline, but still verify CSS layout and responsive behavior at actual browser widths of 320–430 CSS px. The older desktop capture is historical context.

| Viewport | What to test | Expected result |
|---|---|---|
| 320 × 568 | emergency smallest viewport | Main actions reachable; no broken fixed width or impossible dialog |
| 360 × 740 | small Android target | 4 tabs readable, no horizontal overflow, composer keyboard safe |
| 375 × 812 | small iPhone representative | safe-area correctness, clear bottom action |
| 390 × 844 | **reference master** | full premium visual hierarchy and legible first post |
| 430 × 932 | larger phone | intentional spacing, not awkward stretched inputs |
| 768 × 1024 | tablet | natural breathing space, no giant card width |
| 1024+ | desktop derivative | meaningful editorial layout, max reading width, no empty-wallpaper effect |

### Mobile device/system variations

- iOS Safari browser chrome, viewport resize, tab bar and on-screen keyboard.
- Android Chrome and low-height viewport when address bar/keyboard occupy space.
- Increased text scale (up to 200% where relevant), zoom, landscape.
- Slow 4G and at least one throttled low-bandwidth/CPU test.
- Dark system appearance while light brand theme remains coherent (respect form-control legibility).
- Reduced-motion setting, no-hover coarse-pointer devices.
- VoiceOver/TalkBack or equivalent assistive checks if available.
- Keyboard navigation on desktop and switch/assistive target spacing on mobile.

No device should require dragging horizontally to read core thoughts or reaching behind browser chrome to publish.

---

## 8. Accessibility and measurable performance objectives

### Accessibility reference

Aim for **WCAG 2.2 AA**, with particularly careful attention to:

- 4.5:1 contrast for ordinary text; 3:1 for large text where applicable.
- Minimum target-size requirements; design around 44–48px controls wherever practical.
- Visible focus states and logical tab order.
- Screen-reader names for icon buttons, chips and modal closes.
- No drag-only or swipe-only essential controls.
- Correct semantic labeling of choices, textareas, errors and toasts.
- Accessible modal focus trapping/restoration.
- No important information conveyed only by accent color.
- Reduced-motion alternatives and no mandatory animation-dependent interaction.

### Core Web Vitals targets

Use current official guidance and real data when available. Initial goals at the 75th percentile:

- **LCP:** ≤ 2.5 seconds.
- **INP:** ≤ 200 milliseconds.
- **CLS:** ≤ 0.1.

These are performance targets, not numbers to display as achieved without measuring them. Check current metric definitions before reporting. Use field data where available and lab tests for regression and diagnosis.

### Performance design choices

- Load key brand fonts responsibly; provide matching fallbacks.
- Minimize huge decorative assets; use lightweight SVG/illustration as appropriate.
- No heavy autoplay hero video, no animated noise filter covering the page.
- Lazy-load noncritical feature illustrations and optional detailed sections.
- Do not animate large blur/backdrop-filter layers on every frame.
- Avoid expensive list-wide entrance effects when scrolling through many posts.
- Size cards/content placeholders to reduce layout shift.
- Keep tap feedback immediate even when network requests are pending.
- Offer a usable experience even when animations are disabled or delayed.

---

## 9. Quality check for every screen: no more "AI slop"

Use the following rubric **before approval**. Each screen should score at least **4 / 5** in every dimension; if not, repair it before moving on. Avoid averaging poor accessibility away with beautiful decoration.

| Dimension | What "5" looks like | What "1" looks like |
|---|---|---|
| Distinctiveness | Recognizably BajiHears even without logo | Generic gradient template or borrowed app clone |
| Hierarchy | User instantly sees the main information/action | Everything in identical pills and cards |
| Typography | Legible, expressive where appropriate, calm for reading | Tiny labels, random fonts and dramatic text everywhere |
| Color | Warm coherent light system with precise accent | Dark/orange neon or random pastels with weak contrast |
| Mobile ergonomics | One-thumb operation, keyboard-safe, clear nav | Controls obstructed, tiny or far from reach |
| Interaction | Fast, graceful and reliable | Animations hide unclear or broken logic |
| Authenticity | Real content and honest counts | Fake engagement, misleading "live" claims |
| Trust | Public/identity status explained accurately | "100% safe" slogans without evidence |
| Copy | Sounds human, warm and specific | Fake personal knowledge, over-the-top sympathy, forced slang |
| Accessibility | Keyboard, labels, contrast, reduced motion work | Design only works for one sighted mouse user |
| Performance | Smooth on average phone | Choppy blur, big assets and stuck loading |
| Consistency | Wall, Read, Duel, Ember, Corner share tokens | Different visual brand on each screen |

### Deliberate art-direction review

After implementation, capture a side-by-side set of **at least eight mobile screens**: new arrival, regular Wall, featured thought, composer keyboard open, attribution preview, Echo thread, Read, Duel, Ember, Corner (more than eight is fine). Display them together at the same scale and ask:

1. Does any screen look like it belongs to another app?
2. Are there too many cards, borders, shadows or gradients?
3. Is one screen inexplicably darker than the others?
4. Are coral buttons used only where action is truly primary?
5. Is the brand recognizable without enormous logos?
6. Does every screen have one unmistakable focal point?
7. Is text comfortable to read at actual phone size?
8. Are real human thoughts the stars of the experience?

If not, simplify. Premium polish often appears **after** removing three unnecessary visual elements.

---

## 10. Copy and trust consistency regression

Run this audit on every route and component:

### Forbidden or suspect language

- "We know you better than anyone."
- "You're completely anonymous" without explicit technical qualification.
- "Nobody will ever know" without support.
- "100% safe" as a slogan.
- "92% personality match" without valid explanation.
- "People secretly think…" as a factual inference.
- "X users online right now" without actual verified presence logic.
- "Don't miss out" repeated across peaceful product actions.
- "Break your streak and lose everything."
- Emotional urgency around sharing private experiences.

### Preferred product language

- "Share when you're ready."
- "You can just read for a while."
- "Here's what others will see."
- "Post as Anonymous" / "Post with handle" where appropriate.
- "You can report something that doesn't belong here."
- "Your thought is on the Wall" only after confirmed publication.
- "Couldn't save that change. Try again?"
- "Your choice is in" only after accepted Duel vote.
- "A playful reflection, not a personality diagnosis."
- "Come back whenever."

### Tone calibration: natural personal care, not impersonated intimacy

The site can **understand the user's situation** (e.g., posting can feel vulnerable) without claiming to **know the person**. Avoid unsolicited direct-message style copy from "Baji" that implies a personal relationship or an emotional assessment. Personalization may reflect explicit choices and visible history, but do not infer a sensitive condition or say "we noticed you're lonely". Never substitute an emotionally flattering line for a real error explanation.

---

## 11. Functional regression table

**Required:** test existing behavior in the changed UI. Resolve each row as passed, failed/fixed, genuinely absent or requiring product decision; do not mark untouched as tested.

| Journey / dependency | Must verify |
|---|---|
| Wall content | Posts load from real backend, sort/filter work and counts are correct |
| Featured post | Featured status is honest, layout works for long/short content |
| Guest visitor | Can browse as allowed; no unexpected sign-in screen |
| Anonymous composer | Preview and final public identity are accurate |
| Handle composer | Final CTA matches chosen identity; correct visible handle |
| Draft preservation | Back/close, refresh and error behavior as actually supported |
| Post submission | Pending, success, moderation and failure correctly represented |
| Reactions | Correct backend state, counts and rollback |
| Echoes | Load, send, fail, report and deep-link/back contexts |
| Saved thoughts | Correctly appears in Your Corner; signed-out behavior explained |
| Share | Copy/native share and public URL actually work |
| Baji Read | Unlock logic, content, truthful claims, saved/share view |
| Duel | Current challenge, vote state, real results, revisit behavior |
| Ember | Correct balance, limits, rewards and feedback |
| Your Corner | Activity tabs, avatar, identity, settings, empties |
| Authentication | Guest → Google path, error recovery, actual data persistence |
| Account/privacy | Data visibility, deletion/settings and privacy policy accuracy |
| Moderation | Functional report outcomes; no fake submission success |
| Navigation | Four destinations, scroll preservation, back behavior |
| Offline/poor network | No silent data loss or pretend success |
| Accessibility | Focus, labels, contrast, target size and reduced motion |

### Special case observed in recording

Around **01:00**, the screen briefly displays an unreachable site/domain or loading-related interruption before returning to BajiHears. This might have been network/DNS/auth/environment related. Investigate with actual logs or reproducible behavior; do not state a permanent failure without evidence. A premium interface should have a useful connection error state, but visuals are not a replacement for fixing reliability.

---

## 12. Release strategy: ship in five controlled gates

These five Markdown documents represent **five consecutive design-and-build phases**, not five competing redesign directions.

1. **Phase 01 | Brand foundation:** settle palette, type, voice, trust contract, tokens and baseline inventory.
2. **Phase 02 | Mobile front door/Wall:** ship first visit, nav, cards, categories, actual feed and loading/empty states.
3. **Phase 03 | Expression loop:** ship composer, identity preview, publishing, Echoes, privacy and reports.
4. **Phase 04 | Signature features:** ship Baji Read, Duel, Ember and Your Corner as one product.
5. **Phase 05 | Motion, polish and release:** choreograph restrained animation, verify integration, measure performance, test accessibility, audit copy and ship after gate review.

**Stop and review after each phase.** Do not run ahead and then report five phases "done" based on one large unchecked visual overhaul. Maintain the design decision log across phases; later changes to tokens/voice require deliberate approval, not silent drift.

### Each phase's response from GPT-6.1 Sol must include

- **What changed:** screens/components/routes affected.
- **Why it changed:** user need and design rationale, not vague "modernized UI".
- **What was preserved:** working existing features and data/auth logic.
- **What was tested:** exact viewport/device types, interaction paths and test results.
- **What remains uncertain:** backend claims, edge cases or blockers.
- **Visual proof:** mobile screenshots and where appropriate a short genuine browser recording.
- **One recommended next phase**, referencing the relevant Markdown filename.

Do not claim a pass without evidence. Do not invent screenshots, tests, repository inspection or verified data.

---

## 13. The final user-acceptance scenario

Ask a person who has never seen BajiHears to try it on a **real phone**, preferably without a guided explanation. Observe, don't coach:

**0–5 seconds:** Can they tell the website is for thoughts and shared feelings, and do they find the first post?

**5–30 seconds:** Can they read, switch a category and relate to something without wondering which controls are interactive?

**30–90 seconds:** Can they understand how to write a post, and tell whether their identity will be shown? Can they exit without losing unexpected data?

**90–180 seconds:** Can they open Duel or Read, understand what the feature actually promises, and return to Wall?

**Afterward:** Ask:

- "What do you think this website is for?"
- "Did anything make you feel uncertain about what other people could see?"
- "Which parts felt friendly, and which felt fake or overly dramatic?"
- "Did anything seem broken, confusing, slow or too busy?"
- "Would you want to read another post? What would make you comfortable coming back?"

Do not seek praise; look for hesitations, false assumptions and moments when the user felt asked to do too much. A compelling brand survives being understood without a sales pitch.

### Practical launch metrics (only measure with consent and appropriate privacy safeguards)

- First-paint and Core Web Vitals on mobile.
- First-time visitors who understand purpose in usability sessions.
- Percentage who can identify public-vs-handle visibility correctly during testing.
- Composer initiation-to-completion friction, interpreted carefully (not pressuring disclosure).
- Post submission errors and duplicate rates.
- Navigation confusion and failed exits/back events.
- Report/control discoverability in testing.
- Voluntary return readership, without using intrusive tracking.

Don't treat number of personal disclosures or confession intensity as success measures. Healthy participation includes simply reading and leaving.

---

## 14. Final deliverables GPT-6.1 Sol must hand back

1. **The implemented responsive BajiHears redesign** grounded in current repository and all four preceding briefs.
2. **A concise design-system record**: final tokens, fonts, spacing, components, motion, iconography, accessibility rules.
3. **A mobile UI review set**: required screens and key states at reference 390px plus 360/430 verification.
4. **A short before/after walkthrough** comparing the recording to the working implementation, including the corrected identity toggle and restrained Ember behavior.
5. **Cross-screen functional test evidence**, with failures and untested cases named honestly.
6. **Accessibility and performance report**, clearly separating measured results from future targets.
7. **A final microcopy inventory** showing that users are treated with warmth, agency and accurately stated privacy.
8. **A short release readiness report** listing pass/blocker status and any rollback-sensitive changes.

### Absolute release blockers

- [ ] Anonymous vs visible-handle behavior is misleading.
- [ ] User text can disappear silently or publish more than once through an obvious UI fault.
- [ ] UI fakes backend success, reaction numbers, vote percentages or online activity.
- [ ] Long thought text or submit action is obstructed by keyboard/nav on mobile.
- [ ] Critical controls cannot be reached at 360px or with basic assistive technology.
- [ ] Baji Read makes unsupported psychological certainty claims.
- [ ] Repeated modal loops interrupt the core Wall experience.
- [ ] Existing authentication, posts, reactions, Echoes or rewards are broken by redesign.
- [ ] On a phone the product is hard to read, overwhelming, or visually inconsistent.

---

## 15. Official reference links (principles, not templates)

- [Apple: Human Interface Guidelines / Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | dynamic safe areas and comfortable composition.
- [Apple: Human Interface Guidelines / Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | predictable mobile navigation.
- [Material Design 3 / Navigation bar](https://m3.material.io/components/navigation-bar/overview) | 3–5 consistent primary destinations, labels and active states.
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/) | interaction accessibility and contrast criteria.
- [web.dev: Core Web Vitals](https://web.dev/articles/vitals) | field performance and stability.
- [web.dev: Interaction to Next Paint](https://web.dev/articles/inp) | interaction responsiveness.

Consult current guidance where applicable; use actual device behavior and app requirements to decide.

---

## FINAL INSTRUCTION TO GPT-6.1 SOL

**Read and follow the five files in numerical order.** This is one coherent redesign specification, not optional inspiration. Do not begin with a flashy landing page, dark template, glowing widgets, generic cards, fake metrics or random animation experiments. Implement the smallest coherent vertical slice, show it on a phone-width viewport, verify it works, then advance. Build the brand people trust by pairing distinctive design with accurate language and reliable behavior. Preserve existing functionality. Ask a focused question only when a real product or privacy decision cannot be determined from repository evidence.

**The aspiration is simple: a young person opens BajiHears, recognizes something human in the first few seconds, feels comfortable staying, and understands exactly what their next tap will do.**

---

## PHASE HANDOFF CONTRACT (required output from agent)

At the end of this phase, report exactly: **(1)** user-facing problems solved; **(2)** repository files/routes edited; **(3)** genuine 360px and 390px screenshots; **(4)** interactions, accessibility and network behavior actually tested, with pass/fail results; **(5)** anything incomplete or blocked; **(6)** confirmation that no Git push or deployment occurred. **STOP HERE. Await explicit approval before beginning the next Markdown phase.**
