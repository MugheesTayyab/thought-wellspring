import { getSupabaseAdminClient } from "../../db/client";
import { getServerEnv } from "../get-env";

async function signatureFor(error: unknown): Promise<string> {
  const name = error instanceof Error ? error.name : "NonError";
  const firstFrame =
    error instanceof Error && error.stack ? (error.stack.split("\n")[1]?.trim().slice(0, 120) ?? "") : "";
  const raw = `${name}:${firstFrame}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${name}_${hex.slice(0, 12)}`;
}

/**
 * Surfaces a repeated UNEXPECTED_ERROR to the existing, already-verified moderation
 * email channel, at most once per error signature per cooldown window (atomic, see
 * claim_operational_alert). Never includes request content, user data, or raw error
 * text/stack bodies — only a stable signature an operator can grep for in
 * `wrangler tail` output. Must never throw: alerting failures stay invisible to the
 * caller, which already has its own error response to return.
 *
 * Call sites: wrapServerFn's catch (covers every server function handler) and
 * server.ts's h3-swallowed-SSR-error fallback. Both are awaited by their caller
 * before the response returns, so the alert is sent (or the attempt made) before
 * the Workers execution context can be torn down.
 */
export async function reportOperationalError(error: unknown): Promise<void> {
  try {
    const env = getServerEnv();
    if (!env.MODERATION_EMAIL || !env.MODERATION_EMAIL_TO) return;
    const recipient = env.MODERATION_EMAIL_TO.trim().toLowerCase();
    const approved = (env.MODERATOR_EMAILS || "")
      .split(",")
      .map((v) => v.trim().toLowerCase());
    if (!approved.includes(recipient)) return;

    const code = await signatureFor(error);
    const client = getSupabaseAdminClient(env);
    const { data: shouldAlert, error: rpcError } = await client.rpc("claim_operational_alert", {
      p_code: code,
      p_cooldown_seconds: 900,
    });
    if (rpcError || !shouldAlert) return;

    await env.MODERATION_EMAIL.send({
      from: "alerts@bajihears.app",
      to: recipient,
      subject: `BajiHears operational alert: ${code}`,
      text:
        `An unexpected server error (signature ${code}) occurred in production.\n` +
        `Search Cloudflare Worker logs for this signature to find the stack trace.\n` +
        `No request content, user data, or raw error text is included in this email.\n` +
        `Further occurrences of this same signature are suppressed for 15 minutes.`,
    });
  } catch {
    // Never let alerting itself become a second failure.
  }
}
