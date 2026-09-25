import { getSupabaseAdminClient, type DatabaseEnv } from "./client";
import type { ReactionKey } from "@/shared/types/unsaid";

/**
 * Check whether a device has already reacted with a specific key or any reaction on a post
 */
export async function hasDeviceReacted(
  env: DatabaseEnv | undefined,
  postId: string,
  deviceToken: string,
  reactionKey?: ReactionKey
): Promise<boolean> {
  try {
    const client = getSupabaseAdminClient(env);
    let query = client
      .from("reactions")
      .select("id")
      .eq("unsaid_id", postId)
      .eq("device_token", deviceToken);

    if (reactionKey) {
      query = query.eq("reaction_key", reactionKey);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error("[hasDeviceReacted] Query error:", error.message);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("[hasDeviceReacted] Exception:", err);
    return false;
  }
}

/**
 * Record a reaction deduplication entry
 */
export async function recordReaction(
  env: DatabaseEnv | undefined,
  postId: string,
  deviceToken: string,
  reactionKey: ReactionKey
): Promise<{ success: boolean; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { error } = await client.from("reactions").insert({
      unsaid_id: postId,
      device_token: deviceToken,
      reaction_key: reactionKey,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: { code: "ALREADY_REACTED", message: "Device has already reacted with this emoji" } };
      }
      return { success: false, error: { code: error.code, message: error.message } };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Remove a reaction deduplication entry
 */
export async function removeReaction(
  env: DatabaseEnv | undefined,
  postId: string,
  deviceToken: string,
  reactionKey: ReactionKey
): Promise<{ success: boolean; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { error } = await client
      .from("reactions")
      .delete()
      .eq("unsaid_id", postId)
      .eq("device_token", deviceToken)
      .eq("reaction_key", reactionKey);

    if (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Count reactions by device in rolling window (for rate limiting)
 */
export async function countDeviceReactionsInWindow(
  env: DatabaseEnv | undefined,
  deviceToken: string,
  windowMinutes: number = 60
): Promise<number> {
  try {
    const client = getSupabaseAdminClient(env);
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await client
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("device_token", deviceToken)
      .gte("created_at", windowStart);

    if (error) {
      console.error("[countDeviceReactionsInWindow] Error:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[countDeviceReactionsInWindow] Exception:", err);
    return 0;
  }
}
