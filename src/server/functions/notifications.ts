import type { DatabaseEnv } from "../db/client";
import { savePushSubscription as dbSavePushSubscription } from "../db/profiles";

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Save browser web push subscription for background alerts
 */
export async function savePushSubscription(
  env: DatabaseEnv | undefined,
  input: {
    userId: string;
    subscription: PushSubscriptionPayload;
  }
): Promise<{ saved: boolean }> {
  if (!input.subscription || !input.subscription.endpoint) {
    throw new Error("Invalid push subscription: missing endpoint.");
  }
  if (!input.subscription.keys?.p256dh || !input.subscription.keys?.auth) {
    throw new Error("Invalid push subscription: missing encryption keys.");
  }

  const res = await dbSavePushSubscription(env, input.userId, input.subscription);
  if (res.error) {
    throw new Error(res.error.message);
  }

  return { saved: true };
}
