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
import {
  fetchFeed,
  fetchWinner,
  submitPost,
  reactToPost,
  unreactToPost,
  addEcho,
  fetchPostById,
  type SubmitPostInput,
  type SubmitPostResult,
} from "@/server/functions/posts";

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

export async function handleUnreactToPost(
  data: {
    postId: string;
    reactionKey: ReactionKey;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<ServerFnResult<ReactResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return unreactToPost(env, data);
  });
}

export async function handleAddEcho(
  data: {
    unsaidId: string;
    text: string;
    deviceToken: string;
    handle?: string | null;
    profileId?: string | null;
  }
): Promise<ServerFnResult<Echo>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return addEcho(env, data);
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

export async function handleFetchUserActivity(data: {
  profileId?: string | null;
  deviceToken: string;
}) {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const { fetchUserThoughtsActivity } = await import("@/server/db/unsaids");
    const res = await fetchUserThoughtsActivity(env, data);
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });
}

export async function handleFetchPublicProfile(data: { identifier: string }) {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const { fetchPublicProfileWithPosts } = await import("@/server/db/unsaids");
    const res = await fetchPublicProfileWithPosts(env, data.identifier);
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });
}

