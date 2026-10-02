# BajiHears UI redesign

## Product brief (written before UI implementation)

### Product and audience

BajiHears is a phone-first anonymous social space for saying what is difficult to say publicly, finding resonance in other people's “Unsaids,” and learning what one's own reactions reveal. It serves design-literate people aged 18–30, with women as the primary audience. The product should feel private without feeling secretive, emotionally warm without sentimentality, and playful without using childish cues.

Assumption: the wall is the core product, not a marketing landing page. The first useful screen should therefore expose a real post and a clear writing action. Authentication is optional backup; pseudonymous local participation remains primary.

### Three main journeys

1. Read the wall: scan confessions, filter, react, echo, report, share, and open a public profile.
2. Say the unsaid: choose a category and voice, write within the limit, optionally attach a handle, submit, and receive an unambiguous success or recovery state.
3. Build a private sense of self: answer duels, unlock a Baji Read, review saved/posted activity, manage identity, and understand Warmth without pressure.

### Tone

Editorial, candid, intimate, self-possessed.

### Visual direction

“After-hours advice column”: near-black ink, paper-white type, ember orange as the single signature accent, and mineral teal as a restrained supporting hue. Use an expressive local display face only where it carries meaning and a highly readable local/body face elsewhere. Layouts use an editorial rail, ruled dividers, offset labels, and generous negative space rather than floating cards. At desktop sizes, the wall becomes a focused two-column reading desk; at mobile sizes, writing and navigation stay in thumb reach. Motion is limited to first-content reveal, state transitions, and tactile press feedback, with complete reduced-motion support.

Differentiation anchor: each confession reads like a clipped page from a confidential advice column, marked by category folios and a warm vertical rule.

DFII: impact 4 + fit 5 + feasibility 4 + performance 5 − consistency risk 3 = 15.

### Will not do

- No pink/purple gradients, glow fields, glass panels, blurred orbs, gradient text, or fake depth.
- No generic centered hero, three-card feature row, invented testimonials, fake urgency, or explanatory UI copy.
- No default system/Inter/Roboto typography, emoji icons, tiny touch targets, or interaction by color alone.
- No framework migration, schema/API/auth/payment changes, invented product claims, or new dependency without a measured need.

## Baseline evidence

- Branch: `ui-redesign` (local only).
- `npm.cmd install`: pass; dependencies already current.
- `npm.cmd run build`: exits 0, but reports 7 route-file warnings, obsolete `vite-tsconfig-paths`, dynamic-import/plugin warnings, and Wrangler override warnings.
- `npx.cmd tsc --noEmit`: fails. Main groups: push notification buffer/optional types, unchecked server function unions, stale Baji Read comparisons, invalid component props/imports, missing Vitest, and stale test fixtures.
- `npm.cmd run lint`: fails with 1,654 problems. Most are Prettier drift; generated `.wrangler` output is incorrectly linted. Remaining errors include explicit `any`, hook/style issues, and source formatting.
- Tests: no `test` script and imported `vitest` package is missing. Existing suites cannot run as checked in.
- Browser baseline: all UI routes rendered at 360, 390, 768, 1024, and 1440 px with no horizontal overflow. Screenshots and raw console/network results are in `screenshots/before/`.
- Browser console/network: every route requests Google Fonts and fails with `net::ERR_NETWORK_ACCESS_DENIED`; the deliberate missing route also returns its expected HTTP 404.
- Reachability: wall, duel, locked read, guest corner, diagnostics, auth callback loading, and 404 reached. Authenticated corner, unlocked Read, post success, remote error, and push-permission grant need local fixtures or interaction setup for final verification.

## Route and state audit

### Errors

- Every route depends on remote Google Fonts, producing a failed request and inconsistent fallback rendering.
- Typecheck is not part of build and currently has many real failures.
- Lint scans generated `.wrangler` and build artifacts and reports broad source formatting drift.
- Test files import missing Vitest; no test command exists.
- Public diagnostics reveals service-key presence/length and environment-key names.
- Home submission passes a field not accepted by the hook type; Corner references a missing icon; push-permission code passes a hook result where a token string is expected.

### Usability and accessibility

- A 2.4-second blocking splash delays the usable wall and can dominate screenshots/slow devices.
- Root viewport disables zoom with `maximum-scale=1, user-scalable=no`.
- Many controls and text links are below 44×44 px; several icon buttons rely on `title` only.
- Focus treatment is inconsistent; some custom switches have no switch semantics.
- Emoji communicate navigation, reactions, rewards, empty states, and status.
- Muted text and 10–11 px labels reduce readability; some orange-on-dark combinations need contrast correction.
- Fixed bottom navigation obscures content and spans the full desktop window.
- Auth callback has no explicit recoverable error state; loading is indefinite until redirect.
- Empty/error/loading states vary in structure and voice; some skeletons can persist without a clear status.

### Hierarchy and consistency

- Desktop routes remain narrow phone columns with large dead margins; the home rail and bottom bar do not form a coherent desktop shell.
- The useful writing action sits below intro/presence/hero content rather than leading the app experience.
- Nearly every region is a rounded floating card, often nested inside another card.
- Headers, page widths, back links, metric treatments, border radii, and spacing vary by route.
- Warmth appears as an unexplained glowing currency and competes with each page's primary action.
- Read and Duel use different header widths from Wall and Corner.

### Slop

- Orange glow, radial gradients, gradient text, shimmer, holographic effects, 3D tilt, glass blur, and particle effects compete simultaneously.
- Hard-coded colors are repeated throughout components instead of coming from tokens.
- Four type roles plus script font create an incoherent hierarchy; remote fonts fail offline.
- Copy includes generic or pushy phrases (“Most addictive first,” “Instant Unlock,” “Summoning”).
- All-caps micro-labels, excessive pills, inconsistent shadows, and emoji badges resemble generated templates.

### Polish

- Missing local/self-hosted body and display font strategy despite an existing local brand font.
- Images need a consistent sizing/loading policy and meaningful alt review.
- Metadata theme color is out of sync with the design tokens; diagnostics lacks route metadata.
- 404 and root error pages do not share the application shell or voice.
- Large desktop screenshots show abrupt fixed-nav bands and excessive unused space.

## Implementation notes

Work in this order: tokens and shell; navigation/header/status patterns; wall/writing/feed; Duel/Read/Corner; dialogs and secondary states; diagnostics/auth/404; type/lint/test fixes; automated accessibility and responsive verification.

The UI/UX recommendation tool proposed purple, Roboto, invented community metrics, and a marketing landing pattern. Those recommendations conflict with the product evidence and explicit brief, so only its accessibility, touch, responsive, and controlled-form guidance is adopted.

## Verification log

Final results will be appended after implementation. No completion claim is valid without command output, route screenshots, console/network logs, and accessibility results.
