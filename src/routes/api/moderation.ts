import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn, type ServerFnResult } from "@/server/lib/wrap-server-fn";
import {
  reportPost,
  type ReportPostInput,
} from "@/server/functions/moderation";

export interface ReportPostResponseData {
  reported: boolean;
  message: string;
}

/**
 * Handlers (Directly callable and testable)
 */
export async function handleReportPost(
  data: ReportPostInput
): Promise<ServerFnResult<ReportPostResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    return reportPost(env, data);
  });
}

/**
 * TanStack Start Server Functions
 */
export const apiReportPost = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ReportPostInput }) => {
    return handleReportPost(data);
  });
