import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import {
  executeWinnerSelection,
  type WinnerSelectionResult,
} from "@/server/jobs/winner-selection";
import type { ServerFnResult } from "@/shared/types/api";

export async function handleTriggerWinnerSelection(data?: {
  secret?: string;
  force?: boolean;
}): Promise<ServerFnResult<WinnerSelectionResult>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();

    // Verify CRON_SECRET if configured in production
    const configuredSecret = (env as any)?.CRON_SECRET || (process.env as any).CRON_SECRET;
    if (configuredSecret && data?.secret !== configuredSecret) {
      const error = new Error("Unauthorized: Invalid CRON_SECRET");
      (error as any).code = "UNAUTHORIZED";
      (error as any).status = 401;
      throw error;
    }

    return executeWinnerSelection(env, {
      triggeredBy: "cron",
      forceRecount: data?.force ?? false,
    });
  });
}
