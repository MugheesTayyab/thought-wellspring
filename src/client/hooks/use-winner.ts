import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/client/lib/query-keys";
import { apiFetchWinner, apiReactToPost, apiUnreactToPost } from "@/routes/api/wall";
import { FALLBACK_WINNER } from "@/shared/constants/fallback-winner";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { readMyReactions, writeMyReactions } from "@/client/lib/local-storage";
import { nextRevealAt } from "@/shared/utils";
import type { ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface UseWinnerReturn {
  winner: Unsaid;
  hook: string;
  isFallback: boolean;
  isLoading: boolean;
  isError: boolean;
  onReact: (reactionKey: ReactionKey) => void;
  userReaction: ReactionKey | null;
}

/**
 * Manages fetching the current 12-hour cycle winner post, caching it for 5 minutes,
 * and handling optimistic reaction synchronization across the winner card and feed.
 */
export function useWinner(): UseWinnerReturn {
  const queryClient = useQueryClient();
  const { deviceToken } = useDeviceToken();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.posts.winner(),
    queryFn: async () => {
      const res = await apiFetchWinner();
      if (res.ok) {
        return res.data;
      }
      return {
        winner: FALLBACK_WINNER.unsaid,
        hook: FALLBACK_WINNER.hook,
        isFallback: true,
      };
    },
    staleTime: 300_000, // 5 minutes
    gcTime: 900_000,    // 15 minutes
  });

  // Automated revalidation on 12-hour cycle boundary (+30s grace window)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const msUntilNextReveal = nextRevealAt() - Date.now();
    const timerDelay = Math.max(5000, msUntilNextReveal + 30_000);

    const timer = window.setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.winner() });
    }, timerDelay);

    return () => window.clearTimeout(timer);
  }, [queryClient, data]);

  const winner = data?.winner || FALLBACK_WINNER.unsaid;
  const hook = data?.hook || FALLBACK_WINNER.hook;
  const isFallback = data?.isFallback ?? isError;

  // Determine if this device already reacted to the winner post
  const myReactions = typeof window !== "undefined" ? readMyReactions() : {};
  const activeReactionsForWinner = winner?.id ? myReactions[winner.id] || [] : [];
  const userReaction = activeReactionsForWinner.length > 0 ? activeReactionsForWinner[0]! : null;

  const reactionMutation = useMutation({
    mutationFn: async ({
      postId,
      reactionKey,
      action,
    }: {
      postId: string;
      reactionKey: ReactionKey;
      action: "react" | "unreact";
    }) => {
      if (!deviceToken) throw new Error("No device identity available");
      if (action === "react") {
        const res = await apiReactToPost({
          data: {
            postId,
            reactionKey,
            deviceToken,
          },
        });
        if (!res.ok) throw new Error(res.error.message);
        return res.data;
      } else {
        const res = await apiUnreactToPost({
          data: {
            postId,
            reactionKey,
            deviceToken,
          },
        });
        if (!res.ok) throw new Error(res.error.message);
        return res.data;
      }
    },
    onMutate: async ({ postId, reactionKey, action }) => {
      // 1. Cancel in-flight winner queries
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.winner() });

      // 2. Snapshot previous winner
      const previousWinnerData = queryClient.getQueryData<{
        winner: Unsaid;
        hook: string;
        isFallback: boolean;
      }>(queryKeys.posts.winner());

      // 3. Snapshot local storage
      const previousLocal = readMyReactions();

      // 4. Optimistically update local storage
      const existing = previousLocal[postId] || [];
      const updatedLocalReactions =
        action === "react"
          ? [...existing.filter((k) => k !== reactionKey), reactionKey]
          : existing.filter((k) => k !== reactionKey);

      writeMyReactions({
        ...previousLocal,
        [postId]: updatedLocalReactions,
      });

      // 5. Optimistically update query cache
      if (previousWinnerData?.winner) {
        const currentReactions = previousWinnerData.winner.reactions || {
          heart: 0,
          sad: 0,
          fire: 0,
          hug: 0,
        };
        const delta = action === "react" ? 1 : -1;
        const newCount = Math.max(0, (currentReactions[reactionKey] || 0) + delta);

        queryClient.setQueryData(queryKeys.posts.winner(), {
          ...previousWinnerData,
          winner: {
            ...previousWinnerData.winner,
            reactions: {
              ...currentReactions,
              [reactionKey]: newCount,
            },
          },
        });
      }

      return { previousWinnerData, previousLocal };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousWinnerData) {
        queryClient.setQueryData(queryKeys.posts.winner(), context.previousWinnerData);
      }
      if (context?.previousLocal) {
        writeMyReactions(context.previousLocal);
      }
    },
    onSettled: () => {
      // Invalidate winner and feed so both stay in sync if post appears in feed
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.winner() });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  const onReact = (reactionKey: ReactionKey) => {
    if (!winner?.id) return;
    const action = userReaction === reactionKey ? "unreact" : "react";
    reactionMutation.mutate({ postId: winner.id, reactionKey, action });
  };

  return {
    winner,
    hook,
    isFallback,
    isLoading,
    isError,
    onReact,
    userReaction,
  };
}
