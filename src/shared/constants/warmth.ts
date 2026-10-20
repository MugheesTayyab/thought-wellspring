import type { TierInfo, ActionType, GiftMilestone, StoreItem } from "../types/warmth";

export const TIERS: TierInfo[] = [
  {
    key: "Ember",
    name: "Ember",
    minWarmth: 0,
    maxWarmth: 149,
    colorCss: "var(--color-ember, #d65a49)",
    glowCss: "none",
    orbSizePx: 38,
    description: "A small record of participation.",
  },
  {
    key: "Flicker",
    name: "Flicker",
    minWarmth: 150,
    maxWarmth: 599,
    colorCss: "var(--color-flame, #ae4335)",
    glowCss: "none",
    orbSizePx: 40,
    description: "A growing record of participation.",
  },
  {
    key: "Glow",
    name: "Glow",
    minWarmth: 600,
    maxWarmth: 1499,
    colorCss: "var(--primary, #ae4335)",
    glowCss: "none",
    orbSizePx: 42,
    description: "A steady record of participation.",
  },
  {
    key: "Blaze",
    name: "Blaze",
    minWarmth: 1500,
    maxWarmth: 3999,
    colorCss: "var(--primary, #ae4335)",
    glowCss: "none",
    orbSizePx: 44,
    description: "A long-running record of participation.",
  },
  {
    key: "Bonfire",
    name: "Bonfire",
    minWarmth: 4000,
    maxWarmth: null,
    colorCss: "var(--primary, #ae4335)",
    glowCss: "none",
    orbSizePx: 46,
    description: "A long-running record of participation.",
  },
];

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

export const DAILY_PASSIVE_CAP = 50;

// Disabled until fulfillment and product effects exist end to end.
export const GIFT_MILESTONES: GiftMilestone[] = [];
export const STORE_ITEMS: StoreItem[] = [];
