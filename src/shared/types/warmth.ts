export type TierKey = "Ember" | "Flicker" | "Glow" | "Blaze" | "Bonfire";

export interface TierInfo {
  key: TierKey;
  name: string;
  minWarmth: number;
  maxWarmth: number | null;
  colorCss: string;
  glowCss: string;
  orbSizePx: number;
  description: string;
}

export type ActionType =
  | "react"
  | "echo"
  | "post"
  | "share"
  | "duel"
  | "visit"
  | "spend"
  | "daily_bonus";

export interface WarmthLogEntry {
  id: string;
  action: ActionType;
  amount: number;
  label: string;
  timestamp: number;
}

export interface DailyCapState {
  dateKey: string;
  amountEarned: number;
}

export interface StreakState {
  count: number;
  lastVisitDate: string;
}

export interface GiftMilestone {
  threshold: number;
  title: string;
  reward: string;
  badgeEmoji: string;
  claimInstruction: string;
}

export type StoreItemCategory = "feature" | "cosmetic" | "social";

export type StoreItemAction =
  | "deep_read"
  | "pin_post"
  | "new_avatar"
  | "spotlight_nomination"
  | "exclusive_preset"
  | "baji_regular_badge";

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: StoreItemCategory;
  icon: string;
  isLimited?: boolean;
  usesRemaining?: number;
  action: StoreItemAction;
};
