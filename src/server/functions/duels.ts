import type { DatabaseEnv } from "../db/client";
import {
  fetchActiveDuel as dbFetchActiveDuel,
  fetchDuelById as dbFetchDuelById,
  hasDeviceVotedOnDuel,
  recordDuelVote,
} from "../db/duels";
import { incrementTotalActions, incrementWarmth } from "../db/profiles";
import { validateDeviceToken } from "../middleware/device-token";
import type { Duel } from "@/shared/types/duel";

export interface ActiveDuelResponse {
  duel: Duel | null;
  alreadyVoted: boolean;
  userChoice?: 0 | 1 | undefined;
}

/**
 * Fetch the currently active duel, optionally checking if device has already voted
 */
export async function fetchActiveDuel(
  env: DatabaseEnv | undefined,
  deviceToken?: string | null
): Promise<ActiveDuelResponse> {
  const res = await dbFetchActiveDuel(env);

  if (res.error) {
    throw new Error(res.error.message);
  }

  if (!res.data) {
    return { duel: null, alreadyVoted: false };
  }

  const duel = res.data;
  let alreadyVoted = false;
  let userChoice: 0 | 1 | undefined = undefined;

  if (deviceToken) {
    try {
      const validToken = validateDeviceToken(deviceToken);
      const voteInfo = await hasDeviceVotedOnDuel(env, duel.id, validToken);
      alreadyVoted = voteInfo.voted;
      userChoice = voteInfo.choiceIndex;
    } catch {
      // Ignored if invalid token format on read
    }
  }

  return {
    duel,
    alreadyVoted,
    userChoice,
  };
}

/**
 * Submit vote on a duel with deduplication and warmth rewards
 */
export async function submitDuelVote(
  env: DatabaseEnv | undefined,
  input: {
    duelId: string;
    choiceIndex: 0 | 1;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<{ choiceIndex: 0 | 1; votesA: number; votesB: number }> {
  const token = validateDeviceToken(input.deviceToken);

  if (input.choiceIndex !== 0 && input.choiceIndex !== 1) {
    throw new Error("Invalid choice index. Must be 0 or 1.");
  }

  // Record vote in DB
  const voteRes = await recordDuelVote(env, input.duelId, token, input.choiceIndex);

  if (voteRes.error || !voteRes.data) {
    throw new Error(voteRes.error?.message || "Failed to record duel vote");
  }

  // Reward signed-in user if profileId provided
  if (input.profileId) {
    await incrementTotalActions(env, input.profileId).catch((err) =>
      console.error("[submitDuelVote] incrementTotalActions error:", err)
    );

    const warmthReward = 10;
    await incrementWarmth(env, input.profileId, warmthReward, {
      id: `w_duel_${Date.now()}`,
      action: "duel",
      amount: warmthReward,
      label: "Voted in Community Duel",
      timestamp: Date.now(),
    }).catch((err) => console.error("[submitDuelVote] incrementWarmth error:", err));
  }

  return voteRes.data;
}
