import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { dispatchWinnerPushNotification } from "./push-dispatch";

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
export function getCycleBounds(referenceTime: Date = new Date()): {
  cycleStart: Date;
  cycleEnd: Date;
} {
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
 * Idempotent, with winner selection committed inside PostgreSQL.
 */
export async function executeWinnerSelection(
  env?: DatabaseEnv,
  options?: WinnerSelectionOptions,
): Promise<WinnerSelectionResult> {
  const startTime = Date.now();
  const bounds =
    options?.cycleStart && options?.cycleEnd
      ? { cycleStart: options.cycleStart, cycleEnd: options.cycleEnd }
      : getCycleBounds();
  const { data, error } = await getSupabaseAdminClient(env).rpc("crown_cycle_winner", {
    p_cycle_start: bounds.cycleStart.toISOString(),
    p_cycle_end: bounds.cycleEnd.toISOString(),
    p_triggered_by: options?.triggeredBy || "cron",
  });
  if (error || !data) throw new Error("Winner selection could not complete");
  const result: WinnerSelectionResult = {
    status: data.status,
    postId: data.post_id || null,
    score: data.score == null ? null : Number(data.score),
    hook: data.hook || null,
    category: data.category || null,
    durationMs: Date.now() - startTime,
    source: "postgres_rpc",
  };
  if (
    ["crowned", "already_crowned", "manual_override"].includes(result.status) &&
    result.postId &&
    result.hook
  ) {
    await dispatchWinnerPushNotification(
      {
        winnerId: result.postId,
        hook: result.hook,
        excerpt: "",
        category: result.category || "Silent Thoughts",
        cycleTimestamp: bounds.cycleStart.getTime(),
      },
      env,
    );
  }
  return result;
}
