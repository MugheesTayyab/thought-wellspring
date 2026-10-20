# Phase 04 — Signature feature decisions

## Read

- Unlocks after five locally recorded activities: reacted thoughts, Echoes, Duel choices, or shared thoughts.
- No instant unlock, personality percentage, psychological diagnosis, or claim about other people's private opinions.
- The result is an editorial reflection selected from actual activity signals. The page explains the exact activity counts used and labels the result as playful.
- Save is browser-local. Share exports the archetype card without a handle, account identity, or activity details.

## Duel

- The active pair and vote totals come from the Duel API. There is no mock pair or fallback vote count.
- Options are stacked at mobile widths and remain fully readable after selection.
- The percentage split appears only after a vote and at least five total real votes. Sparse results say that the choice is recorded without manufacturing consensus.
- The existing server submission and rollback path remains in place. A successful first vote grants the configured `+2` Ember through the existing activity store.

## Ember

- Ember is an optional participation counter, not a rank or access gate.
- The sheet lists the configured values and explains the real 50-point daily cap for React and Duel activity.
- Unimplemented gifts, scarcity, leaderboards, and external fulfillment promises are disabled.
- Recent activity is drawn from the local Ember log; signed-in balance synchronization continues through the existing root watcher.

## Your Corner

- My thoughts use server-backed activity for the current device and connected profile. Counts and Echoes are not synthesized.
- Saved thoughts, avatar selection, drafts, and the optional handle are explicitly described as browser-local where applicable.
- Account copy only promises association of server-backed posts and Echoes. It does not promise that browser-only data syncs.
- Unsupported email and notification controls were removed rather than represented as working settings.

## Deferred

- A dedicated “Echoes I wrote” query is not yet exposed by the existing activity endpoint.
- Browser-local saved thoughts do not sync across devices.
- External reward fulfillment and the Ember store remain disabled until their effects exist end to end.
