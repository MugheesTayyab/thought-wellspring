import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn, type ServerFnResult } from "@/server/lib/wrap-server-fn";
import {
  fetchFeed,
  fetchWinner,
  submitPost,
  reactToPost,
  fetchPostById,
  type SubmitPostInput,
  type SubmitPostResult,
} from "@/server/functions/posts";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface FeedResponseData {
  posts: Unsaid[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface WinnerResponseData {
  winner: Unsaid;
  hook: string;
  isFallback: boolean;
}

export interface ReactResponseData {
  reactions: Record<ReactionKey, number>;
}

export interface PostResponseData {
  post: Unsaid | null;
}

/**
 * Handlers (Directly callable and testable)
 */
export async function handleFetchFeed(
  data?: { category?: Category; page?: number; limit?: number }
): Promise<ServerFnResult<FeedResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return fetchFeed(env, data);
  });
}

export async function handleFetchWinner(): Promise<ServerFnResult<WinnerResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return fetchWinner(env);
  });
}

export async function handleSubmitPost(
  data: SubmitPostInput
): Promise<ServerFnResult<SubmitPostResult>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return submitPost(env, data);
  });
}

export async function handleReactToPost(
  data: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<ServerFnResult<ReactResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return reactToPost(env, data);
  });
}

export async function handleFetchPostById(
  data: { id: string }
): Promise<ServerFnResult<PostResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const post = await fetchPostById(env, data.id);
    return { post };
  });
}

/**
 * TanStack Start Server Functions
 */
export const apiFetchFeed = createServerFn({ method: "GET" })
  .validator((data?: { category?: Category; page?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    return handleFetchFeed(data);
  });

export const apiFetchWinner = createServerFn({ method: "GET" })
  .handler(async () => {
    return handleFetchWinner();
  });

export const apiSubmitPost = createServerFn({ method: "POST" })
  .validator((data: SubmitPostInput) => data)
  .handler(async ({ data }) => {
    return handleSubmitPost(data);
  });

export const apiReactToPost = createServerFn({ method: "POST" })
  .validator(
    (data: {
      postId: string;
      reactionKey: ReactionKey;
      deviceToken: string;
      profileId?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    return handleReactToPost(data);
  });

export const apiFetchPostById = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return handleFetchPostById(data);
  });
