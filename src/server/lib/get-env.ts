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

function searchRecord(record: Record<string, any> | undefined | null, targetKey: string): string | undefined {
  if (!record || typeof record !== "object") return undefined;

  // 1. Direct match
  const direct = extractString(record[targetKey]);
  if (direct) return direct;

  // 2. Prefixed VITE_ or un-prefixed
  const vitePrefixed = extractString(record[`VITE_${targetKey}`]);
  if (vitePrefixed) return vitePrefixed;

  // 3. Lowercase & Uppercase key
  const upper = targetKey.toUpperCase();
  const upperVal = extractString(record[upper]) || extractString(record[`VITE_${upper}`]);
  if (upperVal) return upperVal;

  const lower = targetKey.toLowerCase();
  const lowerVal = extractString(record[lower]) || extractString(record[`vite_${lower}`]);
  if (lowerVal) return lowerVal;

  // 4. Case-insensitive sweep across all keys
  const targetLower = lower;
  const targetViteLower = `vite_${targetLower}`;
  for (const [k, v] of Object.entries(record)) {
    const kLower = k.toLowerCase();
    if (kLower === targetLower || kLower === targetViteLower) {
      const found = extractString(v);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Get resolved database environment bindings
 */
export function getServerEnv(): DatabaseEnv {
  const nitroEnv = (globalThis as any).__env__;
  const wEnv = currentWorkerEnv || (globalThis as any).__worker_env__;
  const gThis = globalThis as Record<string, any>;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const metaEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  const sources = [nitroEnv, wEnv, gThis, procEnv, metaEnv];

  const getVal = (key: string): string | undefined => {
    for (const src of sources) {
      const val = searchRecord(src, key);
      if (val) return val;
    }
    return undefined;
  };

  const supabaseUrl = getVal("SUPABASE_URL") || getVal("VITE_SUPABASE_URL");
  const anonKey = getVal("SUPABASE_ANON_KEY") || getVal("VITE_SUPABASE_ANON_KEY");
  const serviceRoleKey = getVal("SUPABASE_SERVICE_ROLE_KEY");

  return {
    SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_ANON_KEY: anonKey,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VAPID_PUBLIC_KEY: getVal("VAPID_PUBLIC_KEY") || getVal("VITE_VAPID_PUBLIC_KEY"),
    VITE_VAPID_PUBLIC_KEY: getVal("VITE_VAPID_PUBLIC_KEY") || getVal("VAPID_PUBLIC_KEY"),
    VAPID_PRIVATE_KEY: getVal("VAPID_PRIVATE_KEY"),
    VAPID_SUBJECT: getVal("VAPID_SUBJECT"),
    CRON_SECRET: getVal("CRON_SECRET"),
  };
}
