import { getSupabaseClient, type DatabaseEnv } from "./client";
import type { WebPushSubscription } from "../lib/web-crypto-push";

export interface AnonymousSubscriptionRecord {
  id?: string;
  device_token: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  is_active?: boolean;
}

export interface PushDeliveryStats {
  totalAttempted: number;
  totalDelivered: number;
  totalFailed: number;
  totalPruned: number;
}

/**
 * Upserts a push subscription for an anonymous device
 */
export async function upsertAnonymousSubscription(
  env: DatabaseEnv | undefined,
  record: AnonymousSubscriptionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient(env);
    const { error } = await supabase
      .from("anonymous_subscriptions")
      .upsert(
        {
          device_token: record.device_token,
          endpoint: record.endpoint,
          p256dh: record.p256dh,
          auth: record.auth,
          user_agent: record.user_agent,
          is_active: true,
          failure_count: 0,
          created_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[PushDB] Error upserting anonymous subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[PushDB] Exception upserting subscription:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches active push subscriptions (both anonymous and profile-linked)
 */
export async function getActiveSubscriptions(
  env: DatabaseEnv | undefined,
  limit = 500,
  offset = 0
): Promise<WebPushSubscription[]> {
  try {
    const supabase = getSupabaseClient(env);

    // 1. Fetch active anonymous subscriptions
    const { data: anonData, error: anonErr } = await supabase
      .from("anonymous_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("is_active", true)
      .range(offset, offset + limit - 1);

    if (anonErr) {
      console.warn("[PushDB] Warning querying anonymous subscriptions:", anonErr.message);
    }

    const subscriptions: WebPushSubscription[] = [];
    const seenEndpoints = new Set<string>();

    if (anonData) {
      for (const row of anonData) {
        if (row.endpoint && row.p256dh && row.auth && !seenEndpoints.has(row.endpoint)) {
          seenEndpoints.add(row.endpoint);
          subscriptions.push({
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          });
        }
      }
    }

    // 2. Fetch authenticated profile push subscriptions
    const { data: profileData, error: profErr } = await supabase
      .from("profiles")
      .select("push_subscription")
      .not("push_subscription", "is", null)
      .range(offset, offset + limit - 1);

    if (!profErr && profileData) {
      for (const row of profileData) {
        const sub = row.push_subscription as WebPushSubscription | null;
        if (sub?.endpoint && sub.keys?.p256dh && sub.keys?.auth && !seenEndpoints.has(sub.endpoint)) {
          seenEndpoints.add(sub.endpoint);
          subscriptions.push(sub);
        }
      }
    }

    return subscriptions;
  } catch (err) {
    console.error("[PushDB] Exception fetching active subscriptions:", err);
    return [];
  }
}

/**
 * Deactivates or prunes a dead endpoint (HTTP 410 or 404 from push server)
 */
export async function deactivateDeadSubscription(
  env: DatabaseEnv | undefined,
  endpoint: string,
  errorReason: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient(env);

    // Soft-deactivate in anonymous_subscriptions
    await supabase
      .from("anonymous_subscriptions")
      .update({
        is_active: false,
        last_error: errorReason,
      })
      .eq("endpoint", endpoint);
  } catch (err) {
    console.error("[PushDB] Failed to deactivate dead subscription:", err);
  }
}

/**
 * Checks if push notification was already dispatched for this cycle window
 */
export async function hasCyclePushDispatched(
  env: DatabaseEnv | undefined,
  cycleTimestamp: number
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient(env);
    const { data, error } = await supabase
      .from("push_delivery_logs")
      .select("id")
      .eq("cycle_timestamp", cycleTimestamp)
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Logs a completed push notification dispatch cycle
 */
export async function logPushDelivery(
  env: DatabaseEnv | undefined,
  cycleTimestamp: number,
  winnerId: string | undefined,
  stats: PushDeliveryStats
): Promise<void> {
  try {
    const supabase = getSupabaseClient(env);
    await supabase.from("push_delivery_logs").insert({
      cycle_timestamp: cycleTimestamp,
      winner_id: winnerId ?? null,
      total_attempted: stats.totalAttempted,
      total_delivered: stats.totalDelivered,
      total_failed: stats.totalFailed,
      total_pruned: stats.totalPruned,
      dispatched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[PushDB] Failed to log push delivery:", err);
  }
}
