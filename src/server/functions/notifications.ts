import type { DatabaseEnv } from "../db/client";
import { savePushSubscription as dbSavePushSubscription } from "../db/profiles";
import { upsertAnonymousSubscription } from "../db/push-subscriptions";

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SavePushSubscriptionInput {
  subscription: PushSubscriptionPayload;
  userId?: string;
  deviceToken?: string;
  userAgent?: string;
}

/**
 * Save browser web push subscription for background alerts.
 * Supports both authenticated users and anonymous devices.
 */
export async function savePushSubscription(
  env: DatabaseEnv | undefined,
  input: SavePushSubscriptionInput
): Promise<{ saved: boolean }> {
  if (!input.subscription || !input.subscription.endpoint) {
    throw new Error("Invalid push subscription: missing endpoint.");
  }
  if (!input.subscription.keys?.p256dh || !input.subscription.keys?.auth) {
    throw new Error("Invalid push subscription: missing encryption keys.");
  }

  // 1. If deviceToken provided, register in anonymous_subscriptions
  if (input.deviceToken) {
    const anonRes = await upsertAnonymousSubscription(env, {
      device_token: input.deviceToken,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      user_agent: input.userAgent,
    });
    if (!anonRes.success) {
      console.warn("[Notifications] Failed saving anonymous subscription:", anonRes.error);
    }
  }

  // 2. If authenticated user provided, also update profiles.push_subscription
  if (input.userId) {
    const res = await dbSavePushSubscription(env, input.userId, input.subscription);
    if (res.error) {
      throw new Error(res.error.message);
    }
  }

  return { saved: true };
}
