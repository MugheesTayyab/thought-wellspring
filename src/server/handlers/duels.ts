import type { ActiveDuelResponse } from "@/server/functions/duels";
import type {
  DuelVoteResponseData,
  ServerFnResult,
} from "@/shared/types/api";
import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import {
  fetchActiveDuel,
  submitDuelVote,
} from "@/server/functions/duels";

export async function handleFetchActiveDuel(
  data?: { deviceToken?: string }
): Promise<ServerFnResult<ActiveDuelResponse>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return fetchActiveDuel(env, data?.deviceToken);
  });
}

export async function handleSubmitDuelVote(
  data: {
    duelId: string;
    choiceIndex: 0 | 1;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<ServerFnResult<DuelVoteResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return submitDuelVote(env, data);
  });
}
