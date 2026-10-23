import type { DatabaseEnv } from "../db/client";
import { savePushSubscription as dbSavePushSubscription } from "../db/profiles";
import { upsertAnonymousSubscription } from "../db/push-subscriptions";
import { validateDeviceToken } from "../middleware/device-token";
import { validatePushEndpoint } from "@/shared/lib/push-validation";
import { z } from "zod";

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SavePushSubscriptionInput {
  subscription: PushSubscriptionPayload;
  userId?: string | undefined;
  deviceToken?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Save browser web push subscription for background alerts.
 * Supports both authenticated users and anonymous devices.
 */
export async function savePushSubscription(
  env: DatabaseEnv | undefined,
  input: SavePushSubscriptionInput,
): Promise<{ saved: boolean }> {
  if (!input.subscription || !input.subscription.endpoint) {
    throw new Error("Invalid push subscription: missing endpoint.");
  }
  if (!input.subscription.keys?.p256dh || !input.subscription.keys?.auth) {
    throw new Error("Invalid push subscription: missing encryption keys.");
  }
  validatePushEndpoint(input.subscription.endpoint);
  z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }).parse(input.subscription.keys);

  // 1. If deviceToken provided, register in anonymous_subscriptions
  if (input.deviceToken) {
    const anonRes = await upsertAnonymousSubscription(env, {
      device_token: validateDeviceToken(input.deviceToken),
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      ...(input.userAgent ? { user_agent: input.userAgent.slice(0, 512) } : {}),
    });
    if (!anonRes.success) {
      throw new Error("Could not save notification subscription");
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
