import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { getServerEnv } from "../lib/get-env";
import { hasCyclePushDispatched } from "../db/push-subscriptions";

export interface WinnerPushPayload {
  winnerId: string;
  hook: string;
  excerpt: string;
  category: string;
  cycleTimestamp: number;
}
export interface PushDispatchResult {
  dispatched: boolean;
  recipientCount: number;
  queuedCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  prunedCount?: number;
  skippedReason?: string;
}

/** Persist fan-out before the worker finishes. The scheduled drain sends every batch. */
export async function dispatchWinnerPushNotification(
  payload: WinnerPushPayload,
  env?: DatabaseEnv,
): Promise<PushDispatchResult> {
  const config = env ?? getServerEnv();
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY)
    return { dispatched: false, recipientCount: 0, skippedReason: "MISSING_VAPID_KEYS" };
  if (await hasCyclePushDispatched(config, payload.cycleTimestamp))
    return { dispatched: true, recipientCount: 0, skippedReason: "ALREADY_DISPATCHED" };
  const { data, error } = await getSupabaseAdminClient(config).rpc("enqueue_winner_push", {
    p_cycle: payload.cycleTimestamp,
    p_payload: {
      title: "A new community pick",
      body: payload.excerpt
        ? payload.excerpt.slice(0, 120)
        : "Read the latest community pick on the Wall.",
      url: "/",
      winnerId: payload.winnerId,
      tag: "bajihears-winner",
    },
  });
  if (error) throw new Error("Winner notifications could not be queued");
  return { dispatched: true, recipientCount: Number(data ?? 0), queuedCount: Number(data ?? 0) };
}
