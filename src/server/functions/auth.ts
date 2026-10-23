import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";
import { fetchProfileById, mapRowToProfile, type DbProfile } from "../db/profiles";
import { validateDeviceToken } from "../middleware/device-token";
import { z } from "zod";

export interface MigrateGuestInput {
  userId: string;
  deviceToken: string;
  handle: string;
  avatarSeed?: number | undefined;
}

export async function migrateGuestToAccount(
  env: DatabaseEnv | undefined,
  input: MigrateGuestInput,
): Promise<DbProfile> {
  const token = validateDeviceToken(input.deviceToken);
  const handle = z.string().min(1).max(40).parse(input.handle);
  const avatar = z
    .number()
    .int()
    .min(1)
    .max(500)
    .parse(input.avatarSeed ?? 1);
  const { data, error } = await getSupabaseAdminClient(env).rpc("link_guest_account", {
    p_user_id: input.userId,
    p_device_token: token,
    p_handle: handle,
    p_avatar_seed: avatar,
  });
  if (error || !data) throw new Error(error?.message || "Could not initialize profile");
  return mapRowToProfile(data);
}

export async function refreshProfile(
  env: DatabaseEnv | undefined,
  userId: string,
): Promise<DbProfile> {
  const res = await fetchProfileById(env, userId);
  if (res.error || !res.data) throw new Error(res.error?.message || "Profile not found");
  return res.data;
}
