/**
 * Environment Binding Extraction Utility
 *
 * Extracts runtime environment variables (Supabase URL, Anon Key, Service Role Key)
 * whether running inside Cloudflare Workers, Nitro, Node.js dev server, or test runners.
 */
import type { DatabaseEnv } from "../db/client";

let currentWorkerEnv: DatabaseEnv | null = null;

/**
 * Capture Cloudflare Worker env context passed into worker fetch handler
 */
export function setWorkerEnv(env: unknown): void {
  if (env && typeof env === "object") {
    currentWorkerEnv = env as DatabaseEnv;
  }
}

/**
 * Get resolved database environment bindings
 */
export function getServerEnv(): DatabaseEnv {
  if (currentWorkerEnv) {
    return currentWorkerEnv;
  }

  // Fallback to process.env and/or import.meta.env
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const metaEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  return {
    SUPABASE_URL:
      procEnv?.["SUPABASE_URL"] ||
      metaEnv?.["VITE_SUPABASE_URL"] ||
      procEnv?.["VITE_SUPABASE_URL"],
    VITE_SUPABASE_URL:
      metaEnv?.["VITE_SUPABASE_URL"] ||
      procEnv?.["VITE_SUPABASE_URL"] ||
      procEnv?.["SUPABASE_URL"],
    SUPABASE_SERVICE_ROLE_KEY:
      procEnv?.["SUPABASE_SERVICE_ROLE_KEY"],
    SUPABASE_ANON_KEY:
      procEnv?.["SUPABASE_ANON_KEY"] ||
      metaEnv?.["VITE_SUPABASE_ANON_KEY"] ||
      procEnv?.["VITE_SUPABASE_ANON_KEY"],
    VITE_SUPABASE_ANON_KEY:
      metaEnv?.["VITE_SUPABASE_ANON_KEY"] ||
      procEnv?.["VITE_SUPABASE_ANON_KEY"] ||
      procEnv?.["SUPABASE_ANON_KEY"],
  };
}
