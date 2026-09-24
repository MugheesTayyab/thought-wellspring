import type { DatabaseEnv } from "../db/client";
import { appendVeto } from "../db/unsaids";
import { validateDeviceToken } from "../middleware/device-token";
import { checkRateLimit } from "../middleware/rate-limit";

export interface ReportPostInput {
  postId: string;
  deviceToken: string;
}

/**
 * Report a confession post for community moderation
 */
export async function reportPost(
  env: DatabaseEnv | undefined,
  input: ReportPostInput
): Promise<{ reported: boolean; message: string }> {
  const token = validateDeviceToken(input.deviceToken);

  // 1. Rate limiting: 5 reports per 24 hours
  await checkRateLimit(env, "report", token);

  // 2. Append veto record
  const res = await appendVeto(env, input.postId, token);

  if (res.error) {
    throw new Error(res.error.message);
  }

  return {
    reported: true,
    message: "Thank you for looking out for the community. The confession has been flagged for review.",
  };
}
