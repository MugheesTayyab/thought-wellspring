import { useHydrated } from "@/client/hooks/use-hydrated";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/client/lib/query-keys";
import { authHeaders } from "@/client/lib/auth-headers";
import { apiFetchActiveDuel, apiSubmitDuelVote } from "@/routes/api/duels";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { useWarmth } from "@/client/stores/warmth-context";
import { readAnsweredDuels, writeAnsweredDuels } from "@/client/lib/local-storage";
import type { Duel, AnsweredDuelRecord } from "@/shared/types/duel";

export interface UseDuelReturn {
  duel: Duel | null;
  alreadyVoted: boolean;
  userChoice: 0 | 1 | undefined;
  pctA: number;
  pctB: number;
  votesA: number;
  votesB: number;
  isLoading: boolean;
  isVoting: boolean;
  error: Error | null;
  vote: (choiceIndex: 0 | 1) => Promise<void>;
  refetch: () => void;
  answeredCount: number;
  answeredRecord: AnsweredDuelRecord;
}

/**
 * Manages the active community duel, real mathematical vote percentages,
 * and optimistic voting state with warmth award integration.
 * Guaranteed never to freeze indefinitely in loading state.
 */
export function useDuel(): UseDuelReturn {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const { deviceToken } = useDeviceToken();
  const { awardWarmth } = useWarmth();

  const [answeredRecord, setAnsweredRecord] = useState<AnsweredDuelRecord>(() => {
    if (typeof window === "undefined") return {};
    return readAnsweredDuels();
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAnsweredRecord(readAnsweredDuels());
    }
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.duels.active(deviceToken),
    queryFn: async () => {
      const res = await apiFetchActiveDuel({ data: deviceToken ? { deviceToken } : undefined });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const duel: Duel | null = data?.duel ?? null;

  // Determine answered status: server source takes priority, fallback to local storage
  const activeDuelId = duel?.id;
  const localRecord = activeDuelId ? answeredRecord[activeDuelId] : undefined;

  const alreadyVoted = Boolean(data?.alreadyVoted || localRecord !== undefined);
  const userChoice: 0 | 1 | undefined =
    data?.userChoice !== undefined ? data.userChoice : localRecord?.choiceIndex;

  // Vote counts
  const votesA = duel?.votesA ?? 0;
  const votesB = duel?.votesB ?? 0;

  // Mathematical percentage calculation
  const { pctA, pctB } = useMemo(() => {
    const total = votesA + votesB;
    if (total <= 0) return { pctA: 0, pctB: 0 };
    const calculatedA = Math.round((votesA / total) * 100);
    return {
      pctA: calculatedA,
      pctB: 100 - calculatedA,
    };
  }, [votesA, votesB]);

  const voteMutation = useMutation({
    mutationFn: async ({ duelId, choiceIndex }: { duelId: string; choiceIndex: 0 | 1 }) => {
      if (!deviceToken) {
        throw new Error("Your device identity is not ready. Please try again.");
      }
      const res = await apiSubmitDuelVote({
        headers: await authHeaders(),
        data: {
          duelId,
          choiceIndex,
          deviceToken,
        },
      });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onMutate: async ({ duelId, choiceIndex }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.duels.active(deviceToken) });

      const previousDuelData = queryClient.getQueryData(queryKeys.duels.active(deviceToken));

      // Calculate optimistic counts
      const newVotesA = votesA + (choiceIndex === 0 ? 1 : 0);
      const newVotesB = votesB + (choiceIndex === 1 ? 1 : 0);
      const total = newVotesA + newVotesB;
      const optPctA = total > 0 ? Math.round((newVotesA / total) * 100) : 50;
      const optPctB = 100 - optPctA;

      // Update local storage record immediately
      const newRecord: AnsweredDuelRecord = {
        ...answeredRecord,
        [duelId]: {
          choiceIndex,
          pctA: optPctA,
          pctB: optPctB,
          answeredAt: Date.now(),
        },
      };
      setAnsweredRecord(newRecord);
      writeAnsweredDuels(newRecord);

      // Optimistically update query cache
      if (duel) {
        queryClient.setQueryData(queryKeys.duels.active(deviceToken), {
          duel: {
            ...duel,
            votesA: newVotesA,
            votesB: newVotesB,
          },
          alreadyVoted: true,
          userChoice: choiceIndex,
        });
      }

      return { previousDuelData, previousRecord: answeredRecord };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDuelData) {
        queryClient.setQueryData(queryKeys.duels.active(deviceToken), context.previousDuelData);
      }
      if (context?.previousRecord) {
        setAnsweredRecord(context.previousRecord);
        writeAnsweredDuels(context.previousRecord);
      }
    },
    onSuccess: (res) => {
      try {
        awardWarmth("duel", "Chose in a Duel");
      } catch (err) {
        console.warn("[useDuel] Could not award warmth:", err);
      }

      // Update with vote counts
      if (duel && res) {
        queryClient.setQueryData(queryKeys.duels.active(deviceToken), {
          duel: {
            ...duel,
            votesA: res.votesA,
            votesB: res.votesB,
          },
          alreadyVoted: true,
          userChoice: res.choiceIndex,
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.duels.all });
    },
  });

  const vote = async (choiceIndex: 0 | 1) => {
    if (!duel?.id || alreadyVoted || voteMutation.isPending) return;
    try {
      await voteMutation.mutateAsync({ duelId: duel.id, choiceIndex });
    } catch {
      /* Error is rendered below the Duel. */
    }
  };

  return {
    duel,
    alreadyVoted,
    userChoice,
    pctA,
    pctB,
    votesA,
    votesB,
    isLoading,
    isVoting: voteMutation.isPending,
    error: voteMutation.error || (error as Error) || null,
    vote,
    refetch,
    answeredCount: hydrated ? Object.keys(answeredRecord).length : 0,
    answeredRecord,
  };
}
