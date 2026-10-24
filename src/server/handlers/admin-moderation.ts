import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn } from "@/server/lib/wrap-server-fn";
import { verifyModerator } from "@/server/lib/authorization";
import type { ServerFnResult } from "@/shared/types/api";
import {
  fetchModerationPostQueue,
  fetchModerationEchoQueue,
  fetchModerationCounts,
  executePostModeration,
  executeEchoModeration,
  fetchModerationAuditLog,
  type ModerationQueueItem,
  type ModerationCounts,
  type ModerationAuditEntry,
} from "@/server/db/moderation";
import { z } from "zod";

export interface DashboardResponseData {
  items: ModerationQueueItem[];
  counts: ModerationCounts;
  moderator: {
    userId: string;
    email: string | null;
  };
}

export interface ModerationActionResponseData {
  success: boolean;
  newStatus?: string | undefined;
}

export interface AuditLogResponseData {
  entries: ModerationAuditEntry[];
}

const ActionSchema = z.enum(["approve", "hide", "reject", "restore", "dismiss_reports"]);

export async function handleFetchModerationDashboard(): Promise<
  ServerFnResult<DashboardResponseData>
> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const moderator = await verifyModerator(env);

    const [postQueueRes, echoQueueRes, countsRes] = await Promise.all([
      fetchModerationPostQueue(env, { limit: 100 }),
      fetchModerationEchoQueue(env, { limit: 100 }),
      fetchModerationCounts(env),
    ]);

    if (postQueueRes.error) throw new Error(postQueueRes.error.message);
    if (echoQueueRes.error) throw new Error(echoQueueRes.error.message);
    if (countsRes.error) throw new Error(countsRes.error.message);

    // Merge and sort all items by priority and report count
    const allItems = [...postQueueRes.data, ...echoQueueRes.data].sort((a, b) => {
      // Review items come first
      if (a.status === "review" && b.status !== "review") return -1;
      if (b.status === "review" && a.status !== "review") return 1;
      // High report counts next
      if (b.openReportCount !== a.openReportCount) return b.openReportCount - a.openReportCount;
      return b.createdAt - a.createdAt;
    });

    return {
      items: allItems,
      counts: countsRes.data || {
        unresolvedReports: 0,
        autoFlaggedPosts: 0,
        reportedPublishedPosts: 0,
        reportedEchoes: 0,
        quarantinedContent: 0,
        recentlyResolved24h: 0,
      },
      moderator: {
        userId: moderator.userId,
        email: moderator.email,
      },
    };
  });
}

export async function handleExecutePostModeration(data: {
  postId: string;
  action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
  reason: string;
}): Promise<ServerFnResult<ModerationActionResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const moderator = await verifyModerator(env);

    const postId = z.string().uuid().parse(data.postId);
    const action = ActionSchema.parse(data.action);
    const reason = z
      .string()
      .trim()
      .min(2, "Reason must be at least 2 characters")
      .max(200, "Reason must not exceed 200 characters")
      .parse(data.reason || "Manual moderator action");

    const result = await executePostModeration(env, {
      postId,
      action,
      reason,
      moderatorId: moderator.userId,
    });

    if (result.error || !result.success) {
      throw new Error(result.error?.message || "Failed to execute post moderation action");
    }

    return {
      success: true,
      newStatus: result.newStatus,
    };
  });
}

export async function handleExecuteEchoModeration(data: {
  echoId: string;
  action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
  reason: string;
}): Promise<ServerFnResult<ModerationActionResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const moderator = await verifyModerator(env);

    const echoId = z.string().uuid().parse(data.echoId);
    const action = ActionSchema.parse(data.action);
    const reason = z
      .string()
      .trim()
      .min(2, "Reason must be at least 2 characters")
      .max(200, "Reason must not exceed 200 characters")
      .parse(data.reason || "Manual moderator action");

    const result = await executeEchoModeration(env, {
      echoId,
      action,
      reason,
      moderatorId: moderator.userId,
    });

    if (result.error || !result.success) {
      throw new Error(result.error?.message || "Failed to execute echo moderation action");
    }

    return {
      success: true,
      newStatus: result.newStatus,
    };
  });
}

export async function handleFetchModerationAuditLog(data?: {
  limit?: number;
  offset?: number;
}): Promise<ServerFnResult<AuditLogResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    await verifyModerator(env);

    const result = await fetchModerationAuditLog(env, data);
    if (result.error) throw new Error(result.error.message);

    return {
      entries: result.data,
    };
  });
}
