import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn, extractBearerJwt } from "@/server/lib/wrap-server-fn";
import type { ServerFnResult } from "@/shared/types/api";
import { getSupabaseAnonClient } from "@/server/db/client";
import { migrateGuestToAccount, refreshProfile } from "@/server/functions/auth";
import type { DbProfile } from "@/shared/types/profile";
import { checkRateLimit, checkRequestRateLimit } from "@/server/middleware/rate-limit";
import { validateDeviceToken } from "@/server/middleware/device-token";

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
}): Promise<ServerFnResult<MigrateGuestData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    const deviceToken = validateDeviceToken(data.deviceToken);
    await checkRateLimit(env, "auth", deviceToken);
    const jwt = await extractBearerJwt();

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
      deviceToken,
      handle: data.handle,
      avatarSeed: data.avatarSeed,
    });

    return { profile };
  });
}

export async function handleRefreshProfile(
  _data?: undefined,
): Promise<ServerFnResult<RefreshProfileData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    await checkRequestRateLimit(env, "auth");
    const jwt = await extractBearerJwt();

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
