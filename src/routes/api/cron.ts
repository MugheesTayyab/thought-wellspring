import { createServerFn } from "@tanstack/react-start";
import type { ServerFnResult } from "@/shared/types/api";
import type { WinnerSelectionResult } from "@/server/jobs/winner-selection";

export const apiTriggerWinnerCron = createServerFn({ method: "POST" })
  .validator((data?: { secret?: string; force?: boolean }) => data)
  .handler(async ({ data }): Promise<ServerFnResult<WinnerSelectionResult>> => {
    const { handleTriggerWinnerSelection } = await import("@/server/handlers/cron");
    return handleTriggerWinnerSelection(data);
  });
