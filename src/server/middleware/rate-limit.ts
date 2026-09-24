import type { DatabaseEnv } from "../db/client";
import { countDevicePostsInWindow } from "../db/unsaids";
import { countDeviceReactionsInWindow } from "../db/reactions";
import { countDeviceEchoesInWindow } from "../db/echoes";

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

  let count = 0;
  if (action === "submit_post") {
    count = await countDevicePostsInWindow(env, deviceToken, config.windowMinutes);
  } else if (action === "react") {
    count = await countDeviceReactionsInWindow(env, deviceToken, config.windowMinutes);
  } else if (action === "echo") {
    count = await countDeviceEchoesInWindow(env, deviceToken, config.windowMinutes);
  } else if (action === "report") {
    count = await countDevicePostsInWindow(env, deviceToken, config.windowMinutes);
  }

  const remaining = Math.max(0, config.limit - count);
  const resetTime = Date.now() + config.windowMinutes * 60 * 1000;

  if (count >= config.limit) {
    throw new RateLimitError(config.errorMessage, config.limit, 0, resetTime);
  }

  return {
    allowed: true,
    limit: config.limit,
    remaining,
    resetTime,
  };
}
