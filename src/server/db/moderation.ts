import { getSupabaseAdminClient, type DatabaseEnv } from "./client";

export interface ModerationQueueItem {
  id: string;
  type: "post" | "echo";
  text: string;
  category?: string;
  status: "published" | "review" | "rejected";
  vetoCount: number;
  openReportCount: number;
  uniqueReporters: number;
  echoCount?: number;
  createdAt: number;
  firstReportedAt?: number | null;
  latestReportedAt?: number | null;
  latestReason?: string | null;
  triageBucket: string;
  triagePriority?: string;
  // Echo specific fields:
  parentPostId?: string;
  parentPostText?: string;
  parentPostCategory?: string;
  parentPostStatus?: string;
}

export interface ModerationCounts {
  unresolvedReports: number;
  autoFlaggedPosts: number;
  reportedPublishedPosts: number;
  reportedEchoes: number;
  quarantinedContent: number;
  recentlyResolved24h: number;
}

export interface ModerationAuditEntry {
  id: string;
  targetType: "post" | "echo";
  targetId: string;
  actionType: string;
  performedBy: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  createdAt: number;
}

/**
 * Fetch post queue items needing moderation attention
 */
export async function fetchModerationPostQueue(
  env?: DatabaseEnv,
  options?: { limit?: number; offset?: number },
): Promise<{ data: ModerationQueueItem[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const { data, error } = await client
      .from("moderation_queue")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) {
      return { data: [], error: { code: error.code, message: error.message } };
    }

    const items: ModerationQueueItem[] = (data || []).map((row: any) => ({
      id: row.id,
      type: "post",
      text: row.text,
      category: row.category,
      status: row.status,
      vetoCount: row.veto_count ?? 0,
      openReportCount: row.open_report_count ?? 0,
      uniqueReporters: row.unique_reporters ?? 0,
      echoCount: row.echo_count ?? 0,
      createdAt: new Date(row.created_at).getTime(),
      firstReportedAt: row.first_reported_at ? new Date(row.first_reported_at).getTime() : null,
      latestReportedAt: row.latest_reported_at ? new Date(row.latest_reported_at).getTime() : null,
      latestReason: row.latest_reason ?? null,
      triageBucket: row.triage_bucket ?? "NORMAL",
      triagePriority: row.triage_priority ?? "NORMAL",
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch echo queue items needing moderation attention
 */
export async function fetchModerationEchoQueue(
  env?: DatabaseEnv,
  options?: { limit?: number; offset?: number },
): Promise<{ data: ModerationQueueItem[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const { data, error } = await client
      .from("echo_moderation_queue")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) {
      return { data: [], error: { code: error.code, message: error.message } };
    }

    const items: ModerationQueueItem[] = (data || []).map((row: any) => ({
      id: row.id,
      type: "echo",
      text: row.text,
      category: "Echo Reply",
      status: row.status,
      vetoCount: row.open_report_count ?? 0,
      openReportCount: row.open_report_count ?? 0,
      uniqueReporters: row.unique_reporters ?? 0,
      createdAt: new Date(row.created_at).getTime(),
      firstReportedAt: row.first_reported_at ? new Date(row.first_reported_at).getTime() : null,
      latestReportedAt: row.latest_reported_at ? new Date(row.latest_reported_at).getTime() : null,
      latestReason: row.latest_reason ?? null,
      triageBucket: row.triage_bucket ?? "NORMAL",
      triagePriority: row.status === "review" ? "URGENT: Quarantined Echo" : "NORMAL",
      parentPostId: row.unsaid_id,
      parentPostText: row.parent_post_text,
      parentPostCategory: row.parent_post_category,
      parentPostStatus: row.parent_post_status,
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch database-derived KPI metrics
 */
export async function fetchModerationCounts(
  env?: DatabaseEnv,
): Promise<{ data: ModerationCounts | null; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client.rpc("get_moderation_counts");

    if (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }

    return {
      data: {
        unresolvedReports: data.unresolved_reports ?? 0,
        autoFlaggedPosts: data.auto_flagged_posts ?? 0,
        reportedPublishedPosts: data.reported_published_posts ?? 0,
        reportedEchoes: data.reported_echoes ?? 0,
        quarantinedContent: data.quarantined_content ?? 0,
        recentlyResolved24h: data.recently_resolved_24h ?? 0,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Execute moderation mutation on post
 */
export async function executePostModeration(
  env: DatabaseEnv | undefined,
  input: {
    postId: string;
    action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
    reason: string;
    moderatorId: string;
  },
): Promise<{ success: boolean; newStatus?: string; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client.rpc("moderate_post_atomic", {
      p_post_id: input.postId,
      p_action: input.action,
      p_moderator_id: input.moderatorId,
      p_reason: input.reason,
    });

    if (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }

    if (!data.success) {
      return { success: false, error: { code: data.code, message: data.message } };
    }

    return { success: true, newStatus: data.new_status, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Execute moderation mutation on echo
 */
export async function executeEchoModeration(
  env: DatabaseEnv | undefined,
  input: {
    echoId: string;
    action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
    reason: string;
    moderatorId: string;
  },
): Promise<{ success: boolean; newStatus?: string; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const { data, error } = await client.rpc("moderate_echo_atomic", {
      p_echo_id: input.echoId,
      p_action: input.action,
      p_moderator_id: input.moderatorId,
      p_reason: input.reason,
    });

    if (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }

    if (!data.success) {
      return { success: false, error: { code: data.code, message: data.message } };
    }

    return { success: true, newStatus: data.new_status, error: null };
  } catch (err: any) {
    return { success: false, error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}

/**
 * Fetch immutable moderation audit log for admin review
 */
export async function fetchModerationAuditLog(
  env?: DatabaseEnv,
  options?: { limit?: number; offset?: number },
): Promise<{ data: ModerationAuditEntry[]; error: { code: string; message: string } | null }> {
  try {
    const client = getSupabaseAdminClient(env);
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const { data, error } = await client
      .from("moderation_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { data: [], error: { code: error.code, message: error.message } };
    }

    const entries: ModerationAuditEntry[] = (data || []).map((row: any) => ({
      id: row.id,
      targetType: row.target_type ?? (row.echo_id ? "echo" : "post"),
      targetId: row.echo_id ?? row.unsaid_id ?? "unknown",
      actionType: row.action_type,
      performedBy: row.performed_by,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      reason: row.reason,
      createdAt: new Date(row.created_at).getTime(),
    }));

    return { data: entries, error: null };
  } catch (err: any) {
    return { data: [], error: { code: "UNEXPECTED_ERROR", message: err.message || String(err) } };
  }
}
