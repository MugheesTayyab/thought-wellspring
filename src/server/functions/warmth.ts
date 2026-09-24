import type { DatabaseEnv } from "../db/client";
import {
  fetchProfileById,
  incrementWarmth,
  updateVisitStreak,
} from "../db/profiles";
import { AWARD_VALUES, STORE_ITEMS } from "@/shared/constants/warmth";
import type { WarmthLogEntry } from "@/shared/types/warmth";

/**
 * Claim daily visit warmth and update visit streak
 */
export async function claimDailyBonus(
  env: DatabaseEnv | undefined,
  userId: string
): Promise<{
  warmthTotal: number;
  visitStreak: number;
  lastVisit: string;
  bonusAwarded: number;
  warmthLog: WarmthLogEntry[];
}> {
  const profileRes = await fetchProfileById(env, userId);
  if (profileRes.error || !profileRes.data) {
    throw new Error(profileRes.error?.message || "User profile not found");
  }

  const profile = profileRes.data;
  const todayStr = new Date().toISOString().split("T")[0];

  if (profile.lastVisit === todayStr) {
    throw new Error("Daily bonus has already been claimed today.");
  }

  // Calculate streak continuity
  let newStreak = 1;
  if (profile.lastVisit) {
    const lastDate = new Date(profile.lastVisit).getTime();
    const todayDate = new Date(todayStr).getTime();
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      newStreak = (profile.visitStreak ?? 0) + 1;
    } else if (diffDays > 1) {
      // If gap > 1 day, reset to 1 unless streak freeze is active
      newStreak = profile.streakFreezeUsed ? 1 : Math.max(1, profile.visitStreak);
    }
  }

  await updateVisitStreak(env, userId, newStreak, todayStr);

  const bonusAmount = AWARD_VALUES.daily_bonus || 5;
  const logEntry: WarmthLogEntry = {
    id: `w_daily_${Date.now()}`,
    action: "daily_bonus",
    amount: bonusAmount,
    label: `Day ${newStreak} Visit Bonus`,
    timestamp: Date.now(),
  };

  const warmthRes = await incrementWarmth(env, userId, bonusAmount, logEntry);
  if (warmthRes.error || !warmthRes.data) {
    throw new Error(warmthRes.error?.message || "Failed to award daily warmth");
  }

  return {
    warmthTotal: warmthRes.data.warmthTotal,
    visitStreak: newStreak,
    lastVisit: todayStr,
    bonusAwarded: bonusAmount,
    warmthLog: warmthRes.data.warmthLog,
  };
}

/**
 * Purchase an item from the Warmth Store
 */
export async function purchaseStoreItem(
  env: DatabaseEnv | undefined,
  userId: string,
  itemId: string
): Promise<{
  warmthTotal: number;
  purchasedItems: string[];
  purchasedItem: (typeof STORE_ITEMS)[number];
}> {
  const item = STORE_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    throw new Error(`Store item '${itemId}' does not exist.`);
  }

  const profileRes = await fetchProfileById(env, userId);
  if (profileRes.error || !profileRes.data) {
    throw new Error(profileRes.error?.message || "User profile not found");
  }

  const profile = profileRes.data;

  if (profile.purchasedItems.includes(itemId)) {
    throw new Error(`You have already purchased '${item.name}'.`);
  }

  if (profile.warmthTotal < item.cost) {
    throw new Error(
      `Insufficient warmth. Required: ${item.cost}, Available: ${profile.warmthTotal}`
    );
  }

  const spendEntry: WarmthLogEntry = {
    id: `w_spend_${Date.now()}`,
    action: "spend",
    amount: -item.cost,
    label: `Unlocked: ${item.name}`,
    timestamp: Date.now(),
  };

  // Atomically deduct cost and add spend entry
  const updateRes = await incrementWarmth(env, userId, -item.cost, spendEntry);
  if (updateRes.error || !updateRes.data) {
    throw new Error(updateRes.error?.message || "Failed to process warmth purchase");
  }

  // Update purchased_items array
  const updatedPurchasedItems = [...profile.purchasedItems, itemId];
  const { getSupabaseAdminClient } = await import("../db/client");
  const client = getSupabaseAdminClient(env);
  await client
    .from("profiles")
    .update({ purchased_items: updatedPurchasedItems })
    .eq("id", userId);

  return {
    warmthTotal: updateRes.data.warmthTotal,
    purchasedItems: updatedPurchasedItems,
    purchasedItem: item,
  };
}
