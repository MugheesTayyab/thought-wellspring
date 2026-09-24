import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { fetchProfileById, upsertProfile, type DbProfile } from "../db/profiles";
import { validateDeviceToken } from "../middleware/device-token";

export interface MigrateGuestInput {
  userId: string;
  deviceToken: string;
  handle: string;
  avatarSeed?: number;
}

/**
 * Migrates pseudonymous local guest state into an authenticated Supabase profile
 */
export async function migrateGuestToAccount(
  env: DatabaseEnv | undefined,
  input: MigrateGuestInput
): Promise<DbProfile> {
  const token = validateDeviceToken(input.deviceToken);

  // 1. Check if profile already exists for userId
  const existing = await fetchProfileById(env, input.userId);
  if (existing.data) {
    return existing.data;
  }

  // 2. Create the profile row with user's anonymous handle & avatar
  const createRes = await upsertProfile(env, {
    id: input.userId,
    handle: input.handle,
    avatarSeed: input.avatarSeed ?? 1,
    deviceToken: token,
  });

  if (createRes.error || !createRes.data) {
    throw new Error(createRes.error?.message || "Failed to initialize user profile");
  }

  // 3. Link previously submitted guest posts to this new profile
  const adminClient = getSupabaseAdminClient(env);
  await adminClient
    .from("unsaids")
    .update({ profile_id: input.userId })
    .eq("device_token", token)
    .is("profile_id", null);

  // 4. Link previously submitted guest echoes to this new profile
  await adminClient
    .from("echoes")
    .update({ profile_id: input.userId })
    .eq("device_token", token)
    .is("profile_id", null);

  const finalProfile = await fetchProfileById(env, input.userId);
  if (!finalProfile.data) {
    throw new Error("Profile created but failed to retrieve");
  }

  return finalProfile.data;
}

/**
 * Fetch latest hydrated profile for active session
 */
export async function refreshProfile(
  env: DatabaseEnv | undefined,
  userId: string
): Promise<DbProfile> {
  const res = await fetchProfileById(env, userId);
  if (res.error || !res.data) {
    throw new Error(res.error?.message || "Profile not found");
  }
  return res.data;
}
