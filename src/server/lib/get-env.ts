/**
 * Environment Binding Extraction Utility
 *
 * Extracts runtime environment variables (Supabase URL, Anon Key, Service Role Key, VAPID)
 * whether running inside Cloudflare Workers, Nitro, Node.js dev server, or test runners.
 */
import type { DatabaseEnv } from "../db/client";

let currentWorkerEnv: Record<string, any> | null = null;

/**
 * Capture Cloudflare Worker env context passed into worker fetch handler
 */
export function setWorkerEnv(env: unknown): void {
  if (env && typeof env === "object") {
    currentWorkerEnv = env as Record<string, any>;
    try {
      (globalThis as any).__worker_env__ = env;
      (globalThis as any).__env__ = env;
    } catch {
      // ignore
    }
  }
}

function extractString(val: unknown): string | undefined {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function searchRecord(
  record: Record<string, any> | undefined | null,
  targetKey: string,
  allowPublicPrefix = false,
): string | undefined {
  if (!record || typeof record !== "object") return undefined;

  // 1. Direct match
  const direct = extractString(record[targetKey]);
  if (direct) return direct;

  // VITE_* values are browser-exposed. Only explicitly public settings may use them.
  if (allowPublicPrefix) {
    const vitePrefixed = extractString(record[`VITE_${targetKey}`]);
    if (vitePrefixed) return vitePrefixed;
  }

  // 3. Lowercase & Uppercase key
  const upper = targetKey.toUpperCase();
  const upperVal =
    extractString(record[upper]) ||
    (allowPublicPrefix ? extractString(record[`VITE_${upper}`]) : undefined);
  if (upperVal) return upperVal;

  const lower = targetKey.toLowerCase();
  const lowerVal =
    extractString(record[lower]) ||
    (allowPublicPrefix ? extractString(record[`vite_${lower}`]) : undefined);
  if (lowerVal) return lowerVal;

  // 4. Case-insensitive sweep across all keys
  const targetLower = lower;
  const targetViteLower = `vite_${targetLower}`;
  for (const [k, v] of Object.entries(record)) {
    const kLower = k.toLowerCase();
    if (kLower === targetLower || (allowPublicPrefix && kLower === targetViteLower)) {
      const found = extractString(v);
      if (found) return found;
    }
  }

  return undefined;
}

function getStartRequestContext(): Record<string, any> | undefined {
  try {
    const sym = Symbol.for("tanstack-start:start-storage-context");
    const storage = (globalThis as any)[sym];
    const store = storage?.getStore();
    return (
      store?.request?.runtime?.cloudflare?.env ||
      store?.contextAfterGlobalMiddlewares?.env ||
      store?.context?.env
    );
  } catch {
    return undefined;
  }
}

/**
 * Get resolved database environment bindings
 */
export function getServerEnv(): DatabaseEnv {
  const nitroEnv = (globalThis as any).__env__;
  const requestEnv = getStartRequestContext();
  const wEnv = currentWorkerEnv || (globalThis as any).__worker_env__;
  const gThis = globalThis as Record<string, any>;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const metaEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  const sources = [requestEnv, nitroEnv, wEnv, gThis, procEnv, metaEnv];

  const getVal = (key: string, allowPublicPrefix = false): string | undefined => {
    for (const src of sources) {
      const val = searchRecord(src, key, allowPublicPrefix);
      if (val) return val;
    }
    return undefined;
  };

  const supabaseUrl = getVal("SUPABASE_URL", true);
  const anonKey = getVal("SUPABASE_ANON_KEY", true);
  const serviceRoleKey = getVal("SUPABASE_SERVICE_ROLE_KEY");

  return {
    SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_ANON_KEY: anonKey,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VAPID_PUBLIC_KEY: getVal("VAPID_PUBLIC_KEY", true),
    VITE_VAPID_PUBLIC_KEY: getVal("VAPID_PUBLIC_KEY", true),
    VAPID_PRIVATE_KEY: getVal("VAPID_PRIVATE_KEY"),
    VAPID_SUBJECT: getVal("VAPID_SUBJECT"),
    CRON_SECRET: getVal("CRON_SECRET"),
    MODERATOR_USER_IDS: getVal("MODERATOR_USER_IDS"),
    MODERATOR_EMAILS: getVal("MODERATOR_EMAILS"),
    TELEGRAM_BOT_TOKEN: getVal("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_CHAT_ID: getVal("TELEGRAM_CHAT_ID"),
    MODERATION_WEBHOOK_URL: getVal("MODERATION_WEBHOOK_URL"),
  };
}
