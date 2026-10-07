import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import type { ServerFnResult } from "@/shared/types/api";
import {
  reportPost,
  type ReportPostInput,
} from "@/server/functions/moderation";

export interface ReportPostResponseData {
  reported: boolean;
  message: string;
}

export async function handleReportPost(
  data: ReportPostInput
): Promise<ServerFnResult<ReportPostResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return reportPost(env, data);
  });
}
