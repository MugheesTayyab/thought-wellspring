# Phase 01 — Brand foundation decision record

Status: implemented foundation, 2026-10-20. Later phases should extend these decisions rather than silently replace them.

## Current-state inventory

| Area             | Real behavior and dependency                                                                                                         | Foundation risk addressed                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The Wall         | Server-backed paginated posts, category filters, reactions, replies/Echoes, sharing and reporting through `useWall` and API handlers | Preserved all actions; removed fabricated live-presence copy and made reading primary                |
| Composer         | Post text, visual preset, category, anonymous/handle attribution, moderation and posting lockout                                     | Final action now states the actual selected attribution; privacy copy makes no unverified guarantees |
| Featured thought | Winner pipeline and reaction state through `useWinner`                                                                               | Reframed from visually dominant “champion” treatment to a calm featured note                         |
| Baji Read        | Locally derived activity signals and cached result; optional Warmth spend                                                            | Explicitly labelled playful and activity-based; no unsupported personality confidence claim          |
| Duel             | Server-backed daily choice and aggregate result via `useDuel`                                                                        | Preserved results; moved to paper choice cards with thumb-sized actions                              |
| Your Corner      | Local identity plus server activity lookup, auth backup and profile settings                                                         | Promoted to persistent navigation and a full mobile screen                                           |
| Moderation       | Profanity checks, report/veto flows and server moderation handlers                                                                   | Neutral, actionable wording replaces shame-based language                                            |
| Counts           | Post/reaction/Echo data is server-backed; profile and reward state is a mix of server and local state                                | No invented online/community counter remains; derived data is described as activity-based            |

## Visual direction

Warm Paper Social uses a warm-ivory canvas, clean white note cards, deep ink type, coral only for actions and active relationships, and one occasional blush/lilac/butter/sage surface. DM Sans carries navigation and body copy; Instrument Serif is reserved for featured thoughts and editorial moments. The listening mark is the small paired-curve device beside the BajiHears wordmark. Baji remains an occasional host through existing mascot assets.

Representative components:

- Header: compact wordmark, listening mark, Ember affordance and profile control on warm paper.
- Thought card: white note, one warm divider, readable serif thought, quiet metadata, no ambient glow.
- Category chip: outlined neutral pill; coral tint only when selected.
- Bottom navigation: fixed paper bar with Wall, Read, Duel and Corner; 44px+ targets and safe-area padding.
- Primary button: accessible action coral `#AE4335` with white text.
- Sheet/modal: clean paper surface, warm divider, restrained shadow and no dark glass layer.

## Tokens

| Token                         | Value                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Canvas                        | `#FAF7F3`                                                                                |
| Card                          | `#FFFFFF`                                                                                |
| Soft oat                      | `#F4EDE6`                                                                                |
| Primary ink                   | `#272027`                                                                                |
| Secondary ink                 | `#665A60`                                                                                |
| Expressive coral              | `#D65A49`                                                                                |
| Action coral                  | `#AE4335`                                                                                |
| Blush / Lilac / Butter / Sage | `#FBE6E4` / `#EEE8FA` / `#FFF0C9` / `#DCEBDD`                                            |
| Divider                       | `#E8DFDC`                                                                                |
| Type                          | DM Sans + Instrument Serif                                                               |
| Spacing                       | 4px base; 8/12/16/20/24/32px working scale                                               |
| Radius                        | 20px base; 24px content cards; full pills only for tags and filters                      |
| Motion                        | 180–300ms placement/reveal; removed scroll-driven 3D card motion; reduced-motion honored |

Contrast targets retained from the brief: primary ink/canvas ~14.9:1, secondary ink/canvas ~6.2:1 and white/action coral ~5.8:1. Expressive coral is not used behind normal white button text.

## Voice sheet

Approved: “For the thoughts that never made it out loud.”, “Read what others are thinking. Share something of your own, when you’re ready.”, “Just here to read? That’s welcome too.”, “This will appear without your name.”

Rejected: claims that thousands are listening, synthetic live-user counts, “we know how you feel”, absolute anonymity promises, “personality match” percentages and loss-aversion streak prompts.

Context-sensitive: Whisper, Echo, Ember, Baji Read and Duel remain product terms, but first-use supporting copy explains the underlying action.

## Before / after

The previous dark brown canvas, orange glow, dense microcopy, 3D winner motion and narrow phone-strip desktop presentation have become a light reading surface with one type hierarchy and one action accent. All routes and data flows remain intact. Rewards and playful modes are still available, but expression and reading own the first visual layer.

## Locked decisions

1. Light warm paper is the default theme.
2. DM Sans and Instrument Serif are the only Latin UI families.
3. `#AE4335` is the accessible action color; `#D65A49` is decorative only with light text at large sizes or dark text.
4. The listening mark is the brand device; do not introduce competing logo motifs.
5. Anonymous/attributed state must be visible beside the publish action.
6. Displayed community activity must come from verified or clearly labelled derived data.
7. Baji Read is entertainment, not psychological assessment.
8. Wall, Read, Duel and Corner retain persistent top-level mobile navigation.
9. Future visual work must preserve moderation, auth, posting, reaction, Echo, share and profile behavior.
