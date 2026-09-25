import type { Category, Echo, ReactionKey, Unsaid } from "./unsaid";
import type { WarmthLogEntry } from "./warmth";
import type { STORE_ITEMS } from "../constants/warmth";

export type ServerFnSuccess<T> = {
  ok: true;
  data: T;
};

export type ServerFnFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    statusCode?: number;
  };
};

export type ServerFnResult<T> = ServerFnSuccess<T> | ServerFnFailure;

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

export interface DuelVoteResponseData {
  choiceIndex: 0 | 1;
  votesA: number;
  votesB: number;
}

export interface ClaimBonusResponseData {
  warmthTotal: number;
  visitStreak: number;
  lastVisit: string;
  bonusAwarded: number;
  warmthLog: WarmthLogEntry[];
}

export interface PurchaseStoreItemResponseData {
  warmthTotal: number;
  purchasedItems: string[];
  purchasedItem: (typeof STORE_ITEMS)[number];
}

export interface SubmitPostResult {
  id: string;
  status: "published" | "review";
  createdAt: number;
  message?: string;
}

export interface SavePushSubscriptionResponseData {
  saved: boolean;
}

export interface ReportPostResponseData {
  reported: boolean;
  message: string;
}

export interface MigrateGuestData {
  profile: import("./profile").DbProfile;
}

export interface RefreshProfileData {
  profile: import("./profile").DbProfile;
}


