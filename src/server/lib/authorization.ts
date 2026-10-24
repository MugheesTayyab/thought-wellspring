import { getSupabaseAnonClient, type DatabaseEnv } from "../db/client";
import { getServerEnv } from "./get-env";
import { extractBearerJwt } from "./wrap-server-fn";

export async function verifiedProfileId(env?: DatabaseEnv): Promise<string | null> {
  const jwt = await extractBearerJwt();
  if (!jwt) return null;
  const { data, error } = await getSupabaseAnonClient(env).auth.getUser(jwt);
  if (error || !data.user) throw new Error("Unauthorized: Invalid or expired session.");
  return data.user.id;
}

export interface VerifiedModerator {
  userId: string;
  email: string | null;
  role: "moderator";
}

/**
 * Server-side authorization verifying whether a caller holds administrator privileges.
 * Validates session token with Supabase Auth and checks against server-side allowlists.
 * Denies by default if unauthenticated (401) or not on the allowlist (403).
 */
export async function verifyModerator(
  env?: DatabaseEnv,
  explicitJwt?: string,
): Promise<VerifiedModerator> {
  const jwt = await extractBearerJwt(explicitJwt);
  if (!jwt) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const { data, error } = await getSupabaseAnonClient(env).auth.getUser(jwt);
  if (error || !data.user) {
    throw new Error("Unauthorized: Invalid or expired session.");
  }

  const userId = data.user.id;
  const email = data.user.email ? data.user.email.toLowerCase().trim() : null;

  const resolvedEnv = env || getServerEnv();
  const allowedUserIds = (resolvedEnv.MODERATOR_USER_IDS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = (resolvedEnv.MODERATOR_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAllowedId = allowedUserIds.length > 0 && allowedUserIds.includes(userId.toLowerCase());
  const isAllowedEmail = !!(email && allowedEmails.length > 0 && allowedEmails.includes(email));

  if (!isAllowedId && !isAllowedEmail) {
    throw new Error("Forbidden: Administrator privileges required.");
  }

  return {
    userId,
    email,
    role: "moderator",
  };
}
