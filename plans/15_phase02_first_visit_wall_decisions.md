# Phase 02 — First visit, navigation and Wall decisions

Status: implemented on top of the Phase 01 Warm Paper foundation.

## First-fold compositions considered

### A — Editorial welcome + verified feature (selected)

Compact header, a blush editorial welcome, one real featured post when the winner endpoint returns one, then honest Wall controls. The separate Write action remains thumb-reachable above navigation. This was selected because it explains the product without placing a marketing screen or composer between the visitor and community content.

### B — Featured thought first

Compact header followed immediately by a featured thought, with welcome copy below it. This prioritizes content but gives a completely new visitor less context about anonymous reading and optional participation.

### C — Compact welcome + recent stream

One-line welcome, Recent/Most reacted control, then the feed with no featured treatment. This is the returning-reader composition and becomes the automatic state after the first visit.

## Implemented information architecture

1. Sticky compact brand header with Corner access.
2. First-visit editorial welcome; automatically compact on a returning visit.
3. Verified featured thought when one exists—no fabricated fallback.
4. “The Wall” title and “Different lives. Familiar thoughts.” supporting copy.
5. Data-honest sorting: Most reacted uses summed backend reaction values; Recent uses post timestamps.
6. Single-select horizontal category row with an explicit All state.
7. Inline composer shown only after explicit writing intent.
8. Natural feed, followed by a one-time-position trust note after the second post.
9. Persistent four-destination navigation and a separate Wall-only Write action.

## States and data dependencies

| State        | Implementation                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | Stable card-shaped skeletons with “Getting the Wall ready…” screen-reader status and no aggressive shimmer                                            |
| Empty        | Honest quiet state; filtered state can return to All; writing remains optional                                                                        |
| Error        | “Couldn’t load the Wall just now” with a working refetch action                                                                                       |
| Pagination   | Existing IntersectionObserver appends server pages without replacing visible content                                                                  |
| Long content | Cards remain naturally sized with no fixed-height clipping                                                                                            |
| Reaction     | Existing atomic optimistic mutation remains; rollback now exposes an actionable error message                                                         |
| Reply/Echo   | Existing optimistic Echo flow remains in the card context                                                                                             |
| Share        | Existing quote-card share flow remains                                                                                                                |
| Save         | No separate save backend exists; heart-derived liked posts remain available in Corner and are not relabeled as a distinct persisted save action       |
| Reporting    | Existing device-local veto/report behavior remains visible; Phase 03 must connect and explain server review semantics before promising backend review |

## Navigation and return behavior

- Wall, Read, Duel and Corner are always navigable destinations. Locked content is explained inside its destination rather than by a surprise tab modal.
- Wall sort, category selection and scroll position persist for the browser session.
- Returning visitors get the compact welcome state; the full-screen splash is no longer mounted.
- Bottom navigation uses four equal-width, labeled targets at 360px and above.

## Card decisions

- Regular cards use 18–20px DM Sans with a 1.55 line height.
- The featured card alone uses Instrument Serif and a restrained cream treatment.
- Anonymous identity is capitalized and paired with the listening mark.
- Primary reaction is labelled Relate; zero counts are not emphasized.
- Echo and Share retain visible labels on mobile.
- Firework/ember reaction effects and featured-card glow were removed.

## Before / after

Before, a timed logo splash blocked content, the composer arrived before reading, heuristic “Spicy” language was presented as a feed mode, optional tabs opened lock modals, and gamified interstitials interrupted the stream. After, the real Wall is visible immediately, writing is optional, sort claims are verifiable, navigation is predictable, and the reading rhythm stays stable from 360px through desktop reading widths.
