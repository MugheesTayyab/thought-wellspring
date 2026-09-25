import { createServerFn } from "@tanstack/react-start";
import type { DuelVoteResponseData } from "@/shared/types/api";

export type { DuelVoteResponseData };

export const apiFetchActiveDuel = createServerFn({ method: "GET" })
  .validator((data?: { deviceToken?: string }) => data)
  .handler(async ({ data }) => {
    const { handleFetchActiveDuel } = await import("@/server/handlers/duels");
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
    const { handleSubmitDuelVote } = await import("@/server/handlers/duels");
    return handleSubmitDuelVote(data);
  });
