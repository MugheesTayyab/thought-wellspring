/**
 * Supabase Database Client Factory for Server Functions
 * 
 * NOTE FOR BULK PRODUCTION:
 * - Uses Transaction Pooler (port 6543, pgbouncer mode) for Cloudflare Workers / stateless runtimes.
 * - Created in Phase 1; wired up in Phase 2 with @supabase/supabase-js.
 */

export interface DatabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

export function getSupabaseAdminClient(env?: DatabaseEnv) {
  // Wire implementation in Phase 2
  return null;
}

export function getSupabaseAnonClient(env?: DatabaseEnv) {
  // Wire implementation in Phase 2
  return null;
}
