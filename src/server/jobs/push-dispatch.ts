import type { DatabaseEnv } from "../db/client";
import { getServerEnv } from "../lib/get-env";
import {
  sendWebPushNotification,
  type VapidDetails,
} from "../lib/web-crypto-push";
import {
  getActiveSubscriptions,
  deactivateDeadSubscription,
  hasCyclePushDispatched,
  logPushDelivery,
} from "../db/push-subscriptions";

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
  deliveredCount?: number;
  failedCount?: number;
  prunedCount?: number;
  skippedReason?: string;
}

/**
 * Dispatches web push notification to all subscribers following a winner crown.
 * Uses native Web Crypto RFC 8291/8292 to batch deliver notifications on Cloudflare Edge.
 */
export async function dispatchWinnerPushNotification(
  payload: WinnerPushPayload,
  env?: DatabaseEnv
): Promise<PushDispatchResult> {
  try {
    const fallback = getServerEnv();
    const publicKey = env?.VAPID_PUBLIC_KEY || fallback.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
    const privateKey = env?.VAPID_PRIVATE_KEY || fallback.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
    const subject = env?.VAPID_SUBJECT || fallback.VAPID_SUBJECT || process.env.VAPID_SUBJECT || "mailto:admin@bajihears.com";

    if (!publicKey || !privateKey) {
      console.warn("[PushDispatch] VAPID keys not configured in environment. Skipping push broadcast.");
      return {
        dispatched: false,
        recipientCount: 0,
        skippedReason: "MISSING_VAPID_KEYS",
      };
    }

    const vapid: VapidDetails = {
      publicKey,
      privateKey,
      subject,
    };

    // 1. Idempotency Check: Prevent duplicate broadcasts for same cycle
    const alreadySent = await hasCyclePushDispatched(env, payload.cycleTimestamp);
    if (alreadySent) {
      console.log(`[PushDispatch] Push already dispatched for cycle ${payload.cycleTimestamp}. Skipping.`);
      return {
        dispatched: true,
        recipientCount: 0,
        skippedReason: "ALREADY_DISPATCHED",
      };
    }

    // 2. Fetch active subscribers
    const subscribers = await getActiveSubscriptions(env, 1000);
    if (subscribers.length === 0) {
      console.log("[PushDispatch] No active push subscribers found.");
      return {
        dispatched: true,
        recipientCount: 0,
        deliveredCount: 0,
      };
    }

    // 3. Format push message payload
    const truncatedExcerpt = payload.excerpt
      ? (payload.excerpt.length > 120 ? `${payload.excerpt.slice(0, 117)}...` : payload.excerpt)
      : "A new confession won the community crown.";

    const messageData = JSON.stringify({
      title: payload.hook || "The new winner is in ✨",
      body: `"${truncatedExcerpt}"`,
      url: `/?winner=${payload.winnerId}`,
      winnerId: payload.winnerId,
      cycleTimestamp: payload.cycleTimestamp,
      tag: "bajihears-winner",
    });

    // 4. Batch dispatch in chunks of 25 to respect edge subrequest limits
    const CHUNK_SIZE = 25;
    let deliveredCount = 0;
    let failedCount = 0;
    let prunedCount = 0;

    for (let i = 0; i < subscribers.length; i += CHUNK_SIZE) {
      const chunk = subscribers.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((sub) => sendWebPushNotification(sub, messageData, vapid))
      );

      for (let idx = 0; idx < results.length; idx++) {
        const res = results[idx];
        const sub = chunk[idx];

        if (res.status === "fulfilled") {
          if (res.value.success) {
            deliveredCount++;
          } else {
            failedCount++;
            if (res.value.isExpired) {
              prunedCount++;
              await deactivateDeadSubscription(env, sub.endpoint, `${res.value.status} ${res.value.statusText}`);
            }
          }
        } else {
          failedCount++;
          console.warn("[PushDispatch] Subrequest error to endpoint:", sub.endpoint, res.reason);
        }
      }
    }

    // 5. Audit log this broadcast cycle
    await logPushDelivery(env, payload.cycleTimestamp, payload.winnerId, {
      totalAttempted: subscribers.length,
      totalDelivered: deliveredCount,
      totalFailed: failedCount,
      totalPruned: prunedCount,
    });

    console.log(
      `[PushDispatch] Broadcast complete: ${deliveredCount}/${subscribers.length} delivered, ${prunedCount} pruned.`
    );

    return {
      dispatched: true,
      recipientCount: subscribers.length,
      deliveredCount,
      failedCount,
      prunedCount,
    };
  } catch (err: any) {
    console.error("[PushDispatch] Fatal error in push broadcast:", err);
    return {
      dispatched: false,
      recipientCount: 0,
      skippedReason: err.message,
    };
  }
}
