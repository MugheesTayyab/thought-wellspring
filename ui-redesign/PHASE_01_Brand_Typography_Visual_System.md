# PHASE 01 / 05 | BAJIHEARS: BRAND FOUNDATION, MOBILE-FIRST DESIGN SYSTEM & TRUST LANGUAGE

**Execution brief for GPT-6.1 Sol · Product design specification, not implementation code**  
**Priority:** P0 · **Source of truth:** mobile first · **Design target:** cozy, light, premium, expressive, trustworthy  
**Depends on:** an audit of the live code and the 22 October 2026 vertical mobile recording (approximately 1:52)  
**Next file:** `PHASE_02_First_Visit_Wall_Navigation.md`

> **Your assignment:** Treat BajiHears as a real consumer community with its own identity, not a landing-page template. Establish the visual, verbal and interaction foundations that all remaining screens must obey. Before changing any UI, inspect the existing routes, components, real features, content model and privacy behaviors. Make a written design-decision record and show mobile designs at **390 × 844 CSS px** as your default canvas. Do not write generic design advice and do not deliver a style mockup disconnected from the product.

---


## COPY-PASTE AGENT PROMPT: PHASE 01 ONLY

> You are GPT-6.1 Sol, acting as principal mobile product designer, creative director, UX writer and senior frontend engineer for BajiHears. Read the attached PHASE_01_Brand_Typography_Visual_System.md completely and examine the existing repository plus the 22 October mobile recording. Execute PHASE 01 ONLY: audit the current UI and functionality, set up the premium cozy light design system, replace inconsistent typography using the specified DM Sans + Fraunces direction (adjust based on actual rendering), strengthen borders and hierarchy, standardize reusable UI primitives, and establish honest, warm microcopy. Make changes in the real codebase, not only a report or image mockup. Validate the system at 320, 360 and 390px, show screenshots and tests, and list the changed files. Keep all real features working. DO NOT push, deploy, reset data or change production settings. Stop after Phase 01; await my explicit instruction for Phase 02.


### Mandatory scope and safety rules for this phase

- Read the entire attached file, the current source files, and relevant output from earlier phases; **implement only this phase's scope**. Treat the Markdown as the product and design specification, not as a list of literal code snippets.
- Work in the current repository and on a local branch if useful. **DO NOT GIT PUSH, DO NOT DEPLOY, DO NOT MODIFY LIVE PRODUCTION SETTINGS, DO NOT RESET DATA, and DO NOT DELETE OR REPLACE FUNCTIONING FEATURES.** Commit locally only if the repository workflow allows it; never publish.
- **Mobile source of truth: 390px width**, verify also 320px and 360px. Use real browser renders rather than generated screenshots or static Figma-like mockups.
- Preserve auth, real backend writes, content persistence, profile identity, Wall/Read/Duel/Ember functionality, saved posts, reports, and existing permission constraints. No invented activity counts, fake endorsements, or misleading anonymity guarantees.
- Don't require the user to write intimate or sensitive content to unlock recognition. Don't confuse warmth with fake intimacy. The brand supports curiosity and humor as well as quiet reflection.
- Produce evidence: actual route/component changes, 360px and 390px screenshots, working interactions, errors checked, accessibility and mobile keyboard observations, and any remaining risks.
- **Stop after this phase and report results. Do not start the next phase unless I explicitly ask.**

---

## 0. Product truth: what BajiHears is

**Name:** BajiHears. **Existing tagline:** *Say the unsaid.*  
**One-sentence promise:** A little corner of the internet to put a thought into words, discover what others are carrying, and feel a bit less alone in the everyday sense of relating to other people.  
**Primary audience:** phone-first, social-media-literate young adults and other quiet users who prefer lower-pressure participation. Do not assume all users are shy, lonely, anxious, female, or experiencing any particular emotion.  
**Category:** expression-first, anonymous/optional-handle community; **not** therapy, a private diary, a dating application, or an Instagram clone.

### Jobs the product must actually do

1. **Read without performing:** I can open the site and understand what people share without making an account or exposing information, to the extent existing access rules allow.
2. **Express without pressure:** I can write briefly, change my mind, save or discard a draft where supported, and understand who will see it.
3. **Recognize a connection:** I can find words I relate to and choose to react or respond without pressure.
4. **Explore for fun:** Read, Duel and Ember are pleasant secondary experiences, not distractions from human expression.
5. **Understand the rules:** I know what is public, what is attributed, what can be reported, and how BajiHears handles content.

### Emotional outcome, in order

**Understand → Relax → Read → Relate → Optionally participate → Choose to return.** Do not reverse this into *register → earn points → post → unlock*. Recognition comes from clear copy and familiar human moments, not from pretending the application personally knows the visitor.

### What makes it recognizable

BajiHears should own three symbols:
- **The little note:** the visual form of a thought made shareable.
- **The listening mark:** a subtle, brand-specific visual device, for example two small curved lines beside a speech mark. Develop one direction and use it consistently, not a dozen competing icons.
- **Baji:** the existing illustrated character, used as a patient host in welcome, gentle empty states and successful participation, never as a constantly animated salesperson.

The brand should feel *warm and socially current* without becoming childish. Design tension: soft canvas + sharp typographic precision + occasional playful surprise.

---

## 1. Evidence from the 22 October 2026 mobile recording

**Audit basis:** 1 minute, 52 seconds of vertical mobile browsing, approximately 480 × 1068 source pixels. These are visual observations; determine exact styles, API behavior, font names and live data in the repo/browser. This recording is the CURRENT implementation; a previous 20 October desktop recording is historical context, not today's UI.

| Video moment | Actually seen on mobile | Concrete design problem to fix |
|---|---|---|
| 00:00–00:18 | Browser chrome above a thin BajiHears header; a small “Good to see you around” banner with About; large Featured thought first; Wall headline and tiny explanatory text lower down. | Meaning of the site is tucked into a miniature pill. A featured card takes priority over orienting a new visitor. Establish the promise and primary action within the first screen. |
| 00:04–00:18 | Light cream background, white cards, faint edge strokes, tiny reaction labels and metadata, compressed icon rows, mismatched text scales. | Improve brand type, increase metadata legibility and make boundaries unambiguously visible, without turning every card into a heavy box. |
| 00:20–00:28 | Echoes open as a white bottom sheet with original thought, replies, and narrow response controls. | Clearer hierarchy and public-reply language; improve keyboard and safe-area behavior. |
| 00:34–00:36 | Wall filters and sorts, and empty-filter behavior appear below the featured item. | Make feature vs filtered-feed relationship obvious; no conflicting signals about available posts. |
| 00:38–01:12 | Writing opens a long full-height interface with text field, moods, anonymous/handle choices, categories, preview/help and publication. | Too much setup before writing. Prioritize the writing surface and progressively reveal options. |
| 01:14–01:22 | Baji Read presents an editorial archetype and extended text-heavy reading. | Separate into typographic sections and recognizable editorial rhythm. |
| 01:24–01:30 | Duel shows “Loading the current Duel...” without visible resolution. | Introduce skeleton, timeout/retry and honest unavailability messaging; do not fake a Duel. |
| 01:32–01:46 | Your Corner mixes activity counts, identity/avatar settings, saved items and Ember; reward details fill a dense panel. | Reduce dashboard density, make sections scannable and prioritize personal usefulness over metrics. |

**Design diagnosis:** It is not merely a color failure. The new light theme is directionally promising, but **weak edges, small type, busy microcontrols, uneven typography, crowded sheets and unclear first-visit story** make it feel assembled rather than art-directed. The redesign must fix interaction and copy hierarchy alongside visual style.

### Audit work before aesthetic changes

- Map existing routes, post lifecycle, guest mode, login, reaction and Echo storage, sharing, Read logic, Duel state, Ember calculation, profile state, moderation options and policies.
- Inventory current fonts, assets, mascot variants, logos, icon styles and components; keep ownership and asset licensing intact.
- Label every displayed count as **verified backend data / derived local data / placeholder / unknown**. Replace fabricated displays with honest states.
- Capture real mobile screenshots at 360, 390 and 430 widths, plus keyboard-open and modal-open states.
- Record what is working, visually broken, copy-confusing, and backend-dependent. Do not mask functional failure with decoration.

---

## 2. Non-negotiable design principles

1. **Mobile is not an adaptation.** Start at 390px, validate at 360px, then extend to tablet and desktop. Every screen's important action must be thumb-reachable.
2. **Light first, cozy always.** Default theme is warm ivory/paper, clear off-white cards, deep ink text, warm coral accent; dark mode may come later and is never the default baseline.
3. **Reading is the product.** Typography and content are the primary visual elements. People should read the first thought before noticing decorative effects.
4. **Quietly premium.** Expressiveness comes from typography, composition, texture, controlled color and motion. No neon, blinding gradients, heavy glassmorphism or floating 3D blobs.
5. **Every tap earns clarity.** Feedback must tell users what happened. Tooltips do not substitute for obvious labels.
6. **Trust is visible.** Public/anonymous status, moderation, real data and user control are legible at the point of action.
7. **No emotional manipulation.** Do not imply a stranger is personally known to the system or that sharing is required for acceptance. Reading without posting is a valid outcome.
8. **Brand voice is steady.** Copy sounds the same across feed, onboarding, sign-in, rewards, error messages and notifications.
9. **Accessibility is aesthetic discipline.** Adequate contrast, readable scale, visible focus and reduced motion are part of the visual system.
10. **One hierarchy:** expression first, interaction second, playful mechanics third.

---

## 3. The recommended creative territory: WARM PAPER SOCIAL

Design references are **principles**, not copies: Instagram's apparent simplicity, quality of transitions and straightforward mobile chrome; modern editorial typography; cozy digital stationery; expressive minimalist consumer brands. Do not copy Instagram's icons, colors, layout or reels behavior verbatim. **Reels-like polish is not a mandate for an endless addictive feed.**

### Moodboard in words

Warm daylight through a curtain. A note folded once, then opened. Cream paper, quiet blush, faded lilac, terracotta type, rounded edges that don't look inflated. The interaction is light and satisfying. The user thinks, *I could write here*. The visual is social, not clinical; elegant, not luxurious in a distant or exclusive way.

### Approved expressive devices

- Hand-torn **visual suggestion** through very subtle border/texture on special editorial cards, not literal messy scraps everywhere.
- Rounded note shapes and occasional offset inner labels.
- Delicate line illustration for the Baji mark and selected category emblems.
- One-inch visual surprises: a small sticker-like tag, corner fold, shimmerless underline reveal.
- Motion that resembles placing, unfolding or revealing a note.
- Editorial serif on **selected headlines and featured thoughts only**, sans serif for navigation, labels, explanatory text and longer body copy.

### Explicit design vetoes

- Massive hero gradient over the whole app.
- Dark brown/black walls with orange glow as default.
- Bright pink-only personality and cartoonish confetti.
- Irrelevant geometric 3D orbs, random stickers, mock chat bubbles with fake users.
- Three or more different border-radius languages.
- Shadows under everything.
- Constant scrolling marquee, pulsing CTA, glitter, persistent mascot bounce.
- Fake live counters, AI-written fake community posts presented as real, misleading testimonials.

---

## 4. Color system: intentional, light and cozy

**Suggested foundation palette.** The CURRENT app is already light; **refine it**, do not simply swap the background color again. Strengthen borders, typography, hierarchy and brand coherence.

| Design token | Hex | Role / restriction |
|---|---|---|
| `Canvas / warm paper` | `#FAF7F3` | Default overall background |
| `Surface / clean sheet` | `#FFFFFF` | Content cards, raised sheets, active composer |
| `Surface / soft oat` | `#F4EDE6` | Secondary panels, calm grouping, footer layers |
| `Ink / primary` | `#272027` | Headlines, body text, high contrast foreground |
| `Ink / secondary` | `#665A60` | Supporting text and meaningful metadata |
| `Ink / quiet` | `#776B72` | Only for nonessential small labels when contrast checks pass |
| `Coral / expressive` | `#D65A49` | Decorative accent, selected rings, larger marks |
| `Coral / accessible action` | `#AE4335` | Primary buttons with white text, important links |
| `Blush / thought` | `#FBE6E4` | Gentle category card treatment |
| `Lilac / reflective` | `#EEE8FA` | Baji Read editorial supporting theme |
| `Butter / playful` | `#FFF0C9` | Duel and carefully chosen warm highlights |
| `Sage / calm` | `#DCEBDD` | Saved state, gentle supportive moments |
| `Divider / warm line` | `#E8DFDC` | Separators for adjacent content |
| `Card border / visible` | `#DCCDCB` | Stronger warm edge around card surfaces; verify contrast against actual backgrounds |
| `Input border / active` | `#A94A40` | Clear editing/focus state; distinguish from error behavior |

**Readability check from sample palette:** primary ink on warm paper has ~14.9:1 contrast; secondary ink on warm paper ~6.2:1; white on action coral `#AE4335` ~5.8:1. White on bright expressive coral `#D65A49` is only ~3.9:1: **do not use that pairing for normal-sized button text.** Revalidate all real rendered pairings, state colors and opacity variants.

### Color allocation rules

- 72–80% neutrals (canvas, clean paper, oat surfaces).
- 10–18% text, strokes and muted neutrals.
- 5–8% brand accent.
- 1–3% category or emotional accents.
- Coral means *action or active relationship*, not *everything with importance*.
- Don't assign red to personal/confessional content as though it indicates danger.
- Do not encode moods only through color; add text/shape.

### Cards and background

Use a disciplined surface hierarchy: warm canvas, white reading cards with **visible warm edges**, occasional colored editorial features. White surfaces must have a clear outline against the cream canvas. Do not make twenty nested boxes or use shadows as the only separator. Use almost-invisible surface shadows on modals only. Optional very low-opacity paper grain as static asset, never animated, and never so pronounced that text appears dirty or blurry.

---

## 5. Typography, sizing, spacing and geometry

### Fonts

**Recommendation:** `DM Sans` for all functional UI and longer text + `Fraunces` for selected featured confessions and expressive brand/editorial headlines. Use restrained Fraunces optical weight and adequate line-height; test that the actual font does not look spindly or overly ornate on Android. Test language support; choose appropriate fallbacks for Urdu/Roman Urdu if included. Use no more than two Latin typeface families plus a supported script-specific fallback.

| Type role | Mobile starting target | Behavior |
|---|---|---|
| Brand headline | 34–42px / tight but breathable | Limited to entrance/editorial moments, 2–3 lines preferred |
| Screen title | 27–31px | Warm, clear, compact |
| Card main thought | 19–22px sans, or 22–26px editorial serif for feature | Comfortable line-length, never tiny |
| Body | 15–17px | Primary explanatory text and longer thoughts |
| Controls | 14–16px | Labels, filters, buttons |
| Metadata | 12–14px | Only when strong enough contrast and not essential to task |
| Button labels | 14–16px semibold | Straightforward verbs, no tiny all caps |

- Default layout unit: 4px; common mobile spacing 8/12/16/20/24/32px.
- Horizontal page padding: 16px at 360; 18–20px at 390–430; do not shrink essential cards to a tiny center strip.
- Large content radii: around 20–24px; small controls: 12–16px; pills only where semantically appropriate.
- Minimum **recommended** important tap target: 44 × 44 CSS px, preferably 48 × 48; WCAG 2.2 AA formally permits smaller targets in certain cases. Ensure action targets don't overlap.
- Don’t squeeze more than ~55–75 readable characters on a line for desktop text; on mobile let natural line wraps breathe.
- Respect system font scaling, long strings, localization, keyboard and accessibility zoom.

### Component coherence

Every component needs normal, hover (where applicable), focused, pressed, selected, disabled, loading, error and success variants. Name tokenized variants, but **do not prescribe exact source code in this brief**. Components must look related without all having identical containers.

---

## 6. Voice and copywriting: sounds like Baji, not a marketing chatbot

### Personality

Baji's tone: someone gently opening the door, not pulling a user inside. Warm, observant, emotionally literate, a little witty when the topic allows. Avoid therapy-speak, forced sentimentalism, constant dramatic sympathy, and aggressive Gen Z slang. Not every user arrives sad; many arrive playful, curious, bored or seeking community.

**What to say:** "You can read for a while."  
**What not to say:** "We know exactly what you're going through."  
**What to say:** "You decide how your name appears."  
**What not to say:** "You're 100% anonymous and safe here" without technical proof.  
**What to say:** "It's okay if you don't have the perfect words."  
**What not to say:** "Only we truly understand you."  
**What to say:** "You can come back whenever."  
**What not to say:** "Don't lose your streak or miss your community."

### Brand-level copy candidates

- **Primary tagline:** "Say the unsaid." (keep)
- **Hero:** "For the thoughts that never made it out loud."
- **Supporting:** "Read what others are thinking. Share something of your own, when you're ready."
- **Micro-manifesto:** "Some things are easier to put into words when no one expects you to be a certain version of yourself."
- **Short app description:** "A place to share a thought, find a familiar feeling, or just read for a bit."
- **Community norm:** "Real people. Real thoughts. A little more kindness."
- **Gentle invitation:** "Got something on your mind?"
- **Composer reassurance:** "It doesn't need to sound perfect."
- **Silent-reading reassurance:** "Just here to read? That's welcome too."
- **Come-back note:** "Whenever you feel like it, this corner is here."

**Choose one hero and supporting line as the shipping pair; do not pile them all onto the same screen.** Aim for understated affection rather than constant emotional declarations.

### Behavioral language rules

1. Use **"you"** to describe control, not to guess emotional state.
2. Use **"we"** for product commitments that can be proven (for example, moderation policy), not pseudo-friendship.
3. Use short headings (3–7 words) and clear supporting lines (typically 8–20 words).
4. Avoid jargon unless users already see it explained: **Echo** can be branded but must be introduced as a reply; **Ember** as a participation point.
5. Limit emojis to exceptional lighthearted contexts; typography should do most of the work.
6. Don't overuse "safe space". Show what users can control and what protections actually exist.
7. Never nudge a person to disclose private, traumatic or identifying information for rewards or recognition.
8. Write for neutral emotions first; use specific supportive copy only when the user has chosen a relevant flow, without diagnosing feelings.
9. Localize naturally; Roman Urdu/Urdu should be opt-in brand flavor if audience research supports it, not sprinkled randomly throughout every action.

### Word choices: preferred vocabulary

| Current or possible UI language | Recommended relationship |
|---|---|
| Whisper | Keep as community term, explain as "post" the first time |
| Echo | Keep, with first-use label "Reply / Echo" |
| The Wall | Keep; recognizable core destination |
| Your Corner | Keep; personal archive/profile |
| Baji Read | Keep; explain "a playful reflection" |
| Duel | Keep; explain "pick the one that feels more you" |
| Ember | Keep; explain points and benefits clearly |
| Spicy | Keep only as optional discovery mode; put clarity before slang |
| Personality Match % | Remove unless accurately substantiated and explained; avoid pseudo-scientific confidence |
| "whispering in the dark now" | Change to verified neutral live activity or omit; the interface is a warm light experience; avoid an unexplained dark metaphor |

---

## 7. Voice in high-trust moments

A community based on anonymous posting must be precise about promises.

### Privacy-related copy contract

Display what the existing backend truly supports. Example pending verification:

- "Post without showing a name to other members." **Only if the visible post genuinely hides attribution.**
- "A public post can be read and shared by others." **If public posts are accessible/shareable.**
- "If you add a handle, others may see it." **Before posting and at handle selection.**
- "You can report a post that crosses the line." **Only if functional.**
- "Learn how we handle posts and account information." Link to a complete, accessible explanation.

Privacy = user control + explicit facts. Never write "Nobody can trace this," "Private forever," or "Everything disappears" without validated, accurate implementation.

### Moderation and kindness

The site should visibly discourage targeting, doxxing, harassment, and sharing someone else's private information. Use neutral, non-threatening explanations. Content that may be upsetting should be handled through clear reporting/moderation and optional sensitive-content controls, not playful rewards. Do not create intense, fear-inducing warnings for everyday posts.

---

## 8. Mobile quality bar to be shared by all five phases

**Reference screen:** 390 × 844 CSS px. **Verification:** 360 × 740, 375 × 812, 390 × 844, 430 × 932, keyboard-open, large text, slow mobile network, Android Chrome and iOS Safari if available.

- Use system safe areas at top/bottom; account for browser toolbar and dynamic viewport height.
- Preserve bottom-navigation visibility on top-level routes except intentional full-screen writing/detail flows.
- Place one primary action per screen; secondary actions must not compete visually.
- Do not open the keyboard automatically on initial visit.
- No hover-only explanations, no swipe-only critical actions.
- Avoid full-screen page transitions that destroy scroll position.
- Prefer contextual full-width mobile sheets over tiny desktop modals squeezed into 390px.
- Backgrounds must remain clean enough for extended reading sessions.
- Display no data or interaction that could be mistaken for real when it is only demo content.

---

## 9. Phase-01 deliverables GPT-6.1 Sol must produce

1. **A current-state inventory** showing the relevant real screens, behaviors, backend dependencies and risks found in the repo.
2. **A concise visual direction board**, described through component examples, not vague adjectives.
3. **A tokenized color/type/spacing/radius/motion plan** supported by mobile screenshots and contrast checks.
4. **A set of four or more representative mobile component studies:** header, thought card, category chip, bottom navigation, primary button, sheet.
5. **An official copy voice sheet** with approved, rejected and context-sensitive copy examples.
6. **A before/after explanation** demonstrating exactly how the current pale, low-contrast, uneven UI evolves into a warmer, clearer and more distinctive light brand without deleting features.
7. **A decision log** of design decisions that later phases may not silently reverse.

### Sign-off checklist

- [ ] Default screen is light, readable and distinctively BajiHears, not generic Instagram or generic SaaS.
- [ ] One type pairing, one primary accent and one coherent surface language.
- [ ] Screenshot references match the recording, with no invented mobile observations.
- [ ] No unsupported emotional, privacy, personality or community-count claims.
- [ ] App screens have comfortable mobile anatomy and realistic component sizes.
- [ ] Brand copy feels warm and real without faux intimacy.
- [ ] The implementation path protects existing app/data logic.

**Do not proceed to Phase 02 if this foundation is still inconsistent.**

---

## External reference standards to consult when implementing

- [Apple Human Interface Guidelines: layout and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple Human Interface Guidelines: tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Material Design 3: navigation bar](https://m3.material.io/components/navigation-bar/overview)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

These are principle-level references, not instructions to copy an iOS or Android design system unchanged. Existing capabilities and honest privacy communication take precedence over fashion.

---

## PHASE HANDOFF CONTRACT (required output from agent)

At the end of this phase, report exactly: **(1)** user-facing problems solved; **(2)** repository files/routes edited; **(3)** genuine 360px and 390px screenshots; **(4)** interactions, accessibility and network behavior actually tested, with pass/fail results; **(5)** anything incomplete or blocked; **(6)** confirmation that no Git push or deployment occurred. **STOP HERE. Await explicit approval before beginning the next Markdown phase.**
