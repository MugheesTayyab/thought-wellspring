import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";
import {
  wrapServerFn,
  extractBearerJwt,
  type ServerFnResult,
} from "@/server/lib/wrap-server-fn";
import { getSupabaseAnonClient } from "@/server/db/client";
import {
  savePushSubscription,
  type PushSubscriptionPayload,
} from "@/server/functions/notifications";

export interface SavePushSubscriptionResponseData {
  saved: boolean;
}

/**
 * Handlers (Directly callable and testable)
 */
export async function handleSavePushSubscription(data: {
  subscription: PushSubscriptionPayload;
  jwt?: string;
}): Promise<ServerFnResult<SavePushSubscriptionResponseData>> {
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

    return savePushSubscription(env, {
      userId: userData.user.id,
      subscription: data.subscription,
    });
  });
}

/**
 * TanStack Start Server Functions
 */
export const apiSavePushSubscription = createServerFn({ method: "POST" })
  .validator((data: { subscription: PushSubscriptionPayload; jwt?: string }) => data)
  .handler(async ({ data }) => {
    return handleSavePushSubscription(data);
  });
