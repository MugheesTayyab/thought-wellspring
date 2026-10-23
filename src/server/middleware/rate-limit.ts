import type { DatabaseEnv } from "../db/client";
import { getSupabaseAdminClient } from "../db/client";

export type RateLimitAction =
  "submit_post" | "react" | "echo" | "report" | "duel_vote" | "auth" | "push_subscription";

export interface RateLimitConfig {
  limit: number;
  windowMinutes: number;
  errorMessage: string;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  auth: {
    limit: 20,
    windowMinutes: 15,
    errorMessage: "Too many account requests. Please try again later.",
  },
  push_subscription: {
    limit: 10,
    windowMinutes: 60,
    errorMessage: "Too many notification subscription attempts. Please try again later.",
  },
  duel_vote: {
    limit: 10,
    windowMinutes: 60,
    errorMessage: "Too many vote attempts. Please try again later.",
  },
  submit_post: {
    limit: 3,
    windowMinutes: 60,
    errorMessage: "Rate limit reached: Maximum 3 confessions per hour.",
  },
  react: {
    limit: 10,
    windowMinutes: 60,
    errorMessage: "Rate limit reached: Maximum 10 reactions per hour.",
  },
  echo: {
    limit: 10,
    windowMinutes: 30,
    errorMessage: "Rate limit reached: Maximum 10 echoes per 30 minutes.",
  },
  report: {
    limit: 5,
    windowMinutes: 24 * 60, // 24 hours
    errorMessage: "Rate limit reached: Maximum 5 reports per 24 hours.",
  },
};

export class RateLimitError extends Error {
  statusCode: number;
  code: string;
  limit: number;
  remaining: number;
  resetTime: number;

  constructor(message: string, limit: number, remaining: number, resetTime: number) {
    super(message);
    this.name = "RateLimitError";
    this.statusCode = 429;
    this.code = "RATE_LIMIT_EXCEEDED";
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Enforces rate limiting per device token against live DB state
 */
export async function checkRateLimit(
  env: DatabaseEnv | undefined,
  action: RateLimitAction,
  deviceToken: string,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) {
    return { allowed: true, limit: 100, remaining: 100, resetTime: Date.now() + 3600000 };
  }

  try {
    const adminClient = getSupabaseAdminClient(env);
    await recordRateLimitAttempt(adminClient, action, deviceToken, config);

    const requestFingerprint = await getRequestFingerprint();
    if (requestFingerprint && requestFingerprint !== deviceToken) {
      await recordRateLimitAttempt(adminClient, action, requestFingerprint, config);
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - 1),
      resetTime: Date.now() + config.windowMinutes * 60000,
    };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("Rate limit evaluation error:", err);
    throw new Error("Rate limit service unavailable");
  }
}

type RateLimitClient = ReturnType<typeof getSupabaseAdminClient>;

async function recordRateLimitAttempt(
  adminClient: RateLimitClient,
  action: RateLimitAction,
  key: string,
  config: RateLimitConfig,
): Promise<void> {
  const { data, error } = await adminClient.rpc("record_and_check_rate_limit", {
    p_device_token: key,
    p_action_type: action,
    p_limit: config.limit,
    p_window_minutes: config.windowMinutes,
  });

  if (error) {
    console.error("Rate limit check RPC failed:", error);
    throw new Error("Rate limit service unavailable");
  }

  if (!data?.allowed) {
    throw new RateLimitError(
      config.errorMessage,
      data.limit,
      0,
      Date.now() + data.retry_after_seconds * 1000,
    );
  }
}

async function getRequestFingerprint(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip = getRequestHeader("cf-connecting-ip")?.trim();
    if (!ip || ip.length > 64) return null;
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`bajihears-rate-limit:${ip}`)),
    );
    return Array.from(digest.slice(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export async function checkRequestRateLimit(
  env: DatabaseEnv | undefined,
  action: RateLimitAction,
): Promise<void> {
  const fingerprint = await getRequestFingerprint();
  if (!fingerprint) return;
  const config = RATE_LIMIT_CONFIGS[action];
  try {
    await recordRateLimitAttempt(getSupabaseAdminClient(env), action, fingerprint, config);
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("Request rate limit evaluation error:", err);
    throw new Error("Rate limit service unavailable");
  }
}
