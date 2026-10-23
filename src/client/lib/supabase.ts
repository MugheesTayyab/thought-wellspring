import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"];

const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before building.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }),
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
