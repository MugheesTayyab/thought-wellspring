import { getServerEnv } from "@/server/lib/get-env";
import { wrapServerFn, extractBearerJwt } from "@/server/lib/wrap-server-fn";
import type { ServerFnResult } from "@/shared/types/api";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  savePushSubscription,
  type PushSubscriptionPayload,
} from "@/server/functions/notifications";
import { checkRateLimit, checkRequestRateLimit } from "@/server/middleware/rate-limit";
import { validateDeviceToken } from "@/server/middleware/device-token";

export interface SavePushSubscriptionResponseData {
  saved: boolean;
}

export async function handleSavePushSubscription(data: {
  subscription: PushSubscriptionPayload;
  deviceToken?: string;
  userAgent?: string;
}): Promise<ServerFnResult<SavePushSubscriptionResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    let userId: string | undefined;

    // A presented credential must validate; never silently downgrade to anonymous access.
    const jwt = await extractBearerJwt();
    if (jwt) {
      const anonClient = getSupabaseAnonClient(env);
      const { data: userData, error } = await anonClient.auth.getUser(jwt);
      if (error || !userData?.user)
        throw new Error("Invalid or expired session token (UNAUTHORIZED)");
      userId = userData.user.id;
    }

    // 2. Ensure at least deviceToken or userId is present
    if (!userId && !data.deviceToken) {
      throw new Error(
        "Either deviceToken or authenticated session is required to save push subscription.",
      );
    }

    if (data.deviceToken) {
      const deviceToken = validateDeviceToken(data.deviceToken);
      await checkRateLimit(env, "push_subscription", deviceToken);
      data = { ...data, deviceToken };
    } else {
      await checkRequestRateLimit(env, "push_subscription");
    }

    return savePushSubscription(env, {
      userId,
      deviceToken: data.deviceToken,
      userAgent: data.userAgent,
      subscription: data.subscription,
    });
  });
}
