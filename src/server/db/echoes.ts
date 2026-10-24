import { getSupabaseAdminClient, getSupabaseAnonClient, type DatabaseEnv } from "./client";
import type { Echo } from "@/shared/types/unsaid";

export function mapRowToEcho(row: any): Echo {
  return {
    id: row.id,
    text: row.text,
    handle: row.handle ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    profileId: row.handle ? (row.profile_id ?? null) : null,
  };
}

/**
 * Fetch echoes for a confession post in chronological order
 */
export async function fetchEchoesForPost(
  env: DatabaseEnv | undefined,
  postId: string,
): Promise<{ data: Echo[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("echoes")
      .select("id, text, handle, created_at, profile_id")
      .eq("unsaid_id", postId)
      .eq("status", "published")
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
  },
): Promise<{
  data: { id: string; createdAt: number } | null;
  error: { code: string; message: string } | null;
}> {
  try {
    const client = getSupabaseAdminClient(env);

    const { data, error } = await client.rpc("insert_echo_atomic", {
      p_post_id: echoData.unsaidId,
      p_text: echoData.text,
      p_handle: echoData.handle ?? null,
      p_device_token: echoData.deviceToken,
      p_profile_id: echoData.profileId ?? null,
    });

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

export async function fetchEchoesForPosts(
  env: DatabaseEnv | undefined,
  postIds: string[],
): Promise<{ data: Record<string, Echo[]>; error: { code: string; message: string } | null }> {
  if (postIds.length === 0) return { data: {}, error: null };
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("echoes")
      .select("id, unsaid_id, text, handle, created_at, profile_id")
      .in("unsaid_id", postIds)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) return { data: {}, error: { code: error.code, message: error.message } };

    const grouped: Record<string, Echo[]> = {};
    for (const row of data || []) {
      const postId = row.unsaid_id as string;
      grouped[postId] = [...(grouped[postId] ?? []), mapRowToEcho(row)];
    }
    return { data: grouped, error: null };
  } catch (err: any) {
    return { data: {}, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Persist a reply-level report. The unique constraint prevents one device from
 * repeatedly reporting the same Echo, and authors cannot report their own Echo.
 */
export async function reportEcho(
  env: DatabaseEnv | undefined,
  input: { echoId: string; reporterDeviceToken: string; reason: string },
): Promise<{ data: { reported: true } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client.rpc("report_echo_atomic", {
      p_echo_id: input.echoId,
      p_reporter_device_token: input.reporterDeviceToken,
      p_reason: input.reason || "Community safety concern",
    });

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    if (!data.success) {
      return { data: null, error: { code: data.code, message: data.message } };
    }

    return { data: { reported: true }, error: null };
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
  windowMinutes: number = 30,
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
