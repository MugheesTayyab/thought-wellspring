import type { ActiveDuelResponse } from "@/server/functions/duels";
import type { DuelVoteResponseData, ServerFnResult } from "@/shared/types/api";
import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import { verifiedProfileId } from "@/server/lib/authorization";
import { cachedPublicRead } from "@/server/lib/edge-cache";
import { fetchActiveDuel, submitDuelVote } from "@/server/functions/duels";

export async function handleFetchActiveDuel(data?: {
  deviceToken?: string;
}): Promise<ServerFnResult<ActiveDuelResponse>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return fetchActiveDuel(env, data?.deviceToken);
  });
}

// Server-rendered first paint only. Holds no per-device vote state, so it is safe to share.
export async function handleFetchDuelSnapshot(): Promise<ServerFnResult<ActiveDuelResponse>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return cachedPublicRead("ssr/duel/v1", 30, () => fetchActiveDuel(env));
  });
}

export async function handleSubmitDuelVote(data: {
  duelId: string;
  choiceIndex: 0 | 1;
  deviceToken: string;
  profileId?: string | null;
}): Promise<ServerFnResult<DuelVoteResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return submitDuelVote(env, { ...data, profileId: await verifiedProfileId(env) });
  });
}
