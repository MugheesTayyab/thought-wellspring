import { getSupabaseAnonClient, type DatabaseEnv } from "../db/client";
import { extractBearerJwt } from "./wrap-server-fn";

export async function verifiedProfileId(env?: DatabaseEnv): Promise<string | null> {
  const jwt = await extractBearerJwt();
  if (!jwt) return null;
  const { data, error } = await getSupabaseAnonClient(env).auth.getUser(jwt);
  if (error || !data.user) throw new Error("Unauthorized: Invalid or expired session.");
  return data.user.id;
}
