import { getSupabaseAdminClient, type DatabaseEnv } from "./client";
import type { WarmthLogEntry } from "@/shared/types/warmth";

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
  warmthLog: WarmthLogEntry[];
  purchasedItems: string[];
  tabsUnlocked: {
    duel: boolean;
    read: boolean;
  };
}

export function mapRowToProfile(row: any): DbProfile {
  return {
    id: row.id,
    handle: row.handle,
    avatarSeed: row.avatar_seed ?? 1,
    memberSince: row.member_since ? String(row.member_since) : (new Date().toISOString().split("T")[0] ?? ""),
    deviceToken: row.device_token ?? null,
    visitStreak: row.visit_streak ?? 0,
    lastVisit: row.last_visit ? String(row.last_visit) : null,
    streakFreezeUsed: row.streak_freeze_used ?? false,
    totalActions: row.total_actions ?? 0,
    warmthTotal: row.warmth_total ?? 0,
    warmthLog: Array.isArray(row.warmth_log) ? row.warmth_log : [],
    purchasedItems: Array.isArray(row.purchased_items) ? row.purchased_items : [],
    tabsUnlocked: row.tabs_unlocked || { duel: false, read: false },
  };
}

/**
 * Fetch profile by user ID (auth.users id)
 */
export async function fetchProfileById(
  env: DatabaseEnv | undefined,
  userId: string
): Promise<{ data: DbProfile | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("profiles")
      .select("id, handle, avatar_seed, member_since, visit_streak, last_visit, streak_freeze_used, total_actions, warmth_total, warmth_log, purchased_items, tabs_unlocked")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: data ? mapRowToProfile(data) : null, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch profile by device token
 */
export async function fetchProfileByDeviceToken(
  env: DatabaseEnv | undefined,
  deviceToken: string
): Promise<{ data: { id: string; handle: string } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("profiles")
      .select("id, handle")
      .eq("device_token", deviceToken)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Upsert profile on sign-in
 */
export async function upsertProfile(
  env: DatabaseEnv | undefined,
  profileData: {
    id: string;
    handle: string;
    avatarSeed?: number;
    deviceToken?: string | null;
  }
): Promise<{ data: { id: string } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data, error } = await client
      .from("profiles")
      .upsert(
        {
          id: profileData.id,
          handle: profileData.handle,
          avatar_seed: profileData.avatarSeed ?? 1,
          device_token: profileData.deviceToken ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Increment warmth points and append to warmth log (capped at 50 entries)
 */
export async function incrementWarmth(
  env: DatabaseEnv | undefined,
  userId: string,
  amount: number,
  logEntry: WarmthLogEntry
): Promise<{ data: { warmthTotal: number; warmthLog: WarmthLogEntry[] } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data: current, error: fetchErr } = await client
      .from("profiles")
      .select("warmth_total, warmth_log")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr) {
      return { data: null, error: { code: fetchErr.code, message: fetchErr.message } };
    }
    if (!current) {
      return { data: null, error: { code: "NOT_FOUND", message: "Profile not found" } };
    }

    const newTotal = (current.warmth_total ?? 0) + amount;
    const currentLog: WarmthLogEntry[] = Array.isArray(current.warmth_log) ? current.warmth_log : [];
    // Prepend new entry and cap at 50
    const newLog = [logEntry, ...currentLog].slice(0, 50);

    const { error: updateErr } = await client
      .from("profiles")
      .update({
        warmth_total: newTotal,
        warmth_log: newLog,
      })
      .eq("id", userId);

    if (updateErr) {
      return { data: null, error: { code: updateErr.code, message: updateErr.message } };
    }

    return { data: { warmthTotal: newTotal, warmthLog: newLog }, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Update visit streak and last visit date
 */
export async function updateVisitStreak(
  env: DatabaseEnv | undefined,
  userId: string,
  newStreak: number,
  lastVisitDate: string
): Promise<{ data: { visitStreak: number; lastVisit: string } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { error } = await client
      .from("profiles")
      .update({
        visit_streak: newStreak,
        last_visit: lastVisitDate,
      })
      .eq("id", userId);

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: { visitStreak: newStreak, lastVisit: lastVisitDate }, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Increment total_actions and conditionally unlock tabs
 */
export async function incrementTotalActions(
  env: DatabaseEnv | undefined,
  userId: string
): Promise<{ data: { totalActions: number; tabsUnlocked: { duel: boolean; read: boolean } } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data: current, error: fetchErr } = await client
      .from("profiles")
      .select("total_actions, tabs_unlocked")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr) {
      return { data: null, error: { code: fetchErr.code, message: fetchErr.message } };
    }
    if (!current) {
      return { data: null, error: { code: "NOT_FOUND", message: "Profile not found" } };
    }

    const newTotal = (current.total_actions ?? 0) + 1;
    const currentTabs = current.tabs_unlocked || { duel: false, read: false };
    const newTabs = {
      duel: currentTabs.duel || newTotal >= 3,
      read: currentTabs.read || newTotal >= 5,
    };

    const { error: updateErr } = await client
      .from("profiles")
      .update({
        total_actions: newTotal,
        tabs_unlocked: newTabs,
      })
      .eq("id", userId);

    if (updateErr) {
      return { data: null, error: { code: updateErr.code, message: updateErr.message } };
    }

    return { data: { totalActions: newTotal, tabsUnlocked: newTabs }, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Save Web Push subscription payload
 */
export async function savePushSubscription(
  env: DatabaseEnv | undefined,
  userId: string,
  subscription: any
): Promise<{ success: boolean; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { error } = await client
      .from("profiles")
      .update({ push_subscription: subscription })
      .eq("id", userId);

    if (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}
