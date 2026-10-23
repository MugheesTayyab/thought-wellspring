import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { getServerEnv } from "@/server/lib/get-env";
import { executeWinnerSelection, type WinnerSelectionResult } from "@/server/jobs/winner-selection";
import type { ServerFnResult } from "@/shared/types/api";
import { extractBearerJwt } from "@/server/lib/wrap-server-fn";

export async function secretsMatch(expected: string, received: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedHash, receivedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(receivedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index++) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export async function handleTriggerWinnerSelection(data?: {
  force?: boolean;
}): Promise<ServerFnResult<WinnerSelectionResult>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();

    // Verify CRON_SECRET if configured in production
    const configuredSecret = (env as any)?.CRON_SECRET || (process.env as any).CRON_SECRET;
    const presentedSecret = await extractBearerJwt();
    if (
      !configuredSecret ||
      !presentedSecret ||
      !(await secretsMatch(configuredSecret, presentedSecret))
    ) {
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
