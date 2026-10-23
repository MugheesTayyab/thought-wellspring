import { supabase } from "./supabase";

export async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Your session could not be restored. Please sign in again.");
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
