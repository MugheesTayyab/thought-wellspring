import type { Category, Echo, ReactionKey, Unsaid } from "@/shared/types/unsaid";
import type {
  FeedResponseData,
  WinnerResponseData,
  ReactResponseData,
  PostResponseData,
  ServerFnResult,
} from "@/shared/types/api";
import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import { cachedPublicRead } from "@/server/lib/edge-cache";
import { verifiedProfileId } from "@/server/lib/authorization";
import { validateDeviceToken } from "@/server/middleware/device-token";
import { z } from "zod";
import { CATEGORIES } from "@/shared/constants/categories";
import { COLLECTIONS, COLLECTION_MIN_POSTS } from "@/shared/constants/collections";
import { renderSitemap, sitemapEntries } from "@/server/lib/sitemap";
import {
  fetchFeed,
  fetchWinner,
  submitPost,
  reactToPost,
  unreactToPost,
  addEcho,
  fetchPostById,
  getEditorialOriginals,
  type SubmitPostInput,
  type SubmitPostResult,
} from "@/server/functions/posts";

export async function handleFetchFeed(data?: {
  category?: Category;
  page?: number;
  limit?: number;
}): Promise<ServerFnResult<FeedResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return fetchFeed(env, data);
  });
}

export async function handleFetchWinner(): Promise<ServerFnResult<WinnerResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    // Identical for every visitor and only changes once per winner cycle (hours),
    // so a short edge cache absorbs traffic bursts without ever showing a wrong
    // winner for more than a few seconds after a cycle rolls over.
    return cachedPublicRead("winner", 20, () => fetchWinner(env));
  });
}

// Server-rendered first paint for crawlers and first-time readers. Separate from
// apiFetchFeed (see edge-cache.ts): this only seeds the page, and any later feed
// refetch still goes to the live uncached endpoint.
export async function handleFetchWallSnapshot(): Promise<
  ServerFnResult<{ feed: FeedResponseData; winner: WinnerResponseData }>
> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return cachedPublicRead("ssr/wall/v1", 30, async () => {
      const [feed, winner] = await Promise.all([
        fetchFeed(env, { page: 0, limit: 20 }),
        fetchWinner(env),
      ]);
      return { feed, winner };
    });
  });
}

export async function handleFetchCollection(data: {
  category: Category;
}): Promise<ServerFnResult<{ posts: Unsaid[] }>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const category = z.enum(CATEGORIES).parse(data.category);
    return cachedPublicRead(`ssr/collection/v1/${encodeURIComponent(category)}`, 60, async () => {
      const { posts } = await fetchFeed(env, { category, page: 0, limit: 50 });
      return { posts };
    });
  });
}

export async function handleSitemap(): Promise<string> {
  const env = getServerEnv();
  const counts = await cachedPublicRead("ssr/sitemap-counts/v1", 3600, async () => {
    const entries = await Promise.all(
      COLLECTIONS.map(async (collection) => {
        const { posts } = await fetchFeed(env, {
          category: collection.category,
          page: 0,
          limit: COLLECTION_MIN_POSTS,
        });
        return [collection.slug, posts.length] as const;
      }),
    );
    return Object.fromEntries(entries);
  }).catch((error: unknown) => {
    // A database blip should still serve the always-indexable pages.
    console.error("[sitemap] collection counts unavailable", error);
    return {};
  });
  return renderSitemap(sitemapEntries(counts));
}

export async function handleSubmitPost(
  data: SubmitPostInput,
): Promise<ServerFnResult<SubmitPostResult>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return submitPost(env, { ...data, profileId: await verifiedProfileId(env) });
  });
}

export async function handleReactToPost(data: {
  postId: string;
  reactionKey: ReactionKey;
  deviceToken: string;
  profileId?: string | null;
}): Promise<ServerFnResult<ReactResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return reactToPost(env, { ...data, profileId: await verifiedProfileId(env) });
  });
}

export async function handleUnreactToPost(data: {
  postId: string;
  reactionKey: ReactionKey;
  deviceToken: string;
  profileId?: string | null;
}): Promise<ServerFnResult<ReactResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return unreactToPost(env, { ...data, profileId: await verifiedProfileId(env) });
  });
}

export async function handleAddEcho(data: {
  unsaidId: string;
  text: string;
  deviceToken: string;
  handle?: string | null;
  profileId?: string | null;
}): Promise<ServerFnResult<Echo>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return addEcho(env, { ...data, profileId: await verifiedProfileId(env) });
  });
}

export async function handleFetchPostById(data: {
  id: string;
}): Promise<ServerFnResult<PostResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const post = await fetchPostById(env, data.id);
    return { post };
  });
}

export async function handleFetchEditorialOriginals(): Promise<ServerFnResult<{ posts: Unsaid[] }>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    // Static seeded reference content with no per-visitor state; safe to cache
    // longer than the winner since it almost never changes.
    return cachedPublicRead("editorial-originals", 60, () => getEditorialOriginals(env));
  });
}

export async function handleFetchUserActivity(data: {
  profileId?: string | null;
  deviceToken: string;
}) {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const { fetchUserThoughtsActivity } = await import("@/server/db/unsaids");
    const deviceToken = validateDeviceToken(data.deviceToken);
    const profileId = await verifiedProfileId(env);
    if (data.profileId && data.profileId !== profileId)
      throw new Error("Unauthorized: This activity belongs to another account.");
    const res = await fetchUserThoughtsActivity(env, { deviceToken, profileId });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });
}

export async function handleFetchPublicProfile(data: { identifier: string }) {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const { fetchPublicProfileWithPosts } = await import("@/server/db/unsaids");
    const identifier = z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^@?[a-zA-Z0-9_.-]+$/, "Invalid profile identifier.")
      .parse(data.identifier);
    const res = await fetchPublicProfileWithPosts(env, identifier);
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });
}
