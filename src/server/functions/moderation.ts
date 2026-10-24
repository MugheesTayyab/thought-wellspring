import type { DatabaseEnv } from "../db/client";
import { reportPost as dbReportPost } from "../db/unsaids";
import { reportEcho as persistEchoReport } from "../db/echoes";
import { validateDeviceToken } from "../middleware/device-token";
import { checkRateLimit } from "../middleware/rate-limit";
import { z } from "zod";

export interface ReportPostInput {
  postId: string;
  deviceToken: string;
  reason?: string;
}

/**
 * Report a confession post for community moderation
 */
export async function reportPost(
  env: DatabaseEnv | undefined,
  input: ReportPostInput,
): Promise<{ reported: boolean; message: string }> {
  const token = validateDeviceToken(input.deviceToken);
  const postId = z.string().uuid().parse(input.postId);
  const reason = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .parse(input.reason || "Community safety concern") || "Community safety concern";

  // 1. Rate limiting: 5 reports per 24 hours
  await checkRateLimit(env, "report", token);

  // 2. Persist post report via atomic RPC
  const res = await dbReportPost(env, postId, token, reason);

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
  const echoId = z.string().uuid().parse(input.echoId);
  const reason = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .parse(input.reason || "Community safety concern");

  await checkRateLimit(env, "report", token);
  const res = await persistEchoReport(env, {
    echoId,
    reporterDeviceToken: token,
    reason,
  });

  if (res.error) throw new Error(res.error.message);

  return {
    reported: true,
    message: "Report received. This Echo has been added to the moderation queue.",
  };
}
