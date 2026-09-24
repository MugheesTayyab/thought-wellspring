import type { TierInfo, ActionType, GiftMilestone, StoreItem } from "../types/warmth";

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

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "deep_read",
    name: "Deeper Baji Read",
    description: "Unlock the bonus line in your Baji Read — the one that hits harder.",
    cost: 30,
    category: "feature",
    icon: "🔮",
    action: "deep_read",
  },
  {
    id: "pin_post",
    name: "Pin to Category Top",
    description: "Your post stays at the top of its category feed for 2 hours.",
    cost: 50,
    category: "social",
    icon: "📌",
    action: "pin_post",
  },
  {
    id: "new_avatar",
    name: "New Avatar Roll",
    description: "Get a fresh random avatar seed. New look, same soul.",
    cost: 75,
    category: "cosmetic",
    icon: "🎭",
    action: "new_avatar",
  },
  {
    id: "spotlight_nomination",
    name: "Baji Spotlight",
    description: "Your post is nominated for this week's Instagram feature (@bajihears).",
    cost: 100,
    category: "social",
    icon: "✨",
    action: "spotlight_nomination",
  },
  {
    id: "exclusive_preset_aurora",
    name: "Aurora Preset",
    description: "A sharing preset not available in the free set. Limited drop.",
    cost: 200,
    category: "cosmetic",
    icon: "🌌",
    action: "exclusive_preset",
    isLimited: true,
    usesRemaining: 42,
  },
  {
    id: "baji_regular",
    name: "Baji Regular Badge",
    description: "A permanent 👑 badge shown next to your handle on every post.",
    cost: 300,
    category: "social",
    icon: "👑",
    action: "baji_regular_badge",
  },
];
