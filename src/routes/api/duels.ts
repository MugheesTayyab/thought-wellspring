import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn, type ServerFnResult } from "@/server/lib/wrap-server-fn";
import {
  fetchActiveDuel,
  submitDuelVote,
  type ActiveDuelResponse,
} from "@/server/functions/duels";

export interface DuelVoteResponseData {
  choiceIndex: 0 | 1;
  votesA: number;
  votesB: number;
}

/**
 * Handlers (Directly callable and testable)
 */
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

/**
 * TanStack Start Server Functions
 */
export const apiFetchActiveDuel = createServerFn({ method: "GET" })
  .validator((data?: { deviceToken?: string }) => data)
  .handler(async ({ data }) => {
    return handleFetchActiveDuel(data);
  });

export const apiSubmitDuelVote = createServerFn({ method: "POST" })
  .validator(
    (data: {
      duelId: string;
      choiceIndex: 0 | 1;
      deviceToken: string;
      profileId?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    return handleSubmitDuelVote(data);
  });
