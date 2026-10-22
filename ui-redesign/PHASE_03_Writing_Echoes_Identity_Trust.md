# PHASE 03 / 05 | THE WRITING EXPERIENCE, ECHOES, PRIVACY & COMMUNITY TRUST

**Execution brief for GPT-6.1 Sol · UX behavior, wording, states and visual composition, not source code**  
**Priority:** P0 · **Prerequisites:** Phase 01 tokens/voice, Phase 02 navigation and Wall architecture  
**Next file:** `PHASE_04_Read_Duel_Ember_Your_Corner.md`

> **Mission:** Fix the current overlong, form-like writing experience, and make sharing a thought feel natural and unpressured on a phone. Turn the composer, identity selector, published post, Echo replies, sharing and moderation into one beautifully crafted, comprehensible system. The visitor should feel in control, not emotionally pressured or falsely assured of privacy.

---


## COPY-PASTE AGENT PROMPT: PHASE 03 ONLY

> Read the attached PHASE_03_Writing_Echoes_Identity_Trust.md in full and implement PHASE 03 ONLY, using the Phase 01 design system and Phase 02 Wall/navigation. Make composing a thought beautiful, effortless, and writing-first on small phones. Progressively reveal mood, category, and posting identity, make public/anonymous behavior and button labels unambiguous, protect unsent drafts on errors, create a useful audience preview, and redesign the Echo public-reply sheet with keyboard-safe controls, reporting, and supportive but accurate wording. Run real end-to-end interactions, including both posting modes and network failure, at 320/360/390px, and show screenshots with the keyboard open. Do not break existing APIs or business logic; no fabricated privacy promises. DO NOT push, deploy or change production settings. Stop after this phase.


### Mandatory scope and safety rules for this phase

- Read the entire attached file, the current source files, and relevant output from earlier phases; **implement only this phase's scope**. Treat the Markdown as the product and design specification, not as a list of literal code snippets.
- Work in the current repository and on a local branch if useful. **DO NOT GIT PUSH, DO NOT DEPLOY, DO NOT MODIFY LIVE PRODUCTION SETTINGS, DO NOT RESET DATA, and DO NOT DELETE OR REPLACE FUNCTIONING FEATURES.** Commit locally only if the repository workflow allows it; never publish.
- **Mobile source of truth: 390px width**, verify also 320px and 360px. Use real browser renders rather than generated screenshots or static Figma-like mockups.
- Preserve auth, real backend writes, content persistence, profile identity, Wall/Read/Duel/Ember functionality, saved posts, reports, and existing permission constraints. No invented activity counts, fake endorsements, or misleading anonymity guarantees.
- Don't require the user to write intimate or sensitive content to unlock recognition. Don't confuse warmth with fake intimacy. The brand supports curiosity and humor as well as quiet reflection.
- Produce evidence: actual route/component changes, 360px and 390px screenshots, working interactions, errors checked, accessibility and mobile keyboard observations, and any remaining risks.
- **Stop after this phase and report results. Do not start the next phase unless I explicitly ask.**

---

## 1. Why this phase defines BajiHears' trust

The 22 October **mobile recording (approximately 00:38–01:12)** shows a long, increasingly crowded writing flow: writing surface, moods, anonymous/handle option, category selection and publication preview compete for attention. The older desktop recording also suggested a potential **"Drop Handle" versus "Post Anonymously"** labeling contradiction. Verify whether that contradiction still exists in the current code, and prevent it in every identity state. The redesign must resolve that conflict, regardless of which visual mood is chosen.

Other current behaviors to preserve after auditing the real project: short-form text composition, mood selectors, category choices, anonymous/handle option, publishing, reactions, Echoes, and sharing. **Never silently disable a live behavior to make a redesign look simpler.**

### Product philosophy

- People are never required to disclose intimate information to take part.
- Users must know the **audience** for a post before publishing.
- Anonymous to other readers does not automatically mean invisible to the platform, moderators, service providers or law enforcement; describe the actual implementation honestly.
- A successful post is a clear publishing outcome, not an occasion for a carnival animation.
- A reply is a human response; design for care and context, not viral argument.
- Privacy and moderation must be understood through visible controls rather than a vague "safe community" banner.

---

## 2. Three mobile composition states

### State A: pre-compose invitation on the Wall

Present one recognizable entry point on the Wall. Prefer a compact, tappable **"Got something on your mind?"** prompt near the top plus an optional persistent **Write** action if it does not compete with nav. Avoid duplicating two giant identical CTAs within 200px.

Appearance:
- Warm white compact note surface with a small pencil/quote mark.
- One line of inviting copy, muted hint of text area.
- Tap zone at least 44–48px tall.
- No auto-expanding input that occupies half the page while the user is just browsing.

### State B: focused writing sheet (recommended mobile primary)

Open an accessible, tall bottom sheet or dedicated full-screen composition route depending on keyboard and long-form requirements. A **full-screen write view is usually safer** once the keyboard appears on small devices; a partially open sheet may work for the entry preview. Decide based on hands-on testing.

Mobile anatomy from top to bottom:

1. **Header:** "Write a thought" + obvious Close control; visually calm, not a large brand hero.
2. **Brief reassurance:** "No need for the perfect words." Small and dismissible/ignorable.
3. **Main text surface:** large responsive textarea, real multiline editing, comfortable caret and scrolling.
4. **Character indicator:** quiet near the text area, displays actual limit and never overlays text.
5. **Mood chooser:** horizontal visual palette; selected mood obvious; never too tall.
6. **Posting as:** a clear, explicit identity section, default to safest accurate option.
7. **Category:** selectable chips with visible selection.
8. **Audience/privacy summary:** readable "How this will appear" line before publication.
9. **Sticky publish region:** one main CTA above keyboard or at bottom when keyboard is closed, respecting safe area; secondary controls must not hide text.

Do not display every option at equal visual weight. Writing takes 60–70% of attention; attribution, mood and category are secondary.

### State C: posting outcome

- When submitted, show pending progress without duplicating submissions.
- On success, dismiss composer or transform it into a small calm confirmation; route to the new post or keep the user's prior context according to product behavior.
- On failure, retain the complete unsent text, category and identity choices.
- On cancel with entered text, ask whether to keep/discard the draft only when it would otherwise be lost; do not guilt the user.

---

## 3. Writing surface: a signature tactile experience

### Visual personality

Think modern digital stationery, not a glowing chatbot textarea. Warm cream perimeter, clean paper writing surface, one calm line of supporting text. The typographic treatment should make a plain one-sentence thought feel considered without looking like a greeting card.

### Specific visual guidance

- Container: clean white surface with a 1px warm neutral border (or subtle inset distinction), corner radius ~18–22px.
- Default text: high-contrast ink, 17–19px, generous line height.
- Focus: faint coral inner edge, not an aggressively glowing outline.
- Placeholder: readable neutral; never too pale to discern.
- Textarea grows or scrolls appropriately, no jitter as text wraps.
- Character limit uses ordinary labels, not pressure cues; warn politely near the actual boundary.
- Long drafts remain editable with keyboard up on iPhone SE-sized and low-height Android screens.
- Selection, copy, paste, emoji entry and international scripts must work.
- Allow natural paragraphs and line breaks, with sensible rendering in published cards.

### Placeholder options

**Option A:** "What's something you've been keeping to yourself?"  
**Option B:** "A small thought, a big thought, anything."  
**Option C:** "Start wherever you want."  

Use A for first-time emotional clarity, B if the product hosts lots of playful everyday observations, and C as secondary/returning state. A placeholder is not a question demanding an intimate disclosure.

### Comfortable instructional copy

**Above input:** "This one is yours." (only if not implying privacy)  
**Below input:** "Share what you want to share. Leave out anything personal you don't want public."  
**Alternative concise:** "Keep names and private details out of public posts."  

Present privacy tip with an unobtrusive help indicator, not as an alarming warning on every keystroke.

---

## 4. Writing moods: expressive but restrained

The current UI shows several small color circles, with a visible mood label such as Midnight Static. Moods can become a memorable part of BajiHears if they change the **writing card atmosphere**, not the meaning of the post or its anonymity.

### Suggested visual mood family

| Mood name | Visual treatment | Emotional association | Do not do |
|---|---|---|---|
| **Soft Note** | Neutral white/cream with a muted rose corner | Everyday openness | Do not imply user feels sad |
| **Peach Hour** | Very light peach/blush canvas | Warmth, gentle humor | No orange-on-orange unreadable text |
| **Blue Window** | Pale periwinkle, restrained blue mark | Reflection | No dark vignette across text |
| **After Hours** | Soft stone/lavender gradient at minimal opacity | Late-night thoughts | No default near-black text field |
| **Little Spark** | Butter-toned line illustration/corner stripe | Playfulness | No animated sparkles under text |

These are **proposed theme labels**. Map existing stored values safely to new presentation names; never break old posts or surprise users by rewriting their saved data. Don't make categories and moods redundant.

### Interaction details

- Single horizontal row with a live accessible label for each mood.
- Each swatch has a visible selected ring and a tiny sample treatment, not only a colored dot.
- Changing moods crossfades card background within ~180–250ms, maintaining caret and draft.
- Explicit labels and screen-reader announcements for selected mood.
- Ensure all moods meet contrast and don't change text alignment or resize unexpectedly.
- Place colorful choices beneath the actual text, so words stay visually central.

---

## 5. Anonymous versus handle-based publishing: no ambiguity allowed

### Current problem

A toggle styled "Anonymous" / "Drop Handle" with a handle input and an unchanged "Post Anonymously" button can create an unsafe mental model. **This is a critical product and copy bug.**

### Redesign as a clear labeled section

**Section heading:** "Post as".

**Choice 1, recommended default where backend supports it:**  
**Anonymous**  
"Other readers won't see a name attached to this post." 

**Choice 2:**  
**With a handle**  
"People can see the handle you choose to show."

Only say "won't see a name" if actual page/API output is confirmed to hide it from public users. Add link **"What can others see?"** to accurate privacy explanation.

### If "With a handle" is selected

- Reveal handle input deliberately with clear focus; never auto-fill a private identity without permission.
- Explain whether it is an Instagram handle or a BajiHears display name. **Do not ambiguously combine them.**
- If the input targets Instagram, tell the user that including a social handle can let people find their account outside BajiHears.
- Show a short preview of attribution exactly as it will appear on the Wall.
- Update publish CTA to **"Post with handle"** or neutral **"Share this thought"**; **never** leave "Post Anonymously" displayed.
- If switching back to Anonymous, hide public handle attribution in preview and prevent accidental submission of it.
- Clear or preserve the typed handle thoughtfully, avoiding unintended resurfacing in a later anonymous session.

### Audience summary at the action point

Example, after backend verification:

> **How this post appears:** Public on the Wall · Posted as Anonymous.

Or:

> **How this post appears:** Public on the Wall · Handle: @chosenname.

Include first-visit teaching that published posts may be read or shared by others. **Audience** and **identity** are separate things; an anonymous public post is not a private diary entry.

---

## 6. Categories and post preview

### Category decision

Retain backend categories: Spill the Tea, Silent Thoughts, Plot Twist, Hard Truth, and any others actually present.

- Use clear, visually consistent chips and a strong selected state.
- If category is required, do not silently preselect a semantically inaccurate category like "Spill the Tea".
- Provide a safe neutral default such as **"Just a thought"** only if backend supports it or after an approved data/model change.
- If categories have very similar meaning, simplify user-facing explanation instead of introducing more controls.

### Preview

For a first-time poster, **Preview as others see it** may appear as an optional inline control, especially in handle mode. Show actual attribution, mood, category, line breaks and any public metadata. No fake engagement counter. Avoid requiring a second confirmation for every routine post if the identity summary is already clear.

### Drafts

If supported, auto-save unsent drafts locally or through authenticated storage transparently; do not imply cross-device sync unless verified. If unsupported, preserve draft while the sheet is open and warn before loss. Drafts must never be shown in the public feed by mistake.

---

## 7. Detailed submission and failure states

### Empty draft

Disabled/soft CTA with direct helper "Write a little something first" if tapped. No shaking input or shaming error language.

### Too long

Clear remaining character count and exact message "That thought is a little over the limit. Shorten it to share." Keep full text for editing.

### Duplicate tap

Disable repeat submit while pending; spinner/inline status within the action. Don't produce multiple posts.

### Slow connection

Keep form visible; say **"Still sending…"** after a genuine delay. Don't pretend posted until acknowledged.

### Posting failure

**Heading:** "Couldn't post that just yet."  
**Body:** "Your words are still here. Check your connection and try again."  
**Action:** "Try again".

Only claim words are retained if the draft really is still present.

### Moderation/policy failure

Explain clearly but without public shaming. Do not expose moderation evasion guidance. Provide a way to revise a post or understand community rules as relevant. Never show a fabricated success state if content is pending review.

### Success

**Title:** "Your thought is on the Wall."  
**Subline:** "Thanks for sharing it here."  
**Actions:** "See your post" + "Back to the Wall".

If the post is under review, the confirmation must accurately say **"Sent for review"**, not "on the Wall".

---

## 8. Replies / Echoes: the human part of the community

### Feature intent

An Echo is a reply to something someone shared. It should feel less like a fight-ready comments system and more like a visible, respectful response. **Do not artificially control or claim other users' emotional reactions.**

### Mobile Echo interaction

Tap Echo on a thought card → open dedicated post detail or a tall accessible bottom sheet with:

1. The original thought at the top, clearly visually differentiated.
2. A readable Echo thread beneath it.
3. Clear anonymous/handle attribution for replies.
4. A compact reply composer anchored at the bottom, keyboard-aware.
5. A functioning report action on each reply.
6. A useful empty state and the option to leave without replying.

If threads are long, prefer a dedicated detail route to preserve comfortable scrolling and deep-linking, rather than a cramped nested-scroll popup.

### Reply prompt and empty state

**Reply field:** "Want to leave an Echo?"  
**Reassurance:** "A kind word, a thought of your own, or just a small response."  
**No replies:** "No Echoes yet. You can leave one if you like."  
**Posted:** "Your Echo is here."  
**Failed:** "Couldn't send your Echo. Your reply hasn't been lost." (only if retained)

### Interaction hierarchy

- Original thought remains visually dominant.
- Reactions and Echoes have visibly different icons and labels.
- Reply action cannot accidentally trigger a reaction.
- A thread's length should not mean the composer is trapped behind a keyboard.
- No automatic @mentions to expose usernames not chosen for display.

### Community boundaries

Include clear reporting and community rules. Where possible, help users avoid sharing others' identifying information. Do not incentivize more intense or provocative replies with higher reward amounts.

---

## 9. Saves, shares and publication controls

### Save

- Use a subtle bookmark icon with clear tooltip/label **"Save"**.
- On success, **"Saved to Your Corner"** appears in a brief nonblocking toast.
- On unsave, **"Removed from saved thoughts"**.
- Confirm whether guest saves persist locally, require sign-in or cannot be retained. Do not promise cross-device save when none exists.

### Share

- Use standard browser/system share behavior where supported, with **Copy link** as fallback.
- Preview text should avoid including any user's private email or profile information.
- If a public post contains identifying details, treat external sharing as a real consequence and ensure the user-facing notice is truthful.
- Never write "Only people here can see this" if public direct links exist.

### Author controls

If supported by account/auth model, let users see **My posts**, and edit/delete their own posts in a clear accessible action menu. Explain deletion limitations if public replies, cached copies or external screenshots may survive. Do not invent deletion flows or claim total erasure unless implemented.

### Selected-for-feature content

The existing screen refers to a Featured Path/community selection. This needs a verified, clear consent model, especially if posts may be reposted on Instagram.

- State whether posts can be publicly featured.
- Explain whether consent is needed, and obtain it when required.
- A handle should not be revealed in external promotion without permission.
- Do not promise users that every anonymous post will remain inside BajiHears if public sharing is allowed.
- Consider **opt-in** for external reposting of personal expressions; get explicit permission before attributed external featuring.

---

## 10. Comfort and trust through visible UX

### The honesty matrix

| User concern | Visible product response |
|---|---|
| "Will my name show?" | Identity preview + specific public label at publish time |
| "Can people outside the app read this?" | Truthful audience explanation, tied to actual route/auth rules |
| "What if I regret posting?" | Clear action availability and deletion limitations |
| "Will I lose this if the app crashes?" | Draft retention behavior and accurate status |
| "What if someone is mean?" | Working reporting, moderation information, block/filter options if supported |
| "Will a handle link back to me?" | Explicit warning that an external social handle can reveal identity |
| "Do I have to share something serious?" | Gentle copy welcoming short, funny, everyday or thoughtful posts |
| "Does Baji know me?" | No false personalization or emotional inferences; user-controlled experience |

### Welcome without parasocial overreach

Good: **"You don't have to rush what you want to say."**  
Bad: **"I've been waiting here for you, and I know you need me."**  
Good: **"Read a little. Share if you want."**  
Bad: **"People like you need to let it all out."**

### Privacy settings in flow

Link to real privacy information from composer, Corner settings, and onboarding. If the platform has a privacy policy, moderation policy and data deletion mechanism, make them findable and understandable. If these do not exist, flag them as required product work rather than masking the absence with a heart icon.

---

## 11. High-impact interaction details

### Composer animation storyboard

- Initial tap: note surface subtly expands, backdrop dims only enough to indicate focus.
- Sheet or full-screen route enters with short vertical motion and crisp text (no blurry prolonged fade).
- Textarea receives focus only after transition and when user initiated write.
- Mood change: visual palette crossfade, caret and scroll retained.
- Anonymous ↔ handle choice: handle field reveals cleanly; audience summary immediately updates.
- Keyboard: layout recalculates; publish CTA stays discoverable; no jump past typed text.
- Success: sheet transitions out; post appears in feed or explicit result view; one small animation acknowledges action.
- Failure: no modal flash; inline honest message and retry.

### Echo transition storyboard

- Tap: selected card gains a brief tactile state.
- Detail: post remains contextually linked; sheet/detail enters smoothly without losing reading position.
- Reply: keyboard appears naturally, no body-scroll conflict.
- Send: reply transitions into thread only after confirmed/managed optimistic update; accurate error handling.
- Close: original feed scroll state restored.

### Reduced motion

All spatial/scale animations should reduce to short fades or immediate state changes if the device requests reduced motion. No essential meaning depends on animated reveals.

---

## 12. Mobile testing matrix

Test on 360, 390, 430 widths plus a short-height landscape case.

- [ ] Composer opened from top prompt and from floating Write action.
- [ ] Keyboard open with long multiline draft and browser chrome visible.
- [ ] Switch all mood options while writing; text preserved and readable.
- [ ] Switch Anonymous ↔ With handle, submit CTA and preview always agree.
- [ ] Handle containing unusual but valid characters, input errors and blank handle.
- [ ] Change category without shifting textarea scroll.
- [ ] Cancel draft and return; no silent data loss.
- [ ] Slow network, retry, failed publish and duplicate tap.
- [ ] Echo on long post; nested scroll and back state work.
- [ ] Report an Echo; confirm actual backend acknowledgement.
- [ ] Share via native phone share and copy fallback.
- [ ] Delete/owner controls where available; no accidental anonymous identity exposure.
- [ ] Large fonts, screen reader, keyboard navigation and reduced motion.
- [ ] New user understands what "public" and "anonymous" each mean.

---

## 13. Deliverables and acceptance gate

### Produce

1. A **full writing journey design** from Wall entry to success and error states.
2. Three mobile compositions: closed prompt, open composer with keyboard, publish confirmation.
3. Verified/accurate identity-selection UI with genuinely adaptive CTA and post preview.
4. Five differentiated mood treatments with accessible labels and consistent readability.
5. Working Echo thread experience: reply, loading, empty, errors and reporting.
6. Save/share and owner actions integrated with existing business logic.
7. A privacy copy audit listing every guarantee and the backend evidence needed for it.
8. Mobile screenshots for all essential states; a small usability test with people unfamiliar with the current interface is strongly encouraged.

### Must-pass experiences

- A visitor can draft a thought in under 10 seconds after finding Write, without first understanding Ember or Baji Read.
- A person cannot accidentally publish a visible handle while believing the post will be anonymous.
- Every publish/reply result is accurate about whether the server accepted it.
- Cancel/back never destroys important text without an understandable warning or supported draft behavior.
- A user can read and respond with one hand, with comfortable keyboard and safe-area positioning.
- The UI feels inviting for everyday lighthearted thoughts **and** reflective posts without applying mood-based emotional pressure.

**Do not sign off Phase 03 merely because the composer looks pretty in an empty-state screenshot. It must handle real words, real devices, real identity choices and real failures.**

---

## PHASE HANDOFF CONTRACT (required output from agent)

At the end of this phase, report exactly: **(1)** user-facing problems solved; **(2)** repository files/routes edited; **(3)** genuine 360px and 390px screenshots; **(4)** interactions, accessibility and network behavior actually tested, with pass/fail results; **(5)** anything incomplete or blocked; **(6)** confirmation that no Git push or deployment occurred. **STOP HERE. Await explicit approval before beginning the next Markdown phase.**

### Composer interaction checklist from current recording

- The first tap focuses on writing rather than presenting an overwhelming configuration sheet.
- The character count never crowds or overlaps the textarea and input cursor.
- Moods preview clearly without forcing a long scroll.
- Anonymous versus visible handle is visually explicit and the publish label always agrees with the selected mode.
- A realistic reader-facing preview explains what will be public.
- The publish action remains accessible with the Android keyboard open.
- A failed request preserves every typed character and all chosen values, with a clear retry.
- Echo sheet keeps original thought, responses, public-reply label, Close action, and send control reachable.
