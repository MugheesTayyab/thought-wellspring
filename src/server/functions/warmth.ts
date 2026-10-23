import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { fetchProfileById, mapRowToProfile } from "../db/profiles";
import { AWARD_VALUES, STORE_ITEMS } from "@/shared/constants/warmth";

export async function claimDailyBonus(env: DatabaseEnv | undefined, userId: string) {
  const amount = AWARD_VALUES.daily_bonus || 5;
  const { data, error } = await getSupabaseAdminClient(env).rpc("claim_daily_bonus_atomic", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error || !data) throw new Error(error?.message || "Failed to claim bonus");
  const profile = mapRowToProfile(data);
  return {
    warmthTotal: profile.warmthTotal,
    visitStreak: profile.visitStreak,
    lastVisit: profile.lastVisit!,
    bonusAwarded: amount,
    warmthLog: profile.warmthLog,
  };
}

export async function purchaseStoreItem(
  env: DatabaseEnv | undefined,
  userId: string,
  itemId: string,
) {
  const item = STORE_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new Error("Store item does not exist.");
  const { data, error } = await getSupabaseAdminClient(env).rpc("purchase_store_item_atomic", {
    p_user_id: userId,
    p_item_id: itemId,
    p_cost: item.cost,
  });
  if (error || !data) throw new Error(error?.message || "Purchase could not be completed");
  const profile = mapRowToProfile(data);
  return {
    warmthTotal: profile.warmthTotal,
    purchasedItems: profile.purchasedItems,
    purchasedItem: item,
  };
}

/** Browser totals are cosmetic; they must never mint server currency. */
export async function syncWarmth(
  env: DatabaseEnv | undefined,
  input: { deviceToken: string; localWarmth: number; profileId?: string | null },
) {
  if (!input.profileId) return { serverTotal: 0 };
  const profile = await fetchProfileById(env, input.profileId);
  if (profile.error || !profile.data) throw new Error("Profile not found");
  return { serverTotal: profile.data.warmthTotal };
}
