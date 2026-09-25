import { getServerEnv } from "@/server/lib/get-env";
import {
  wrapServerFn,
  extractBearerJwt,
} from "@/server/lib/wrap-server-fn";
import type { ServerFnResult } from "@/shared/types/api";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  migrateGuestToAccount,
  refreshProfile,
} from "@/server/functions/auth";
import type { DbProfile } from "@/shared/types/profile";

export interface MigrateGuestData {
  profile: DbProfile;
}

export interface RefreshProfileData {
  profile: DbProfile;
}

export async function handleMigrateGuestToAccount(data: {
  deviceToken: string;
  handle: string;
  avatarSeed?: number;
  jwt?: string;
}): Promise<ServerFnResult<MigrateGuestData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const jwt = await extractBearerJwt(data.jwt);

    if (!jwt) {
      throw new Error("Missing required authorization token (UNAUTHORIZED)");
    }

    const anonClient = getSupabaseAnonClient(env);
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      throw new Error("Invalid or expired session token (UNAUTHORIZED)");
    }

    const profile = await migrateGuestToAccount(env, {
      userId: userData.user.id,
      deviceToken: data.deviceToken,
      handle: data.handle,
      avatarSeed: data.avatarSeed,
    });

    return { profile };
  });
}

export async function handleRefreshProfile(data?: {
  jwt?: string;
}): Promise<ServerFnResult<RefreshProfileData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const jwt = await extractBearerJwt(data?.jwt);

    if (!jwt) {
      throw new Error("Missing required authorization token (UNAUTHORIZED)");
    }

    const anonClient = getSupabaseAnonClient(env);
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      throw new Error("Invalid or expired session token (UNAUTHORIZED)");
    }

    const profile = await refreshProfile(env, userData.user.id);
    return { profile };
  });
}
