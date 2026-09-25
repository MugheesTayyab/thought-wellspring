import { createServerFn } from "@tanstack/react-start";
import type { Category, Echo, ReactionKey, Unsaid } from "@/shared/types/unsaid";
import type {
  FeedResponseData,
  WinnerResponseData,
  ReactResponseData,
  PostResponseData,
} from "@/shared/types/api";

export type {
  FeedResponseData,
  WinnerResponseData,
  ReactResponseData,
  PostResponseData,
};

export interface SubmitPostClientInput {
  text: string;
  category: Category;
  preset?: string;
  handle?: string | null;
  deviceToken: string;
  profileId?: string | null;
}

export const apiFetchFeed = createServerFn({ method: "GET" })
  .validator((data?: { category?: Category; page?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    const { handleFetchFeed } = await import("@/server/handlers/wall");
    return handleFetchFeed(data);
  });

export const apiFetchWinner = createServerFn({ method: "GET" })
  .handler(async () => {
    const { handleFetchWinner } = await import("@/server/handlers/wall");
    return handleFetchWinner();
  });

export const apiSubmitPost = createServerFn({ method: "POST" })
  .validator((data: SubmitPostClientInput) => data)
  .handler(async ({ data }) => {
    const { handleSubmitPost } = await import("@/server/handlers/wall");
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
    const { handleReactToPost } = await import("@/server/handlers/wall");
    return handleReactToPost(data);
  });

export const apiUnreactToPost = createServerFn({ method: "POST" })
  .validator(
    (data: {
      postId: string;
      reactionKey: ReactionKey;
      deviceToken: string;
      profileId?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const { handleUnreactToPost } = await import("@/server/handlers/wall");
    return handleUnreactToPost(data);
  });

export const apiAddEcho = createServerFn({ method: "POST" })
  .validator(
    (data: {
      unsaidId: string;
      text: string;
      deviceToken: string;
      handle?: string | null;
      profileId?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const { handleAddEcho } = await import("@/server/handlers/wall");
    return handleAddEcho(data);
  });

export const apiFetchPostById = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { handleFetchPostById } = await import("@/server/handlers/wall");
    return handleFetchPostById(data);
  });
