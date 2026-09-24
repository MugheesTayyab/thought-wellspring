// Pure logic, state helpers & constants for BajiHears Warmth Points system.
// Everything is client-side / localStorage based for anonymous MVP.

export type TierKey = "Ember" | "Flicker" | "Glow" | "Blaze" | "Bonfire";

export interface TierInfo {
  key: TierKey;
  name: string;
  minWarmth: number;
  maxWarmth: number | null;
  colorCss: string; // Tailwind / CSS color identifier
  glowCss: string; // Box-shadow or drop-shadow styling
  orbSizePx: number;
  description: string;
}

export const TIERS: TierInfo[] = [
  {
    key: "Ember",
    name: "Ember",
    minWarmth: 0,
    maxWarmth: 149,
    colorCss: "var(--color-ember, #ff6b4a)",
    glowCss: "0 0 16px rgba(255, 107, 74, 0.4)",
    orbSizePx: 38,
    description: "A faint spark waiting for a breath.",
  },
  {
    key: "Flicker",
    name: "Flicker",
    minWarmth: 150,
    maxWarmth: 599,
    colorCss: "var(--color-flame, #ff8533)",
    glowCss: "0 0 22px rgba(255, 133, 51, 0.5)",
    orbSizePx: 44,
    description: "Steady light, catching the evening air.",
  },
  {
    key: "Glow",
    name: "Glow",
    minWarmth: 600,
    maxWarmth: 1499,
    colorCss: "var(--primary, #fa541c)",
    glowCss: "0 0 28px rgba(250, 84, 28, 0.65)",
    orbSizePx: 50,
    description: "Radiant warmth spreading to nearby hearts.",
  },
  {
    key: "Blaze",
    name: "Blaze",
    minWarmth: 1500,
    maxWarmth: 3999,
    colorCss: "#ff3b30",
    glowCss: "0 0 36px rgba(255, 59, 48, 0.75)",
    orbSizePx: 56,
    description: "A passionate flame impossible to ignore.",
  },
  {
    key: "Bonfire",
    name: "Bonfire",
    minWarmth: 4000,
    maxWarmth: null,
    colorCss: "#ff2a6d",
    glowCss: "0 0 48px rgba(255, 42, 109, 0.85), 0 0 80px rgba(250, 84, 28, 0.4)",
    orbSizePx: 64,
    description: "A beacon visible across the entire wall.",
  },
];

export function getTier(totalWarmth: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (t && totalWarmth >= t.minWarmth) {
      return t;
    }
  }
  return TIERS[0]!;
}

export function getNextTier(totalWarmth: number): {
  nextTier: TierInfo | null;
  remaining: number;
  progressPct: number;
} {
  const currentTier = getTier(totalWarmth);
  const currentIndex = TIERS.findIndex((t) => t.key === currentTier.key);

  if (currentIndex < 0 || currentIndex >= TIERS.length - 1) {
    return { nextTier: null, remaining: 0, progressPct: 100 };
  }

  const nextTier = TIERS[currentIndex + 1];
  if (!nextTier) {
    return { nextTier: null, remaining: 0, progressPct: 100 };
  }

  const range = nextTier.minWarmth - currentTier.minWarmth;
  const currentProgress = totalWarmth - currentTier.minWarmth;
  const progressPct = Math.min(100, Math.max(0, (currentProgress / range) * 100));
  const remaining = nextTier.minWarmth - totalWarmth;

  return { nextTier, remaining, progressPct };
}

import { getOrCreateIdentity } from "./identity";

export type ActionType =
  "react" | "echo" | "post" | "share" | "duel" | "visit" | "spend" | "daily_bonus";

export const AWARD_VALUES: Record<ActionType, number> = {
  react: 1,
  echo: 3,
  post: 10,
  share: 5,
  duel: 2,
  visit: 2,
  spend: 0,
  daily_bonus: 5,
};

// Daily passive action cap (applies to react and duel)
export const DAILY_PASSIVE_CAP = 50;

export interface GiftMilestone {
  threshold: number;
  title: string;
  reward: string;
  badgeEmoji: string;
  claimInstruction: string;
}

export const GIFT_MILESTONES: GiftMilestone[] = [
  {
    threshold: 100,
    title: "Quiet Supporter",
    reward: "Exclusive Ember Badge & High-Res Aesthetic Wallpapers",
    badgeEmoji: "🪵",
    claimInstruction: "DM @bajihears on Instagram with code to claim your digital wallpaper pack!",
  },
  {
    threshold: 500,
    title: "Tea Keeper",
    reward: "Featured Post Slot & Custom Presets",
    badgeEmoji: "☕",
    claimInstruction: "DM @bajihears with your code to get your Unsaid featured at peak hours!",
  },
  {
    threshold: 1500,
    title: "Flame Keeper",
    reward: "Early Access to Private Rooms & Physical Sticker Pack",
    badgeEmoji: "🔥",
    claimInstruction:
      "DM @bajihears with your code for free shipping of BajiHears holographic stickers!",
  },
  {
    threshold: 5000,
    title: "Warmth Legend",
    reward: "Permanent Golden Halo on Wall & Custom Call-Sign Color",
    badgeEmoji: "👑",
    claimInstruction: "DM @bajihears with your code to lock in your custom legend profile style!",
  },
];

export function generateClaimCode(threshold: number, deviceToken: string): string {
  const hashStr = `${threshold}-${deviceToken}-baji-warmth`;
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    hash = (hash << 5) - hash + hashStr.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
  return `BH-${threshold}-${hex}`;
}

/**
 * Generates a realistic split percentage for duel answers.
 * Skews towards user's choice (55-72%), ensuring sum = 100%.
 */
export function generateSplit(chosenOptionIndex: 0 | 1): { pctA: number; pctB: number } {
  const chosenPct = Math.floor(Math.random() * 18) + 55; // 55 to 72%
  const otherPct = 100 - chosenPct;
  return chosenOptionIndex === 0
    ? { pctA: chosenPct, pctB: otherPct }
    : { pctA: otherPct, pctB: chosenPct };
}

/**
 * Helper to get today's date string key (YYYY-MM-DD)
 */
export function getTodayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function claimDailyBonus(): { claimed: boolean; amount: number } {
  if (typeof window === "undefined") return { claimed: false, amount: 0 };
  const today = getTodayKey();
  const lastClaim = localStorage.getItem("bh:lastDailyBonus");
  if (lastClaim === today) return { claimed: false, amount: 0 };

  const streak = getOrCreateIdentity().visitStreak;
  let amount = 5;
  if (streak >= 7) amount = 15;
  if (streak >= 14) amount = 25;
  if (streak >= 30) amount = 50;

  try {
    localStorage.setItem("bh:lastDailyBonus", today);
  } catch {
    // quota
  }
  return { claimed: true, amount };
}
