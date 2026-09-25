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
    } catch {
      // ignore
    }
  }
}

/**
 * Get resolved database environment bindings
 */
export function getServerEnv(): DatabaseEnv {
  const wEnv = (currentWorkerEnv || (globalThis as any).__worker_env__ || {}) as Record<string, any>;
  const gThis = globalThis as Record<string, any>;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const metaEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  const getVal = (key: string): string | undefined => {
    return (
      wEnv[key] ||
      gThis[key] ||
      procEnv?.[key] ||
      metaEnv?.[key] ||
      wEnv[`VITE_${key}`] ||
      gThis[`VITE_${key}`] ||
      procEnv?.[`VITE_${key}`] ||
      metaEnv?.[`VITE_${key}`]
    );
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
