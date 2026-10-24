import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/client/lib/query-keys";
import { apiFetchEditorialOriginals } from "@/routes/api/wall";
import type { Unsaid } from "@/shared/types/unsaid";

export interface UseEditorialOriginalsReturn {
  originals: Unsaid[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the 30 BajiHears Originals in strict CSV display order.
 */
export function useEditorialOriginals(): UseEditorialOriginalsReturn {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.posts.originals(),
    queryFn: async () => {
      const res = await apiFetchEditorialOriginals();
      if (!res.ok) {
        throw new Error(res.error.message);
      }
      return res.data.posts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    originals: data ?? [],
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch: async () => {
      await refetch();
    },
  };
}
