import { createServerFn } from "@tanstack/react-start";
import type {
  DashboardResponseData,
  ModerationActionResponseData,
  AuditLogResponseData,
  ReelReadyResponseData,
} from "@/server/handlers/admin-moderation";

export type {
  DashboardResponseData,
  ModerationActionResponseData,
  AuditLogResponseData,
  ReelReadyResponseData,
};

export const apiFetchReelReadyPosts = createServerFn({ method: "GET" })
  .validator((data?: undefined) => data)
  .handler(async () => {
    const { handleFetchReelReadyPosts } = await import("@/server/handlers/admin-moderation");
    return handleFetchReelReadyPosts();
  });

export const apiRevokeReelConsent = createServerFn({ method: "POST" })
  .validator((data: { postId: string }) => data)
  .handler(async ({ data }) => {
    const { handleRevokeReelConsent } = await import("@/server/handlers/admin-moderation");
    return handleRevokeReelConsent(data);
  });

export const apiFetchModerationDashboard = createServerFn({ method: "GET" })
  .validator((data?: undefined) => data)
  .handler(async () => {
    const { handleFetchModerationDashboard } = await import("@/server/handlers/admin-moderation");
    return handleFetchModerationDashboard();
  });

export const apiExecutePostModeration = createServerFn({ method: "POST" })
  .validator(
    (data: {
      postId: string;
      action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
      reason: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { handleExecutePostModeration } = await import("@/server/handlers/admin-moderation");
    return handleExecutePostModeration(data);
  });

export const apiExecuteEchoModeration = createServerFn({ method: "POST" })
  .validator(
    (data: {
      echoId: string;
      action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
      reason: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { handleExecuteEchoModeration } = await import("@/server/handlers/admin-moderation");
    return handleExecuteEchoModeration(data);
  });

export const apiFetchModerationAuditLog = createServerFn({ method: "GET" })
  .validator((data?: { limit?: number; offset?: number }) => data)
  .handler(async ({ data }) => {
    const { handleFetchModerationAuditLog } = await import("@/server/handlers/admin-moderation");
    return handleFetchModerationAuditLog(data);
  });
