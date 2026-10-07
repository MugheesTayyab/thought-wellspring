import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { mapRowToUnsaid } from "../db/unsaids";
import { rankCycleCandidates } from "../lib/scoring";
import { getHookForPost } from "../lib/winner-hooks";
import { dispatchWinnerPushNotification } from "./push-dispatch";
import type { Unsaid } from "@/shared/types/unsaid";

export interface WinnerSelectionOptions {
  cycleStart?: Date | undefined;
  cycleEnd?: Date | undefined;
  triggeredBy?: "cron" | "admin_manual" | "recovery_job" | "api" | undefined;
  forceRecount?: boolean | undefined;
}

export interface WinnerSelectionResult {
  status: "crowned" | "already_crowned" | "manual_override" | "skipped_empty" | "locked" | "error";
  postId?: string | null;
  score?: number | null;
  hook?: string | null;
  category?: string | null;
  durationMs: number;
  message?: string;
  source: "postgres_rpc" | "application_fallback";
}

/**
 * Calculates the exact bounds of the just-closed 12-hour cycle window.
 * Aligned to 00:00 UTC and 12:00 UTC boundaries.
 */
export function getCycleBounds(referenceTime: Date = new Date()): { cycleStart: Date; cycleEnd: Date } {
  const utcHours = referenceTime.getUTCHours();
  const cycleEnd = new Date(referenceTime);
  cycleEnd.setUTCMinutes(0, 0, 0);

  if (utcHours < 12) {
    // Current time is 00:00 - 11:59 UTC -> Closed cycle ended at 00:00 UTC today
    cycleEnd.setUTCHours(0, 0, 0, 0);
  } else {
    // Current time is 12:00 - 23:59 UTC -> Closed cycle ended at 12:00 UTC today
    cycleEnd.setUTCHours(12, 0, 0, 0);
  }

  const cycleStart = new Date(cycleEnd.getTime() - 12 * 3600 * 1000);
  return { cycleStart, cycleEnd };
}

/**
 * Executes 12-hour winner selection and crowning pipeline.
 * Idempotent, concurrency-safe, and dual-layered (Postgres RPC with TypeScript fallback).
 */
export async function executeWinnerSelection(
  env?: DatabaseEnv,
  options?: WinnerSelectionOptions
): Promise<WinnerSelectionResult> {
  const startTime = Date.now();
  const bounds = options?.cycleStart && options?.cycleEnd
    ? { cycleStart: options.cycleStart, cycleEnd: options.cycleEnd }
    : getCycleBounds();

  const cycleStartIso = bounds.cycleStart.toISOString();
  const cycleEndIso = bounds.cycleEnd.toISOString();
  const triggeredBy = options?.triggeredBy || "cron";

  const client = getSupabaseAdminClient(env);

  // Strategy 1: Atomic PostgreSQL Stored Procedure (Recommended Production Path)
  try {
    const { data: rpcData, error: rpcError } = await client.rpc("crown_cycle_winner", {
      p_cycle_start: cycleStartIso,
      p_cycle_end: cycleEndIso,
      p_triggered_by: triggeredBy,
    });

    if (!rpcError && rpcData) {
      const result: WinnerSelectionResult = {
        status: rpcData.status || "crowned",
        postId: rpcData.post_id || null,
        score: rpcData.score != null ? Number(rpcData.score) : null,
        hook: rpcData.hook || null,
        category: rpcData.category || null,
        durationMs: Date.now() - startTime,
        message: rpcData.message,
        source: "postgres_rpc",
      };

      // If a winner was crowned or manually overridden, queue push notifications
      if (result.status === "crowned" && result.postId && result.hook) {
        dispatchWinnerPushNotification({
          winnerId: result.postId,
          hook: result.hook,
          excerpt: "",
          category: result.category || "Confession",
          cycleTimestamp: bounds.cycleStart.getTime(),
        }, env).catch((err) => console.error("[WinnerSelection] Push dispatch error:", err));
      }

      return result;
    }
  } catch (err: any) {
    console.warn(
      `[WinnerSelection] Stored procedure call failed (${err.message}); initiating application scoring fallback.`
    );
  }

  // Strategy 2: Resilient Application-Level Fallback
  // (Executes if migration is pending in local/preview environments)
  try {
    // 1. Idempotency Check: Does a winner already exist for this cycle?
    const { data: existingWinners, error: existErr } = await client
      .from("unsaids")
      .select("id, winner_hook, winner_score, category")
      .eq("is_winner", true)
      .eq("winner_cycle", cycleStartIso)
      .limit(1);

    if (!existErr && existingWinners && existingWinners.length > 0 && existingWinners[0]) {
      const existing = existingWinners[0];
      return {
        status: "already_crowned",
        postId: existing.id,
        score: existing.winner_score ? Number(existing.winner_score) : null,
        hook: existing.winner_hook,
        category: existing.category,
        durationMs: Date.now() - startTime,
        message: "Winner already exists for this cycle window",
        source: "application_fallback",
      };
    }

    // 2. Fetch candidate posts published during the cycle window
    const { data: candidateRows, error: fetchErr } = await client
      .from("unsaids")
      .select("*, echoes(*)")
      .eq("status", "published")
      .gte("created_at", cycleStartIso)
      .lt("created_at", cycleEndIso)
      .or("is_winner.is.null,is_winner.eq.false")
      .lt("veto_count", 3);

    if (fetchErr) {
      throw new Error(`Failed to query cycle candidates: ${fetchErr.message}`);
    }

    const candidates: Unsaid[] = (candidateRows || []).map((row: any) => {
      const unsaid = mapRowToUnsaid(row);
      if (row.echoes && Array.isArray(row.echoes)) {
        unsaid.echoes = row.echoes.map((e: any) => ({
          id: e.id,
          text: e.text,
          handle: e.handle ?? null,
          createdAt: new Date(e.created_at).getTime(),
        }));
      }
      return unsaid;
    });

    // 3. Handle empty cycle
    if (candidates.length === 0) {
      return {
        status: "skipped_empty",
        durationMs: Date.now() - startTime,
        message: "No eligible confessions published in this cycle window",
        source: "application_fallback",
      };
    }

    // 4. Rank candidates using multi-factor scoring and exponential decay
    const ranked = rankCycleCandidates(candidates, bounds.cycleEnd.getTime());
    if (ranked.length === 0) {
      return {
        status: "skipped_empty",
        durationMs: Date.now() - startTime,
        message: "No candidates met minimum engagement threshold",
        source: "application_fallback",
      };
    }

    const topCandidate = ranked[0];
    if (!topCandidate) {
      return {
        status: "skipped_empty",
        durationMs: Date.now() - startTime,
        message: "No candidates available for crowning",
        source: "application_fallback",
      };
    }
    const topPost = topCandidate.post;
    const finalScore = topCandidate.score;
    const hook = getHookForPost(topPost, bounds.cycleStart.getTime());

    // 5. Crown winner in database
    const { error: updateErr } = await client
      .from("unsaids")
      .update({
        is_winner: true,
        winner_cycle: cycleStartIso,
        winner_score: finalScore,
        winner_hook: hook,
      })
      .eq("id", topPost.id);

    if (updateErr) {
      throw new Error(`Failed to update winner post: ${updateErr.message}`);
    }

    // 6. Asynchronously trigger push notification
    dispatchWinnerPushNotification({
      winnerId: topPost.id,
      hook,
      excerpt: topPost.text.slice(0, 120),
      category: topPost.category,
      cycleTimestamp: bounds.cycleStart.getTime(),
    }, env).catch((err) => console.error("[WinnerSelection] Push dispatch error:", err));

    return {
      status: "crowned",
      postId: topPost.id,
      score: finalScore,
      hook,
      category: topPost.category,
      durationMs: Date.now() - startTime,
      source: "application_fallback",
    };
  } catch (err: any) {
    return {
      status: "error",
      durationMs: Date.now() - startTime,
      message: err.message || String(err),
      source: "application_fallback",
    };
  }
}
