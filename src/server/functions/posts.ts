import { z } from "zod";
import { PRESETS } from "@/shared/constants/presets";
import { getSupabaseAdminClient } from "../db/client";
import type { DatabaseEnv } from "../db/client";
import {
  fetchPublishedFeed,
  fetchWinner as dbFetchWinner,
  fetchPostById as dbFetchPostById,
  insertPost,
} from "../db/unsaids";
import { insertEcho } from "../db/echoes";
import { incrementTotalActions } from "../db/profiles";
import { validateDeviceToken } from "../middleware/device-token";
import { checkRateLimit } from "../middleware/rate-limit";
import { normalizeText } from "../lib/moderation/normalize";
import { checkHardFilters } from "../lib/moderation/hard-filters";
import { checkSoftFilters } from "../lib/moderation/soft-filters";
import { FALLBACK_WINNER } from "../lib/fallback-winner";
import { CATEGORIES } from "@/shared/constants/categories";
import type { Category, Echo, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface SubmitPostInput {
  text: string;
  category: Category;
  preset?: string;
  handle?: string | null;
  deviceToken: string;
  profileId?: string | null;
}

export interface SubmitPostResult {
  id: string;
  status: "published" | "review";
  createdAt: number;
  message?: string;
}

/**
 * Submit confession to The Wall
 */
export async function submitPost(
  env: DatabaseEnv | undefined,
  input: SubmitPostInput,
): Promise<SubmitPostResult> {
  z.object({
    text: z.string(),
    category: z.enum(CATEGORIES),
    handle: z
      .string()
      .trim()
      .max(40)
      .regex(/^@?[a-zA-Z0-9_.-]+$/)
      .nullable()
      .optional(),
    preset: z
      .string()
      .refine((p) => PRESETS.some((x) => x.key === p), "Invalid preset")
      .optional(),
  }).parse(input);
  const token = validateDeviceToken(input.deviceToken);

  const text = input.text?.trim() || "";
  if (text.length < 3) {
    throw new Error("Confession must be at least 3 characters long.");
  }
  if (text.length > 280) {
    throw new Error("Confession must not exceed 280 characters.");
  }

  if (!CATEGORIES.includes(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }

  // 1. Rate limiting: 3 posts per hour
  await checkRateLimit(env, "submit_post", token);

  // 2. Moderation Pipeline Check
  const normalizedPayload = normalizeText(text);

  const hardResult = checkHardFilters(normalizedPayload);
  if (hardResult.blocked) {
    const error = new Error(hardResult.details || "CONTENT_VIOLATION");
    (error as any).code = "CONTENT_VIOLATION";
    throw error;
  }

  const softResult = checkSoftFilters(normalizedPayload);
  const status: "published" | "review" = softResult.flagged ? "review" : "published";

  const safeText = text;

  // 3. Database insert
  const res = await insertPost(env, {
    text: safeText,
    category: input.category,
    preset: input.preset || "midnight-static",
    handle: input.handle ?? null,
    deviceToken: token,
    profileId: input.profileId ?? null,
    status,
  });

  if (res.error || !res.data) {
    throw new Error(res.error?.message || "Failed to create confession");
  }

  // 4. Update profile actions if signed in
  if (input.profileId) {
    await incrementTotalActions(env, input.profileId).catch((err) =>
      console.error("[submitPost] incrementTotalActions error:", err),
    );
  }

  return {
    id: res.data.id,
    status,
    createdAt: res.data.createdAt,
    message:
      status === "review"
        ? "Your post is undergoing community review and will appear soon."
        : "Post published to The Wall.",
  };
}

/**
 * Fetch wall feed with pagination and optional category
 */
export async function fetchFeed(
  env: DatabaseEnv | undefined,
  options?: { category?: Category; page?: number; limit?: number },
): Promise<{ posts: Unsaid[]; page: number; limit: number; hasMore: boolean }> {
  z.object({
    page: z.number().int().min(0).max(10000).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    category: z.enum(CATEGORIES).optional(),
  }).parse(options ?? {});
  const page = Math.max(0, options?.page ?? 0);
  const limit = Math.min(Math.max(1, options?.limit ?? 20), 50);
  const offset = page * limit;

  const res = await fetchPublishedFeed(env, {
    category: options?.category,
    limit: limit + 1, // fetch 1 extra to check hasMore
    offset,
  });

  if (res.error) {
    throw new Error(res.error.message);
  }

  const posts = res.data;
  const hasMore = posts.length > limit;
  const pagePosts = hasMore ? posts.slice(0, limit) : posts;

  return {
    posts: pagePosts,
    page,
    limit,
    hasMore,
  };
}

/**
 * Fetch latest cycle winner with automatic fallback
 */
export async function fetchWinner(
  env?: DatabaseEnv,
): Promise<{ winner: Unsaid; hook: string; isFallback: boolean }> {
  const res = await dbFetchWinner(env);

  if (res.data) {
    return {
      winner: res.data,
      hook: res.data.winnerHook || FALLBACK_WINNER.hook,
      isFallback: false,
    };
  }

  return {
    winner: FALLBACK_WINNER.unsaid,
    hook: FALLBACK_WINNER.hook,
    isFallback: true,
  };
}

/**
 * Fetch post by ID
 */
export async function fetchPostById(
  env: DatabaseEnv | undefined,
  id: string,
): Promise<Unsaid | null> {
  z.string().uuid().parse(id);
  const res = await dbFetchPostById(env, id);
  if (res.error) {
    throw new Error(res.error.message);
  }
  return res.data;
}

/**
 * React to post with rate limiting and deduplication
 */
async function setReaction(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  },
  add: boolean,
): Promise<{ reactions: Record<ReactionKey, number> }> {
  z.string().uuid().parse(input.postId);
  z.enum(["heart", "sad", "fire", "hug"]).parse(input.reactionKey);
  const token = validateDeviceToken(input.deviceToken);
  await checkRateLimit(env, "react", token);
  const { data, error } = await getSupabaseAdminClient(env).rpc("set_reaction_atomic", {
    p_post_id: input.postId,
    p_device_token: token,
    p_reaction_key: input.reactionKey,
    p_add: add,
  });
  if (error || !data) throw new Error(error?.message || "Reaction could not be saved");
  return { reactions: data };
}
export async function reactToPost(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  },
) {
  return setReaction(env, input, true);
}
export async function unreactToPost(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  },
) {
  return setReaction(env, input, false);
}

/**
 * Add echo to confession post with rate limiting and validation
 */
export async function addEcho(
  env: DatabaseEnv | undefined,
  input: {
    unsaidId: string;
    text: string;
    deviceToken: string;
    handle?: string | null;
    profileId?: string | null;
  },
): Promise<Echo> {
  const token = validateDeviceToken(input.deviceToken);

  z.object({
    unsaidId: z.string().uuid(),
    text: z.string(),
    handle: z
      .string()
      .trim()
      .max(40)
      .regex(/^@?[a-zA-Z0-9_.-]+$/)
      .nullable()
      .optional(),
  }).parse(input);
  const text = input.text?.trim() || "";
  if (text.length < 1) {
    throw new Error("Echo cannot be empty.");
  }
  if (text.length > 200) {
    throw new Error("Echo must not exceed 200 characters.");
  }

  // Rate limiting: 10 echoes per 30 minutes
  await checkRateLimit(env, "echo", token);

  // Moderation pipeline check
  const normalizedPayload = normalizeText(text);

  const hardResult = checkHardFilters(normalizedPayload);
  if (hardResult.blocked) {
    const error = new Error(hardResult.details || "CONTENT_VIOLATION");
    (error as any).code = "CONTENT_VIOLATION";
    throw error;
  }

  const softResult = checkSoftFilters(normalizedPayload);
  if (softResult.flagged) {
    throw new Error("Echo was flagged for community review.");
  }

  const safeText = text;

  const res = await insertEcho(env, {
    unsaidId: input.unsaidId,
    text: safeText,
    handle: input.handle ?? null,
    deviceToken: token,
    profileId: input.profileId ?? null,
  });

  if (res.error || !res.data) {
    throw new Error(res.error?.message || "Failed to add echo");
  }

  if (input.profileId) {
    await incrementTotalActions(env, input.profileId).catch((err) =>
      console.error("[addEcho] incrementTotalActions error:", err),
    );
  }

  return {
    id: res.data.id,
    text,
    handle: input.handle ?? null,
    createdAt: res.data.createdAt,
    profileId: input.profileId ?? null,
  };
}
