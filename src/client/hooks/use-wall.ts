import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/client/lib/query-keys";
import {
  apiFetchFeed,
  apiSubmitPost,
  apiReactToPost,
  apiUnreactToPost,
  apiAddEcho,
} from "@/routes/api/wall";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import {
  readMyReactions,
  writeMyReactions,
  readMyEchoes,
  writeMyEchoes,
} from "@/client/lib/local-storage";
import type {
  Category,
  ReactionKey,
  Unsaid,
  MyReactions,
  Echo,
} from "@/shared/types/unsaid";
import type { SubmitPostResult } from "@/shared/types/api";

interface FeedPage {
  posts: Unsaid[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UseWallOptions {
  initialCategories?: Category[];
  pageSize?: number;
}

export interface UseWallReturn {
  posts: Unsaid[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  filters: Category[];
  toggleFilter: (category: Category) => void;
  clearFilters: () => void;
  submitPost: (input: {
    text: string;
    category: Category;
    preset?: string;
    handle?: string | null;
  }) => Promise<SubmitPostResult>;
  isSubmitting: boolean;
  submitError: string | null;
  onReact: (postId: string, reactionKey: ReactionKey) => void;
  onEcho: (postId: string, text: string, handle?: string | null) => Promise<void>;
  myReactions: MyReactions;
  myEchoedIds: string[];
  refetch: () => Promise<void>;
}

/**
 * Master hook for The Wall feed: manages infinite scrolling, category filtering,
 * atomic optimistic reaction toggles, optimistic echo submissions, and post creation.
 */
export function useWall(options?: UseWallOptions): UseWallReturn {
  const queryClient = useQueryClient();
  const { deviceToken } = useDeviceToken();
  const pageSize = options?.pageSize ?? 20;

  const [filters, setFilters] = useState<Category[]>(options?.initialCategories ?? []);
  const [myReactions, setMyReactions] = useState<MyReactions>(() => {
    if (typeof window === "undefined") return {};
    return readMyReactions();
  });
  const [myEchoedIds, setMyEchoedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return readMyEchoes();
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMyReactions(readMyReactions());
      setMyEchoedIds(readMyEchoes());
    }
  }, []);

  // Filter actions
  const toggleFilter = useCallback((category: Category) => {
    setFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch: queryRefetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.feed(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const feedOpts: { category?: Category; page?: number; limit?: number } = {
        page: pageParam,
        limit: pageSize,
      };
      if (filters.length === 1 && filters[0]) {
        feedOpts.category = filters[0];
      }
      const res = await apiFetchFeed({ data: feedOpts });
      if (res.ok) {
        return res.data;
      }
      return {
        posts: [],
        page: pageParam,
        limit: pageSize,
        hasMore: false,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 120_000, // 2 minutes
    gcTime: 600_000,    // 10 minutes
  });

  // Flatten posts across pages with client-side filter fallback for multi-category
  const posts = useMemo(() => {
    if (!data?.pages) return [];
    let allPosts = data.pages.flatMap((page) => page.posts);
    if (filters.length > 1) {
      allPosts = allPosts.filter((p) => filters.includes(p.category));
    }
    return allPosts;
  }, [data?.pages, filters]);

  // Infinite scroll IntersectionObserver wiring with cleanup
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reaction mutation with atomic toggle and nested cache patch
  const reactionMutation = useMutation({
    mutationFn: async ({
      postId,
      reactionKey,
      action,
    }: {
      postId: string;
      reactionKey: ReactionKey;
      action: "react" | "unreact";
    }) => {
      if (!deviceToken) throw new Error("No device identity available");
      if (action === "react") {
        const res = await apiReactToPost({
          data: { postId, reactionKey, deviceToken },
        });
        if (!res.ok) throw new Error(res.error.message);
        return res.data;
      } else {
        const res = await apiUnreactToPost({
          data: { postId, reactionKey, deviceToken },
        });
        if (!res.ok) throw new Error(res.error.message);
        return res.data;
      }
    },
    onMutate: async ({ postId, reactionKey, action }) => {
      const feedKey = queryKeys.posts.feed(filters);
      await queryClient.cancelQueries({ queryKey: feedKey });

      const previousFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKey);
      const previousLocalReactions = readMyReactions();

      // 1. Update localStorage synchronously
      const existingForPost = previousLocalReactions[postId] || [];
      const updatedLocalForPost =
        action === "react"
          ? [...existingForPost.filter((k) => k !== reactionKey), reactionKey]
          : existingForPost.filter((k) => k !== reactionKey);

      const updatedLocalMap: MyReactions = {
        ...previousLocalReactions,
        [postId]: updatedLocalForPost,
      };

      setMyReactions(updatedLocalMap);
      writeMyReactions(updatedLocalMap);

      // 2. Immutably patch nested InfiniteData cache
      if (previousFeed?.pages) {
        const delta = action === "react" ? 1 : -1;
        const newFeed: InfiniteData<FeedPage> = {
          ...previousFeed,
          pages: previousFeed.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id !== postId) return post;
              const currentCount = post.reactions?.[reactionKey] || 0;
              const nextCount = Math.max(0, currentCount + delta);
              return {
                ...post,
                reactions: {
                  ...post.reactions,
                  [reactionKey]: nextCount,
                },
              };
            }),
          })),
        };
        queryClient.setQueryData(feedKey, newFeed);
      }

      return { previousFeed, previousLocalReactions };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.posts.feed(filters), context.previousFeed);
      }
      if (context?.previousLocalReactions) {
        setMyReactions(context.previousLocalReactions);
        writeMyReactions(context.previousLocalReactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  const onReact = useCallback(
    (postId: string, reactionKey: ReactionKey) => {
      const activeForPost = myReactions[postId] || [];
      const action = activeForPost.includes(reactionKey) ? "unreact" : "react";
      reactionMutation.mutate({ postId, reactionKey, action });
    },
    [myReactions, reactionMutation]
  );

  // Echo mutation with pending state and rollback
  const echoMutation = useMutation({
    mutationFn: async ({
      postId,
      text,
      handle,
    }: {
      postId: string;
      text: string;
      handle?: string | null;
    }) => {
      if (!deviceToken) throw new Error("No device identity available");
      const echoInput: {
        unsaidId: string;
        text: string;
        deviceToken: string;
        handle?: string | null;
      } = {
        unsaidId: postId,
        text,
        deviceToken,
      };
      if (handle !== undefined) {
        echoInput.handle = handle;
      }
      const res = await apiAddEcho({ data: echoInput });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onMutate: async ({ postId, text, handle }) => {
      const feedKey = queryKeys.posts.feed(filters);
      await queryClient.cancelQueries({ queryKey: feedKey });

      const previousFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKey);
      const previousEchoedIds = readMyEchoes();

      // Optimistic pending echo
      const pendingEcho: Echo = {
        id: `pending-${Date.now()}`,
        text,
        handle: handle ?? null,
        createdAt: Date.now(),
      };

      const updatedEchoedIds = [...new Set([...previousEchoedIds, postId])];
      setMyEchoedIds(updatedEchoedIds);
      writeMyEchoes(updatedEchoedIds);

      if (previousFeed?.pages) {
        const newFeed: InfiniteData<FeedPage> = {
          ...previousFeed,
          pages: previousFeed.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id !== postId) return post;
              return {
                ...post,
                echoes: [...(post.echoes || []), pendingEcho],
              };
            }),
          })),
        };
        queryClient.setQueryData(feedKey, newFeed);
      }

      return { previousFeed, previousEchoedIds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.posts.feed(filters), context.previousFeed);
      }
      if (context?.previousEchoedIds) {
        setMyEchoedIds(context.previousEchoedIds);
        writeMyEchoes(context.previousEchoedIds);
      }
    },
    onSuccess: (serverEcho, { postId }) => {
      const feedKey = queryKeys.posts.feed(filters);
      const currentFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKey);
      if (currentFeed?.pages) {
        const reconciledFeed: InfiniteData<FeedPage> = {
          ...currentFeed,
          pages: currentFeed.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id !== postId) return post;
              const filteredEchoes = (post.echoes || []).filter(
                (e) => !e.id.startsWith("pending-")
              );
              return {
                ...post,
                echoes: [...filteredEchoes, serverEcho],
              };
            }),
          })),
        };
        queryClient.setQueryData(feedKey, reconciledFeed);
      }
    },
  });

  const onEcho = useCallback(
    async (postId: string, text: string, handle?: string | null) => {
      const echoParams: { postId: string; text: string; handle?: string | null } = {
        postId,
        text,
      };
      if (handle !== undefined) {
        echoParams.handle = handle;
      }
      await echoMutation.mutateAsync(echoParams);
    },
    [echoMutation]
  );

  // Post submission mutation
  const submitMutation = useMutation({
    mutationFn: async (input: {
      text: string;
      category: Category;
      preset?: string;
      handle?: string | null;
    }) => {
      if (!deviceToken) throw new Error("No device identity available");
      setSubmitError(null);
      const postPayload: {
        text: string;
        category: Category;
        deviceToken: string;
        preset?: string;
        handle?: string | null;
      } = {
        text: input.text,
        category: input.category,
        deviceToken,
      };

      if (input.preset !== undefined) {
        postPayload.preset = input.preset;
      }
      if (input.handle !== undefined) {
        postPayload.handle = input.handle;
      }

      const res = await apiSubmitPost({ data: postPayload });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onError: (err: Error) => {
      setSubmitError(err.message || "Failed to submit confession.");
    },
    onSuccess: () => {
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });

  const submitPost = useCallback(
    async (input: {
      text: string;
      category: Category;
      preset?: string;
      handle?: string | null;
    }) => {
      return await submitMutation.mutateAsync(input);
    },
    [submitMutation]
  );

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    posts,
    isLoading,
    isFetchingNextPage,
    isError,
    error: (error as Error) || null,
    hasNextPage: Boolean(hasNextPage),
    sentinelRef,
    filters,
    toggleFilter,
    clearFilters,
    submitPost,
    isSubmitting: submitMutation.isPending,
    submitError,
    onReact,
    onEcho,
    myReactions,
    myEchoedIds,
    refetch,
  };
}
