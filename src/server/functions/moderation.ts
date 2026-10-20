import type { DatabaseEnv } from "../db/client";
import { appendVeto } from "../db/unsaids";
import { reportEcho as persistEchoReport } from "../db/echoes";
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
  input: ReportPostInput,
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
    message: "Report received and recorded for moderation.",
  };
}

export interface ReportEchoInput {
  echoId: string;
  reason: string;
  deviceToken: string;
}

export async function reportEcho(
  env: DatabaseEnv | undefined,
  input: ReportEchoInput,
): Promise<{ reported: boolean; message: string }> {
  const token = validateDeviceToken(input.deviceToken);
  const reason = input.reason?.trim().slice(0, 120) || "Community safety concern";

  await checkRateLimit(env, "report", token);
  const res = await persistEchoReport(env, {
    echoId: input.echoId,
    reporterDeviceToken: token,
    reason,
  });

  if (res.error) throw new Error(res.error.message);

  return {
    reported: true,
    message: "Report received. This Echo has been added to the moderation queue.",
  };
}
