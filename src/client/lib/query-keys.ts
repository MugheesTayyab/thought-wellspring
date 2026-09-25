import type { Category } from "@/shared/types/unsaid";

/**
 * Centralized, type-safe Query Key Factory for TanStack Query.
 * Eliminates typo risk and ensures consistent cache invalidation across all hooks.
 */
export const queryKeys = {
  posts: {
    all: ["posts"] as const,
    feed: (filters?: Category[], sort?: string) =>
      ["posts", "feed", { filters: filters || [], sort: sort || "latest" }] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    winner: () => ["posts", "winner"] as const,
  },
  duels: {
    all: ["duels"] as const,
    active: (deviceToken?: string | null) =>
      ["duels", "active", { deviceToken: deviceToken || null }] as const,
    detail: (id: string) => ["duels", "detail", id] as const,
  },
  warmth: {
    profile: (deviceToken: string) => ["warmth", "profile", deviceToken] as const,
    ledger: (deviceToken: string) => ["warmth", "ledger", deviceToken] as const,
  },
} as const;
