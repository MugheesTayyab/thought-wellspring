/**
 * Supabase Database Client Factory for Server Functions
 *
 * NOTE FOR BULK PRODUCTION:
 * - Statistically stateless client with persistSession: false, detectSessionInUrl: false
 * - Works identically in Cloudflare Workers, Node.js runtimes, and Nitro/Vite.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface DatabaseEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

function resolveEnv(env?: DatabaseEnv) {
  const url =
    env?.SUPABASE_URL ||
    env?.VITE_SUPABASE_URL ||
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL
      : undefined);

  const serviceRoleKey =
    env?.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_SERVICE_ROLE_KEY
      : undefined);

  const anonKey =
    env?.SUPABASE_ANON_KEY ||
    env?.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY
      : undefined);

  return { url, serviceRoleKey, anonKey };
}

/**
 * Admin Client (Service Role Key)
 * Bypasses RLS for administrative mutations (moderation, cron jobs, atomic counter updates, guest migration).
 * MUST NEVER be returned to the client browser.
 */
export function getSupabaseAdminClient(env?: DatabaseEnv): SupabaseClient {
  const { url, serviceRoleKey } = resolveEnv(env);

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL in environment bindings. Check .env.local or runtime config."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in environment bindings. Check .env.local or runtime config."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Anon Client (Public Key)
 * Respects Row-Level Security policies. Ideal for read paths and user-authenticated queries.
 */
export function getSupabaseAnonClient(env?: DatabaseEnv): SupabaseClient {
  const { url, anonKey } = resolveEnv(env);

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL in environment bindings. Check .env.local or runtime config."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY in environment bindings. Check .env.local or runtime config."
    );
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}
