import { getSupabaseAdminClient, getSupabaseAnonClient, type DatabaseEnv } from "./client";
import type { Duel } from "@/shared/types/duel";

export function mapRowToDuel(row: any): Duel {
  return {
    id: row.id,
    format: row.format,
    prompt: row.prompt ?? undefined,
    optionA: {
      id: `${row.id}_a`,
      text: row.option_a_text,
      category: row.option_a_category ?? undefined,
      handle: row.option_a_handle ?? null,
    },
    optionB: {
      id: `${row.id}_b`,
      text: row.option_b_text,
      category: row.option_b_category ?? undefined,
      handle: row.option_b_handle ?? null,
    },
    votesA: row.votes_a ?? 0,
    votesB: row.votes_b ?? 0,
    active: row.active ?? true,
  };
}

/**
 * Fetch the currently active duel
 */
export async function fetchActiveDuel(
  env?: DatabaseEnv
): Promise<{ data: Duel | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("duels")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: data ? mapRowToDuel(data) : null, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch duel by ID
 */
export async function fetchDuelById(
  env: DatabaseEnv | undefined,
  duelId: string
): Promise<{ data: Duel | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAnonClient(env);
    const { data, error } = await client
      .from("duels")
      .select("*")
      .eq("id", duelId)
      .maybeSingle();

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return { data: data ? mapRowToDuel(data) : null, error: null };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Check whether device has already voted on a duel
 */
export async function hasDeviceVotedOnDuel(
  env: DatabaseEnv | undefined,
  duelId: string,
  deviceToken: string
): Promise<{ voted: boolean; choiceIndex?: 0 | 1 }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client
      .from("duel_votes")
      .select("choice_index")
      .eq("duel_id", duelId)
      .eq("device_token", deviceToken)
      .maybeSingle();

    if (error || !data) {
      return { voted: false };
    }

    return { voted: true, choiceIndex: data.choice_index as 0 | 1 };
  } catch (err) {
    console.error("[hasDeviceVotedOnDuel] Exception:", err);
    return { voted: false };
  }
}

/**
 * Record a duel vote and increment the option tally
 */
export async function recordDuelVote(
  env: DatabaseEnv | undefined,
  duelId: string,
  deviceToken: string,
  choiceIndex: 0 | 1
): Promise<{ data: { choiceIndex: 0 | 1; votesA: number; votesB: number } | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);

    // 1. Insert vote record (unique constraint enforces single vote per device)
    const { error: insertErr } = await client.from("duel_votes").insert({
      duel_id: duelId,
      device_token: deviceToken,
      choice_index: choiceIndex,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return { data: null, error: { code: "ALREADY_VOTED", message: "You have already voted on this duel" } };
      }
      return { data: null, error: { code: insertErr.code, message: insertErr.message } };
    }

    // 2. Fetch current votes and increment
    const { data: duel, error: fetchErr } = await client
      .from("duels")
      .select("votes_a, votes_b")
      .eq("id", duelId)
      .single();

    if (fetchErr || !duel) {
      return { data: null, error: { code: "DUEL_NOT_FOUND", message: "Duel not found" } };
    }

    const newVotesA = choiceIndex === 0 ? (duel.votes_a ?? 0) + 1 : (duel.votes_a ?? 0);
    const newVotesB = choiceIndex === 1 ? (duel.votes_b ?? 0) + 1 : (duel.votes_b ?? 0);

    const { error: updateErr } = await client
      .from("duels")
      .update({
        votes_a: newVotesA,
        votes_b: newVotesB,
      })
      .eq("id", duelId);

    if (updateErr) {
      return { data: null, error: { code: updateErr.code, message: updateErr.message } };
    }

    return {
      data: {
        choiceIndex,
        votesA: newVotesA,
        votesB: newVotesB,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}
