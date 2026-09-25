import { createServerFn } from "@tanstack/react-start";
import type { ReportPostResponseData } from "@/shared/types/api";

export type { ReportPostResponseData };

export interface ReportPostClientInput {
  postId: string;
  reason: string;
  deviceToken: string;
  profileId?: string | null;
}

export const apiReportPost = createServerFn({ method: "POST" })
  .validator((data: ReportPostClientInput) => data)
  .handler(async ({ data }) => {
    const { handleReportPost } = await import("@/server/handlers/moderation");
    return handleReportPost(data);
  });
