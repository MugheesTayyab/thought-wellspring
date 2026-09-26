import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://qsloqqvdunfuyqqdmgil.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbG9xcXZkdW5mdXlxcWRtZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjg3MDcsImV4cCI6MjEwNTg0NDcwN30.Hi4UGMoRlKDKKmSmstY4Ues7XrGD3XvGSYLxeWqLhiA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
