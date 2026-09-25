export type BajiIdentity = {
  handle: string; // e.g. "chaiwala_99", "raat_ki_baat_42"
  avatarSeed: number; // integer 1–500, maps to a pre-generated avatar set
  memberSince: string; // ISO date string "2025-01-15"
  deviceToken: string; // 16-char random hex, used as pseudonymous device ID
  visitStreak: number; // consecutive daily visits, resets if gap > 48h
  lastVisit: string; // YYYY-MM-DD of last visit
  streakFreezeUsed: boolean; // whether user has used their one streak freeze
  totalActions: number; // incremented on every reaction, echo, post, duel vote
  tabsUnlocked: {
    duel: boolean; // unlocks at totalActions >= 3
    read: boolean; // unlocks at totalActions >= 5
  };
};

export type StreakMilestone = {
  days: number;
  reward: string;
  label: string;
};

export interface DbProfile {
  id: string;
  handle: string;
  avatarSeed: number;
  memberSince: string;
  deviceToken: string | null;
  visitStreak: number;
  lastVisit: string | null;
  streakFreezeUsed: boolean;
  totalActions: number;
  warmthTotal: number;
  warmthLog: import("./warmth").WarmthLogEntry[];
  purchasedItems: string[];
  tabsUnlocked: {
    duel: boolean;
    read: boolean;
  };
}

