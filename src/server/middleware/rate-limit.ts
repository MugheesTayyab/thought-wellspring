import type { DatabaseEnv } from "../db/client";
import { getSupabaseAdminClient } from "../db/client";

export type RateLimitAction = "submit_post" | "react" | "echo" | "report";

export interface RateLimitConfig {
  limit: number;
  windowMinutes: number;
  errorMessage: string;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
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
  deviceToken: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) {
    return { allowed: true, limit: 100, remaining: 100, resetTime: Date.now() + 3600000 };
  }

  try {
    const adminClient = getSupabaseAdminClient(env);
    const { data, error } = await adminClient.rpc("record_and_check_rate_limit", {
      p_device_token: deviceToken,
      p_action_type: action,
      p_limit: config.limit,
      p_window_minutes: config.windowMinutes,
    });

    if (error) {
      console.error("Rate limit check RPC failed:", error);
      // Fallback in case of DB error
      return { allowed: true, limit: config.limit, remaining: 1, resetTime: Date.now() + config.windowMinutes * 60000 };
    }

    if (!data.allowed) {
      throw new RateLimitError(
        config.errorMessage,
        data.limit,
        0,
        Date.now() + (data.retry_after_seconds * 1000)
      );
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: data.remaining,
      resetTime: Date.now() + config.windowMinutes * 60000,
    };
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("Rate limit evaluation error:", err);
    return { allowed: true, limit: config.limit, remaining: 1, resetTime: Date.now() + config.windowMinutes * 60000 };
  }
}

