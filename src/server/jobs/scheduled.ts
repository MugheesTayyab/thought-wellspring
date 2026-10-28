import { getServerEnv, setWorkerEnv } from "../lib/get-env";
import { getSupabaseAdminClient } from "../db/client";
import { executeWinnerSelection } from "./winner-selection";
import { drainPushOutbox } from "./push-outbox";

export async function runScheduledTasks(bindings: unknown): Promise<void> {
  setWorkerEnv(bindings);
  const env = getServerEnv();
  // A failed selection must not stop notifications already in the durable queue.
  try {
    await executeWinnerSelection(env, { triggeredBy: "cron" });
  } catch (error) {
    console.error("[Cron] Winner selection failed", error);
  }
  try {
    await drainPushOutbox(env);
  } catch (error) {
    console.error("[Cron] Push notification drain failed", error);
  }
  try {
    const { drainModerationNotifications } = await import("../lib/moderation/notifications");
    await drainModerationNotifications(env);
  } catch (error) {
    console.error("[Cron] Moderation notification drain failed", error);
  }
  try {
    const { error } = await getSupabaseAdminClient(env).rpc("purge_old_device_actions");
    if (error) console.error("[Cron] Rate limit cleanup failed", error.code);
  } catch (error) {
    console.error("[Cron] Rate limit cleanup failed", error);
  }
}
