import { getSupabaseAdminClient, getSupabaseAnonClient, type DatabaseEnv } from "./client";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface FeedOptions {
  category?: Category;
  limit?: number;
  offset?: number;
}

export interface InsertPostInput {
  text: string;
  handle?: string | null;
  deviceToken: string;
  profileId?: string | null;
  category: Category;
  preset?: string;
  status?: "pending" | "published" | "review" | "rejected";
}

export function mapRowToUnsaid(row: any): Unsaid {
  return {
    id: row.id,
    text: row.text,
    handle: row.handle ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    category: row.category as Category,
    preset: row.preset || "midnight-static",
    reactions: row.reactions || { heart: 0, sad: 0, fire: 0, hug: 0 },
    echoes: [],
    status: row.status,
    deviceToken: row.device_token,
    profileId: row.profile_id ?? null,
    vetoCount: row.veto_count ?? 0,
    vetoedBy: row.vetoed_by ?? [],
    isWinner: row.is_winner ?? false,
    winnerCycle: row.winner_cycle ? new Date(row.winner_cycle).getTime() : undefined,
    winnerHook: row.winner_hook ?? null,
    pinnedUntil: row.pinned_until ? new Date(row.pinned_until).getTime() : null,
  };
}

/**
 * Fetch published feed with optional category filter and pagination
 */
export async function fetchPublishedFeed(
  env?: DatabaseEnv,
  options?: FeedOptions
): Promise<{ data: Unsaid[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const limit = Math.min(options?.limit ?? 20, 50);
    const offset = options?.offset ?? 0;

    let query = client
      .from("unsaids")
      .select(
        "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until"
      )
      .eq("status", "published");

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    // Order by created_at DESC (primary feed index)
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      return { data: [], error: { code: error.code, message: error.message } };
    }

    const unsaids = (data || []).map(mapRowToUnsaid);

    // Surface currently pinned posts first in client presentation
    const now = Date.now();
    unsaids.sort((a, b) => {
      const aPinned = a.pinnedUntil && a.pinnedUntil > now ? 1 : 0;
      const bPinned = b.pinnedUntil && b.pinnedUntil > now ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return b.createdAt - a.createdAt;
    });

    return { data: unsaids, error: null };
  } catch (err: any) {
    return { data: [], error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch latest cycle winner
 */
export async function fetchWinner(
  env?: DatabaseEnv
): Promise<{ data: Unsaid | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("unsaids")
      .select("*")
      .eq("is_winner", true)
      .order("winner_cycle", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: data ? mapRowToUnsaid(data) : null, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch single post by ID (published or in review)
 */
export async function fetchPostById(
  env: DatabaseEnv | undefined,
  id: string
): Promise<{ data: Unsaid | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("unsaids")
      .select("id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, status")
      .eq("id", id)
      .in("status", ["published", "review"])
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: data ? mapRowToUnsaid(data) : null, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Insert new post to The Wall
 */
export async function insertPost(
  env: DatabaseEnv | undefined,
  postData: InsertPostInput
): Promise<{ data: { id: string; createdAt: number; status: string } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("unsaids")
      .insert({
        text: postData.text,
        handle: postData.handle ?? null,
        device_token: postData.deviceToken,
        profile_id: postData.profileId ?? null,
        category: postData.category,
        preset: postData.preset || "midnight-static",
        status: postData.status || "published",
        reactions: { heart: 0, sad: 0, fire: 0, hug: 0 },
      })
      .select("id, created_at, status")
      .single();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return {
      data: {
        id: data.id,
        createdAt: new Date(data.created_at).getTime(),
        status: data.status,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Increment reaction counter
 */
export async function incrementReaction(
  env: DatabaseEnv | undefined,
  postId: string,
  reactionKey: ReactionKey
): Promise<{ data: Record<ReactionKey, number> | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    // Fetch current reactions
    const { data: post, error: fetchErr } = await client
      .from("unsaids")
      .select("reactions, status")
      .eq("id", postId)
      .maybeSingle();

    if (fetchErr) {
      return { data: null, error: { code: fetchErr.code, message: fetchErr.message } };
    }
    if (!post) {
      return { data: null, error: { code: "NOT_FOUND", message: "Post not found" } };
    }
    if (post.status !== "published") {
      return { data: null, error: { code: "FORBIDDEN", message: "Cannot react to non-published post" } };
    }

    const currentReactions: Record<ReactionKey, number> = post.reactions || {
      heart: 0,
      sad: 0,
      fire: 0,
      hug: 0,
    };

    const updatedReactions: Record<ReactionKey, number> = {
      ...currentReactions,
      [reactionKey]: (currentReactions[reactionKey] || 0) + 1,
    };

    const { error: updateErr } = await client
      .from("unsaids")
      .update({ reactions: updatedReactions })
      .eq("id", postId);

    if (updateErr) {
      return { data: null, error: { code: updateErr.code, message: updateErr.message } };
    }

    return { data: updatedReactions, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Append veto / report from a device
 */
export async function appendVeto(
  env: DatabaseEnv | undefined,
  postId: string,
  reporterDeviceToken: string
): Promise<{ data: { vetoCount: number; status: string } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data: post, error: fetchErr } = await client
      .from("unsaids")
      .select("device_token, veto_count, vetoed_by, status")
      .eq("id", postId)
      .maybeSingle();

    if (fetchErr) {
      return { data: null, error: { code: fetchErr.code, message: fetchErr.message } };
    }
    if (!post) {
      return { data: null, error: { code: "NOT_FOUND", message: "Post not found" } };
    }

    // Author cannot veto own post
    if (post.device_token === reporterDeviceToken) {
      return { data: null, error: { code: "SELF_VETO_FORBIDDEN", message: "Author cannot report own post" } };
    }

    // Deduplication check
    const vetoedBy: string[] = post.vetoed_by || [];
    if (vetoedBy.includes(reporterDeviceToken)) {
      return { data: null, error: { code: "ALREADY_REPORTED", message: "Device has already reported this post" } };
    }

    const newVetoedBy = [...vetoedBy, reporterDeviceToken];
    const newVetoCount = (post.veto_count ?? 0) + 1;
    const newStatus = newVetoCount >= 5 ? "review" : post.status;

    const { error: updateErr } = await client
      .from("unsaids")
      .update({
        vetoed_by: newVetoedBy,
        veto_count: newVetoCount,
        status: newStatus,
      })
      .eq("id", postId);

    if (updateErr) {
      return { data: null, error: { code: updateErr.code, message: updateErr.message } };
    }

    return { data: { vetoCount: newVetoCount, status: newStatus }, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Count posts by device in the given rolling window (for rate limiting)
 */
export async function countDevicePostsInWindow(
  env: DatabaseEnv | undefined,
  deviceToken: string,
  windowMinutes: number = 60
): Promise<number> {
  try {
    const client = getSupabaseAdminClient(env);
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await client
      .from("unsaids")
      .select("id", { count: "exact", head: true })
      .eq("device_token", deviceToken)
      .gte("created_at", windowStart);

    if (error) {
      console.error("[countDevicePostsInWindow] Error:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[countDevicePostsInWindow] Exception:", err);
    return 0;
  }
}

/**
 * Mark a winner post for a cycle
 */
export async function markWinner(
  env: DatabaseEnv | undefined,
  postId: string,
  cycle: string,
  hook: string
): Promise<{ success: boolean; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    // Idempotency check: did we already crown a winner for this cycle?
    const { data: existing } = await client
      .from("unsaids")
      .select("id")
      .eq("winner_cycle", cycle)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: { code: "CYCLE_ALREADY_HAS_WINNER", message: "Winner already exists for this cycle" } };
    }

    const { error } = await client
      .from("unsaids")
      .update({
        is_winner: true,
        winner_cycle: cycle,
        winner_hook: hook,
      })
      .eq("id", postId);

    if (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}
