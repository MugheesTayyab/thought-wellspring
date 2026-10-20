# Phase 03 — Composer, Echoes, privacy and safety decisions

## Mobile compositions

### 1. Closed prompt

The Wall uses one compact stationery-style entry point, “Got something on your mind?”, plus the
existing floating Write action. Both open the same composer; neither expands an input while the
visitor is browsing.

### 2. Open composer with keyboard

The primary mobile experience is a full-screen dialog rather than a partial sheet. The writing
surface gets most of the viewport, while mood, identity, category, audience information and preview
remain in one vertical scroll region. The publish region stays at the bottom with safe-area padding.
The textarea supports line breaks, selection, paste, emoji and international input without custom
key handling.

### 3. Publish confirmation

The server response determines the outcome. `published` produces “Your thought is on the Wall” and
can return to the new card; `review` produces “Sent for review” and never claims public visibility.
The form remains visible during errors and slow requests. Duplicate submission is disabled while the
mutation is pending.

## Identity and audience decisions

- Anonymous is the default.
- Anonymous submission always sends `handle: null`, even if a public handle draft remains locally.
- Handle mode explicitly identifies the field as an Instagram handle and warns that it can lead to
  an account outside BajiHears.
- The publish CTA is “Post anonymously” or “Post with handle”; it cannot disagree with the selected
  identity.
- The audience summary independently states that the post is public on the Wall.
- No category is preselected. This avoids assigning an inaccurate emotional meaning to a draft.

## Mood compatibility

The five existing stored keys remain unchanged, so old rows continue to render. Only their
presentation names and light, readable palettes changed:

| Stored key        | Presentation name |
| ----------------- | ----------------- |
| `midnight-static` | Soft Note         |
| `golden-hour`     | Peach Hour        |
| `3am`             | Blue Window       |
| `quiet-storm`     | After Hours       |
| `neon-ache`       | Little Spark      |

## Echo design

Echoes open in a tall, keyboard-aware thread dialog. The original post remains visually dominant;
the thread has an honest empty state, pending reply row, retained text on failure, anonymous/handle
choice and report control on each accepted reply. Feed reads now batch-load Echoes, fixing the prior
state where feed cards always received an empty reply list.

Reply reports are persisted in `echo_reports` with a unique echo/device constraint, self-report
protection, rate limiting and a service-role-only write/review path. The migration must be applied
before deploying the reply-report UI.

## Save and share

- Saves store the public thought snapshot in local storage and appear under Saved in Your Corner.
- Copy explicitly says saves are limited to this browser; no cross-device sync is promised.
- Share uses the system share sheet where available and copies a public deep link otherwise.
- The shared payload contains post text and a public link only; it contains no email or device token.

## Privacy copy audit

| User-facing statement                                       | Current evidence                                                                                                             | Follow-up needed                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| “Public on the Wall”                                        | Published feed is readable through the public `unsaids_select_published` RLS policy.                                         | None for current public deployment.                                                               |
| “Other readers won't see a name” in anonymous mode          | Composer sends `handle: null`; public post rendering only displays the handle field.                                         | Regression-test anonymous inserts and all public profile surfaces.                                |
| Readers do not see the device identifier                    | Feed and winner queries now select explicit public fields and omit `device_token`. Echo queries also omit it.                | Keep future public queries allowlisted rather than using `select('*')`.                           |
| The service stores an identifier for moderation/rate limits | `unsaids`, `echoes`, reactions, reports and rate-limit records store the 16-character device token server-side.              | Privacy policy should name retention periods and subprocessors.                                   |
| Draft is saved only in this browser                         | Composer persists `bh:wall-composer-draft-v1` in local storage and removes it after acknowledged submission.                 | Add a user-visible Clear Draft control if product research shows it is needed.                    |
| Saved thoughts stay in this browser                         | Saved snapshots use `bh:savedThoughts`; no server sync endpoint exists.                                                      | Add authenticated sync only with explicit product approval and migration.                         |
| A report reached moderation                                 | Post reports use the existing atomic veto RPC; Echo reports insert into `echo_reports` and return only after acknowledgment. | Build/admin-document the operational review process for `echo_reports`.                           |
| Anonymous is not private from the platform                  | Server submission retains device token and may retain authenticated profile ID.                                              | Publish a full privacy policy and data-deletion process; neither route exists in this repository. |

## Product gaps not disguised by UI

- There is no post edit/delete server endpoint, so the UI does not claim that authors can erase a
  published post.
- There is no external-feature consent field. The composer does not opt a post into Instagram or
  other off-platform promotion.
- There is no published privacy-policy or community-rules route in the repository. The composer
  gives an inline factual summary, while formal policy and deletion-request surfaces remain required
  product/legal work.
- Device-local drafts and saves are not crash-proof if browser storage is cleared and are not synced.

## Acceptance checks represented in code

- Both Write entry points open the same composer.
- Mood switches preserve text and caret because they only update presentation state.
- Identity switch immediately updates preview, audience summary and CTA.
- Submission and Echo buttons are disabled while pending.
- Failure preserves text and selections.
- Reduced-motion rules in the global stylesheet suppress nonessential animation.
- Full-screen/tall-dialog layouts use dynamic viewport height and safe-area padding for 360, 390 and
  430 px mobile widths.
