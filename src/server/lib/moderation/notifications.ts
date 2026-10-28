import { getSupabaseAdminClient, type DatabaseEnv } from "../../db/client";
import { getServerEnv } from "../get-env";

export interface ClaimedNotification {
  id: string;
  claim_token: string;
  event_type: "auto_flag" | "post_report" | "echo_report" | "quarantine";
  target_type: "post" | "echo";
  target_id: string;
  preview_text: string;
  category?: string;
  reason?: string;
  priority: "low" | "normal" | "high" | "urgent";
  report_count: number;
  attempts: number;
}

/**
 * Format notification payload for Telegram Bot
 */
function formatTelegramMessage(item: ClaimedNotification): string {
  const icon =
    item.priority === "urgent"
      ? "🚨"
      : item.priority === "high"
        ? "⚠️"
        : item.event_type === "quarantine"
          ? "🔒"
          : "📢";

  const eventTitle =
    item.event_type === "quarantine"
      ? "CONTENT QUARANTINED"
      : item.event_type === "auto_flag"
        ? "AUTOMATED FILTER FLAG"
        : item.target_type === "post"
          ? "POST REPORTED"
          : "ECHO REPORTED";

  const cleanPreview = item.preview_text.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");
  const cleanReason = (item.reason || "Safety concern").replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");
  const cleanCategory = (item.category || "General").replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");

  return (
    `${icon} *BajiHears Trust & Safety*\n` +
    `*Event:* ${eventTitle}\n` +
    `*Type:* ${item.target_type.toUpperCase()} | *Priority:* ${item.priority.toUpperCase()}\n` +
    `*Category:* ${cleanCategory}\n` +
    `*Reports:* ${item.report_count}\n` +
    `*Reason:* ${cleanReason}\n` +
    `*Preview:* "${cleanPreview}"\n\n` +
    `👉 [Open Moderation Dashboard](https://bajihears.app/admin/moderation)`
  );
}

/**
 * Deliver a single notification via configured provider
 */
async function dispatchNotification(
  item: ClaimedNotification,
  env: DatabaseEnv,
): Promise<{ success: boolean; error?: string }> {
  const telegramToken = env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = env.TELEGRAM_CHAT_ID;
  const webhookUrl = env.MODERATION_WEBHOOK_URL;

  // Native email uses an existing verified destination, restricted again to the
  // moderator allowlist. Never put confession text or author identity in email.
  if (env.MODERATION_EMAIL && env.MODERATION_EMAIL_TO) {
    const recipient = env.MODERATION_EMAIL_TO.trim().toLowerCase();
    const approved = (env.MODERATOR_EMAILS || "").split(",").map((v) => v.trim().toLowerCase());
    if (!approved.includes(recipient)) return { success: false, error: "Moderation email recipient is not approved" };
    try {
      await env.MODERATION_EMAIL.send({
        from: "alerts@bajihears.app", to: recipient,
        subject: "BajiHears moderation alert",
        text: `A ${item.priority} priority moderation case needs review.\nAlert: ${item.id}\nOpen the authenticated dashboard: https://bajihears.app/admin/moderation\nNo author identity or thought content is included in this email.`,
      });
      return { success: true };
    } catch {
      return { success: false, error: "Native moderation email delivery failed" };
    }
  }

  // 1. Deliver via Telegram Bot if configured
  if (telegramToken && telegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: formatTelegramMessage(item),
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Telegram HTTP ${response.status}: ${errText.slice(0, 200)}` };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // 2. Deliver via Webhook if configured
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "moderation_alert",
          ...item,
          dashboardUrl: "https://bajihears.app/admin/moderation",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Webhook HTTP ${response.status}` };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // Never claim successful delivery when no provider accepted the alert.
  console.info(
    `[Moderation Notification] External provider not configured. Event '${item.event_type}' for ${item.target_type}:${item.target_id} retained in database queue.`,
  );
  return { success: false, error: "No moderation delivery provider configured" };
}

/**
 * Scheduled queue drain: processes pending moderation alerts
 */
export async function drainModerationNotifications(
  envInput?: DatabaseEnv,
  batchSize: number = 10,
  leaseSeconds: number = 120,
): Promise<{ processed: number; failed: number }> {
  const env = envInput || getServerEnv();
  const telegramConfigured = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  const webhookConfigured = Boolean(env.MODERATION_WEBHOOK_URL);
  const emailConfigured = Boolean(env.MODERATION_EMAIL && env.MODERATION_EMAIL_TO);
  if (!telegramConfigured && !webhookConfigured && !emailConfigured) {
    console.error(
      "[Moderation Notification] External provider not configured; pending alerts remain queued.",
    );
    return { processed: 0, failed: 0 };
  }
  const client = getSupabaseAdminClient(env);

  try {
    const { data, error } = await client.rpc("claim_moderation_notifications", {
      p_batch_size: batchSize,
      p_lease_seconds: leaseSeconds,
    });

    if (error) throw new Error("Moderation queue claim failed");
    if (!data || data.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const items = data as ClaimedNotification[];
    let processed = 0;
    let failed = 0;

    for (const item of items) {
      const result = await dispatchNotification(item, env);

      const { data: completionResult, error: completionError } = await client.rpc(
        "complete_moderation_notification",
        {
          p_id: item.id,
          p_claim_token: item.claim_token,
          p_success: result.success,
          p_error: result.error ?? null,
        },
      );

      if (completionError) {
        console.error(
          `[Moderation Notification] RPC error completing item ${item.id}:`,
          completionError,
        );
      } else if (
        completionResult &&
        typeof completionResult === "object" &&
        !(completionResult as { success?: boolean }).success
      ) {
        const res = completionResult as { code?: string; message?: string };
        console.warn(
          `[Moderation Notification] Lease completion rejected for item ${item.id} (${res.code}): ${res.message}`,
        );
      }

      const acknowledged = !completionError && Boolean(
        completionResult && typeof completionResult === "object" &&
        (completionResult as { success?: boolean }).success,
      );
      if (result.success && acknowledged) {
        processed++;
      } else {
        failed++;
        console.error(
          `[Moderation Notification] Delivery failed for item ${item.id}:`,
          result.error ?? "Delivery was not acknowledged by the queue",
        );
      }
    }

    return { processed, failed };
  } catch (err) {
    console.error("[Moderation Notification] Drain exception:", err);
    return { processed: 0, failed: 1 };
  }
}
