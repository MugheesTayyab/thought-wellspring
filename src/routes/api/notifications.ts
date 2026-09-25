import { createServerFn } from "@tanstack/react-start";
import type { SavePushSubscriptionResponseData } from "@/shared/types/api";

export type { SavePushSubscriptionResponseData };

export interface PushSubscriptionClientPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const apiSavePushSubscription = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subscription: PushSubscriptionClientPayload;
      jwt?: string;
      deviceToken?: string;
      userAgent?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const { handleSavePushSubscription } = await import("@/server/handlers/notifications");
    return handleSavePushSubscription(data);
  });
