// Warmth Store Item Catalog and Purchase Engine for BajiHears
// Allows users to spend accumulated Warmth on meaningful social, cosmetic, and feature perks.

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
    usesRemaining: 42, // // LATER: backend — track globally
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

const PURCHASED_ITEMS_KEY = "bh:purchasedItems";

export function getPurchasedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PURCHASED_ITEMS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hasPurchasedItem(itemId: string): boolean {
  return getPurchasedItems().includes(itemId);
}

export function recordPurchase(itemId: string): void {
  if (typeof window === "undefined") return;
  try {
    const items = getPurchasedItems();
    if (!items.includes(itemId)) {
      items.push(itemId);
      localStorage.setItem(PURCHASED_ITEMS_KEY, JSON.stringify(items));
    }
  } catch {
    // quota
  }
}
