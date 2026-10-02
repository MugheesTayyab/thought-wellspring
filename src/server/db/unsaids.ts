import { getSupabaseAdminClient, getSupabaseAnonClient, type DatabaseEnv } from "./client";
import { fetchEchoesForPost } from "./echoes";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface FeedOptions {
  category?: Category | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
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
  const parsedTime = row.created_at ? new Date(row.created_at).getTime() : 0;
  const createdAt = parsedTime > 1_000_000 ? parsedTime : Date.now();
  return {
    id: row.id,
    text: row.text,
    handle: row.handle ?? null,
    createdAt,
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
    winnerScore: row.winner_score != null ? Number(row.winner_score) : null,
    pinnedUntil: row.pinned_until ? new Date(row.pinned_until).getTime() : null,
  };
}

/**
 * Fetch published feed with optional category filter and pagination
 */
export async function fetchPublishedFeed(
  env?: DatabaseEnv,
  options?: FeedOptions,
): Promise<{ data: Unsaid[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const limit = Math.min(options?.limit ?? 20, 50);
    const offset = options?.offset ?? 0;

    let query = client
      .from("unsaids")
      .select(
        "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, profile_id",
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
  env?: DatabaseEnv,
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

    if (!data) {
      return { data: null, error: null };
    }

    const unsaid = mapRowToUnsaid(data);
    const echoesRes = await fetchEchoesForPost(env, unsaid.id);
    if (echoesRes.data) {
      unsaid.echoes = echoesRes.data;
    }

    return { data: unsaid, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch single post by ID (published or in review)
 */
export async function fetchPostById(
  env: DatabaseEnv | undefined,
  id: string,
): Promise<{ data: Unsaid | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("unsaids")
      .select(
        "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, status",
      )
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
  postData: InsertPostInput,
): Promise<{
  data: { id: string; createdAt: number; status: string } | null;
  error: { code: string; message: string } | null;
}> {
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
  reactionKey: ReactionKey,
): Promise<{
  data: Record<ReactionKey, number> | null;
  error: { code: string; message: string } | null;
}> {
  try {
    const client = getSupabaseAdminClient(env);

    // 1. Primary Path: Atomic single-statement update in PostgreSQL (zero race conditions)
    const { data: rpcData, error: rpcErr } = await client.rpc("increment_reaction_atomic", {
      p_post_id: postId,
      p_reaction_key: reactionKey,
    });

    if (!rpcErr && rpcData) {
      return { data: rpcData as Record<ReactionKey, number>, error: null };
    }

    // 2. Fallback Path: Read-modify-write if RPC is unavailable
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
      return {
        data: null,
        error: { code: "FORBIDDEN", message: "Cannot react to non-published post" },
      };
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
 * Decrement reaction counter with floor at zero
 */
export async function decrementReaction(
  env: DatabaseEnv | undefined,
  postId: string,
  reactionKey: ReactionKey,
): Promise<{
  data: Record<ReactionKey, number> | null;
  error: { code: string; message: string } | null;
}> {
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

    const currentReactions: Record<ReactionKey, number> = post.reactions || {
      heart: 0,
      sad: 0,
      fire: 0,
      hug: 0,
    };

    const currentCount = currentReactions[reactionKey] || 0;
    const updatedReactions: Record<ReactionKey, number> = {
      ...currentReactions,
      [reactionKey]: Math.max(0, currentCount - 1),
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
 * Append veto / report from a device using atomic RPC
 */
export async function appendVeto(
  env: DatabaseEnv | undefined,
  postId: string,
  reporterDeviceToken: string,
): Promise<{
  data: { vetoCount: number; status: string } | null;
  error: { code: string; message: string } | null;
}> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data, error } = await client.rpc("append_veto_atomic", {
      p_post_id: postId,
      p_reporter_device_token: reporterDeviceToken,
    });

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    if (!data.success) {
      return { data: null, error: { code: data.code, message: data.message } };
    }

    return {
      data: {
        vetoCount: data.veto_count,
        status: data.quarantined ? "review" : "published",
      },
      error: null,
    };
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
  windowMinutes: number = 60,
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
  hook: string,
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
      return {
        success: false,
        error: {
          code: "CYCLE_ALREADY_HAS_WINNER",
          message: "Winner already exists for this cycle",
        },
      };
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
    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) },
    };
  }
}

export interface UserThoughtItem {
  id: string;
  text: string;
  category: Category;
  preset: string;
  handle: string | null;
  status: string;
  createdAt: number;
  reactions: { heart: number; sad: number; fire: number; hug: number };
  totalLikes: number;
  echoCount: number;
  echoes: Array<{ id: string; text: string; handle: string | null; createdAt: number }>;
}

export interface UserThoughtsActivityResult {
  posts: UserThoughtItem[];
  totalLikesReceived: number;
  totalPosts: number;
  likedPosts: Unsaid[];
}

/**
 * Fetch all thoughts posted by a user (by profileId and/or deviceToken),
 * including reactions received, total likes, and comments.
 */
export async function fetchUserThoughtsActivity(
  env: DatabaseEnv | undefined,
  params: { profileId?: string | null; deviceToken?: string | null },
): Promise<{
  data: UserThoughtsActivityResult | null;
  error: { code: string; message: string } | null;
}> {
  try {
    const client = getSupabaseAdminClient(env);
    const { profileId, deviceToken } = params;

    let query = client.from("unsaids").select("*");

    if (profileId && deviceToken) {
      query = query.or(`profile_id.eq.${profileId},device_token.eq.${deviceToken}`);
    } else if (profileId) {
      query = query.eq("profile_id", profileId);
    } else if (deviceToken) {
      query = query.eq("device_token", deviceToken);
    } else {
      return {
        data: { posts: [], totalLikesReceived: 0, totalPosts: 0, likedPosts: [] },
        error: null,
      };
    }

    query = query.order("created_at", { ascending: false });
    const { data: rawPosts, error: postErr } = await query;

    if (postErr) {
      return { data: null, error: { code: postErr.code, message: postErr.message } };
    }

    let totalLikesReceived = 0;
    const postIds = (rawPosts || []).map((p: any) => p.id);

    // Fetch echoes for all user posts in bulk
    const echoesByPost: Record<
      string,
      Array<{ id: string; text: string; handle: string | null; createdAt: number }>
    > = {};
    if (postIds.length > 0) {
      const { data: rawEchoes } = await client
        .from("echoes")
        .select("id, unsaid_id, text, handle, created_at")
        .in("unsaid_id", postIds)
        .order("created_at", { ascending: true });

      if (rawEchoes) {
        rawEchoes.forEach((e: any) => {
          if (!echoesByPost[e.unsaid_id]) echoesByPost[e.unsaid_id] = [];
          echoesByPost[e.unsaid_id]!.push({
            id: e.id,
            text: e.text,
            handle: e.handle ?? null,
            createdAt: new Date(e.created_at).getTime(),
          });
        });
      }
    }

    const posts: UserThoughtItem[] = (rawPosts || []).map((row: any) => {
      const rx = row.reactions || { heart: 0, sad: 0, fire: 0, hug: 0 };
      const totalLikes = (rx.heart || 0) + (rx.fire || 0) + (rx.hug || 0) + (rx.sad || 0);
      totalLikesReceived += totalLikes;
      const parsedTime = row.created_at ? new Date(row.created_at).getTime() : Date.now();
      const echoes = echoesByPost[row.id] || [];

      return {
        id: row.id,
        text: row.text,
        category: row.category as Category,
        preset: row.preset || "midnight-static",
        handle: row.handle ?? null,
        status: row.status || "published",
        createdAt: parsedTime,
        reactions: rx,
        totalLikes,
        echoCount: echoes.length,
        echoes,
      };
    });

    // Also fetch posts this user/device has reacted to
    let likedPosts: Unsaid[] = [];
    if (deviceToken) {
      const { data: myRx } = await client
        .from("reactions")
        .select("unsaid_id")
        .eq("device_token", deviceToken)
        .order("created_at", { ascending: false })
        .limit(25);

      if (myRx && myRx.length > 0) {
        const likedIds = Array.from(new Set(myRx.map((r: any) => r.unsaid_id)));
        const { data: likedData } = await client
          .from("unsaids")
          .select(
            "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, profile_id",
          )
          .in("id", likedIds)
          .eq("status", "published");

        if (likedData) {
          likedPosts = likedData.map(mapRowToUnsaid);
        }
      }
    }

    return {
      data: {
        posts,
        totalLikesReceived,
        totalPosts: posts.length,
        likedPosts,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch public profile information and their published thoughts
 */
export async function fetchPublicProfileWithPosts(
  env: DatabaseEnv | undefined,
  identifier: string,
): Promise<{
  data: {
    profile: {
      id: string;
      handle: string;
      avatarSeed: number;
      memberSince: string;
      visitStreak: number;
      warmthTotal: number;
      totalActions: number;
    } | null;
    posts: Unsaid[];
    totalLikesReceived: number;
  } | null;
  error: { code: string; message: string } | null;
}> {
  try {
    const client = getSupabaseAdminClient(env);
    const cleanId = identifier.trim().replace(/^@+/, "");

    // Check if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    let query = client
      .from("profiles")
      .select("id, handle, avatar_seed, member_since, visit_streak, warmth_total, total_actions");
    if (isUuid) {
      query = query.eq("id", cleanId);
    } else {
      query = query.ilike("handle", cleanId);
    }

    const { data: profileRow, error: pErr } = await query.maybeSingle();

    if (pErr) {
      return { data: null, error: { code: pErr.code, message: pErr.message } };
    }

    if (!profileRow) {
      // If no registered profile found, check if there are posts by this handle
      const { data: handlePosts } = await client
        .from("unsaids")
        .select(
          "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, profile_id",
        )
        .ilike("handle", cleanId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!handlePosts || handlePosts.length === 0) {
        return { data: null, error: { code: "NOT_FOUND", message: "Profile not found" } };
      }

      let totalLikesReceived = 0;
      const posts = handlePosts.map((r: any) => {
        const u = mapRowToUnsaid(r);
        const rx = u.reactions;
        totalLikesReceived += (rx.heart || 0) + (rx.fire || 0) + (rx.hug || 0) + (rx.sad || 0);
        return u;
      });

      return {
        data: {
          profile: {
            id: cleanId,
            handle: cleanId,
            avatarSeed: 42,
            memberSince: new Date().toISOString().split("T")[0]!,
            visitStreak: 1,
            warmthTotal: 50,
            totalActions: posts.length,
          },
          posts,
          totalLikesReceived,
        },
        error: null,
      };
    }

    // Found registered profile; fetch their published posts
    const { data: postsData } = await client
      .from("unsaids")
      .select(
        "id, text, handle, category, preset, reactions, veto_count, created_at, pinned_until, profile_id",
      )
      .or(`profile_id.eq.${profileRow.id},handle.ilike.${profileRow.handle}`)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    let totalLikesReceived = 0;
    const posts = (postsData || []).map((r: any) => {
      const u = mapRowToUnsaid(r);
      const rx = u.reactions;
      totalLikesReceived += (rx.heart || 0) + (rx.fire || 0) + (rx.hug || 0) + (rx.sad || 0);
      return u;
    });

    return {
      data: {
        profile: {
          id: profileRow.id,
          handle: profileRow.handle,
          avatarSeed: profileRow.avatar_seed ?? 1,
          memberSince: profileRow.member_since
            ? String(profileRow.member_since)
            : new Date().toISOString().split("T")[0]!,
          visitStreak: profileRow.visit_streak ?? 0,
          warmthTotal: profileRow.warmth_total ?? 0,
          totalActions: profileRow.total_actions ?? 0,
        },
        posts,
        totalLikesReceived,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}
