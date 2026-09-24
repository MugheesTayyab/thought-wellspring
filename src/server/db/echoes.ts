import { getSupabaseAdminClient, getSupabaseAnonClient, type DatabaseEnv } from "./client";
import type { Echo } from "@/shared/types/unsaid";

export function mapRowToEcho(row: any): Echo {
  return {
    id: row.id,
    text: row.text,
    handle: row.handle ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    profileId: row.profile_id ?? null,
  };
}

/**
 * Fetch echoes for a confession post in chronological order
 */
export async function fetchEchoesForPost(
  env: DatabaseEnv | undefined,
  postId: string
): Promise<{ data: Echo[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("echoes")
      .select("id, text, handle, created_at, profile_id")
      .eq("unsaid_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      return { data: [], error: { code: error.code, message: error.message } };
    }

    return { data: (data || []).map(mapRowToEcho), error: null };
  } catch (err: any) {
    return { data: [], error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Insert new echo on a confession
 */
export async function insertEcho(
  env: DatabaseEnv | undefined,
  echoData: {
    unsaidId: string;
    text: string;
    handle?: string | null;
    deviceToken: string;
    profileId?: string | null;
  }
): Promise<{ data: { id: string; createdAt: number } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    // Guard: max 50 echoes per confession
    const { count, error: countErr } = await client
      .from("echoes")
      .select("id", { count: "exact", head: true })
      .eq("unsaid_id", echoData.unsaidId);

    if (countErr) {
      return { data: null, error: { code: countErr.code, message: countErr.message } };
    }

    if ((count ?? 0) >= 50) {
      return { data: null, error: { code: "ECHO_LIMIT_REACHED", message: "This confession has reached the maximum of 50 echoes" } };
    }

    const { data, error } = await client
      .from("echoes")
      .insert({
        unsaid_id: echoData.unsaidId,
        text: echoData.text,
        handle: echoData.handle ?? null,
        device_token: echoData.deviceToken,
        profile_id: echoData.profileId ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return {
      data: {
        id: data.id,
        createdAt: new Date(data.created_at).getTime(),
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Count echoes submitted by device in rolling window (for rate limiting)
 */
export async function countDeviceEchoesInWindow(
  env: DatabaseEnv | undefined,
  deviceToken: string,
  windowMinutes: number = 30
): Promise<number> {
  try {
    const client = getSupabaseAdminClient(env);
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await client
      .from("echoes")
      .select("id", { count: "exact", head: true })
      .eq("device_token", deviceToken)
      .gte("created_at", windowStart);

    if (error) {
      console.error("[countDeviceEchoesInWindow] Error:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[countDeviceEchoesInWindow] Exception:", err);
    return 0;
  }
}
