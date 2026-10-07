import { getServerEnv } from "@/server/lib/get-env";
import {
  wrapServerFn,
  extractBearerJwt,
} from "@/server/lib/wrap-server-fn";
import type { ServerFnResult } from "@/shared/types/api";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  savePushSubscription,
  type PushSubscriptionPayload,
} from "@/server/functions/notifications";

export interface SavePushSubscriptionResponseData {
  saved: boolean;
}

export async function handleSavePushSubscription(data: {
  subscription: PushSubscriptionPayload;
  jwt?: string;
  deviceToken?: string;
  userAgent?: string;
}): Promise<ServerFnResult<SavePushSubscriptionResponseData>> {
  return wrapServerFn(async () => {
    const env = getServerEnv();
    let userId: string | undefined;

    // 1. If JWT present, attempt to resolve authenticated user
    if (data.jwt) {
      try {
        const jwt = await extractBearerJwt(data.jwt);
        if (jwt) {
          const anonClient = getSupabaseAnonClient(env);
          const { data: userData } = await anonClient.auth.getUser(jwt);
          if (userData?.user) {
            userId = userData.user.id;
          }
        }
      } catch {
        // Fall back gracefully to anonymous deviceToken
      }
    }

    // 2. Ensure at least deviceToken or userId is present
    if (!userId && !data.deviceToken) {
      throw new Error("Either deviceToken or authenticated session is required to save push subscription.");
    }

    return savePushSubscription(env, {
      userId,
      deviceToken: data.deviceToken,
      userAgent: data.userAgent,
      subscription: data.subscription,
    });
  });
}
