import type { DatabaseEnv } from "../db/client";
import {
  fetchPublishedFeed,
  fetchWinner as dbFetchWinner,
  fetchPostById as dbFetchPostById,
  insertPost,
  incrementReaction,
} from "../db/unsaids";
import { recordReaction, hasDeviceReacted } from "../db/reactions";
import { incrementTotalActions } from "../db/profiles";
import { validateDeviceToken } from "../middleware/device-token";
import { checkRateLimit } from "../middleware/rate-limit";
import { checkServerSpam } from "../lib/spam-filter";
import { FALLBACK_WINNER } from "../lib/fallback-winner";
import { CATEGORIES } from "@/shared/constants/categories";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

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
  input: SubmitPostInput
): Promise<SubmitPostResult> {
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

  // 2. Spam filter check
  const spamCheck = checkServerSpam(text);
  const status: "published" | "review" = spamCheck.passed ? "published" : "review";

  // 3. Database insert
  const res = await insertPost(env, {
    text,
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
      console.error("[submitPost] incrementTotalActions error:", err)
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
  options?: { category?: Category; page?: number; limit?: number }
): Promise<{ posts: Unsaid[]; page: number; limit: number; hasMore: boolean }> {
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
  env?: DatabaseEnv
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
  id: string
): Promise<Unsaid | null> {
  const res = await dbFetchPostById(env, id);
  if (res.error) {
    throw new Error(res.error.message);
  }
  return res.data;
}

/**
 * React to post with rate limiting and deduplication
 */
export async function reactToPost(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<{ reactions: Record<ReactionKey, number> }> {
  const token = validateDeviceToken(input.deviceToken);

  // 1. Rate limiting: 10 reactions per hour
  await checkRateLimit(env, "react", token);

  // 2. Check deduplication: has this device already used this emoji?
  const alreadyReacted = await hasDeviceReacted(env, input.postId, token, input.reactionKey);
  if (alreadyReacted) {
    throw new Error("Device has already submitted this reaction.");
  }

  // 3. Record reaction in deduplication ledger
  const recordRes = await recordReaction(env, input.postId, token, input.reactionKey);
  if (recordRes.error) {
    throw new Error(recordRes.error.message);
  }

  // 4. Increment counter on post
  const counterRes = await incrementReaction(env, input.postId, input.reactionKey);
  if (counterRes.error || !counterRes.data) {
    throw new Error(counterRes.error?.message || "Failed to record reaction");
  }

  // 5. Update user activity if signed in
  if (input.profileId) {
    await incrementTotalActions(env, input.profileId).catch((err) =>
      console.error("[reactToPost] incrementTotalActions error:", err)
    );
  }

  return { reactions: counterRes.data };
}
