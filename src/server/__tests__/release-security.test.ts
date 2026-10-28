import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enforceRequestBodyLimit,
  contentSecurityPolicy,
  isCrossOriginMutation,
  MAX_REQUEST_BODY_BYTES,
  secureResponse,
} from "../lib/request-security";
import { validatePushEndpoint } from "@/shared/lib/push-validation";
import { mapErrorToResponse } from "../lib/wrap-server-fn";
import { mapRowToUnsaid } from "../db/unsaids";
import { mapRowToEcho } from "../db/echoes";
import { getSupabaseAdminClient } from "../db/client";
import { checkRateLimit } from "../middleware/rate-limit";
import { handleTriggerWinnerSelection } from "../handlers/cron";
import { syncWarmth } from "../functions/warmth";
import { handleFetchUserActivity, handleSubmitPost } from "../handlers/wall";
import { redactSensitiveText } from "../lib/error-capture";
import { secretsMatch } from "../handlers/cron";
import { getServerEnv } from "../lib/get-env";
import { resolveAuthorHandle } from "../functions/posts";

vi.mock("../db/client", () => ({
  getSupabaseAdminClient: vi.fn(),
  getSupabaseAnonClient: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getSupabaseAdminClient).mockReset();
});

describe("Public release security", () => {
  it("prevents guest handle impersonation while preserving anonymous posting", async () => {
    await expect(resolveAuthorHandle(undefined, null, "@someone_else")).rejects.toThrow("Sign in");
    await expect(resolveAuthorHandle(undefined, null, null)).resolves.toBeNull();
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });
  it("uses the authenticated profile handle instead of client attribution", async () => {
    const single = vi.fn().mockResolvedValue({ data: { handle: "@real_author" }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ from: vi.fn().mockReturnValue({ select }) } as never);
    await expect(resolveAuthorHandle(undefined, "verified-profile", "@someone_else")).resolves.toBe("@real_author");
    expect(eq).toHaveBeenCalledWith("id", "verified-profile");
  });
  it("rejects mutations from another Workers tenant and cross-site form submissions", () => {
    expect(
      isCrossOriginMutation(
        new Request("https://bajihears.com/action", {
          method: "POST",
          headers: { Origin: "https://attacker.workers.dev" },
        }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginMutation(
        new Request("https://bajihears.com/action", {
          method: "POST",
          headers: { "Sec-Fetch-Site": "cross-site" },
        }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginMutation(
        new Request("https://bajihears.com/action", {
          method: "POST",
          headers: { Origin: "https://bajihears.com" },
        }),
      ),
    ).toBe(false);
  });
  it("does not cache personal responses and prevents framing", () => {
    const response = secureResponse(Response.json({ private: true }));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(response.headers.get("content-security-policy")).not.toContain("*.supabase.co");
  });
  it("uses a nonce-based script policy without unsafe-inline", () => {
    const policy = contentSecurityPolicy("test-nonce");
    expect(policy).toContain("'nonce-test-nonce'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });
  it("rejects oversized mutation bodies with and without a Content-Length header", async () => {
    await expect(
      enforceRequestBodyLimit(
        new Request("https://bajihears.com/action", {
          method: "POST",
          headers: { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) },
          body: "x",
        }),
      ),
    ).rejects.toThrow("REQUEST_BODY_TOO_LARGE");

    await expect(
      enforceRequestBodyLimit(
        new Request("https://bajihears.com/action", {
          method: "POST",
          body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1),
        }),
      ),
    ).rejects.toThrow("REQUEST_BODY_TOO_LARGE");
  });
  it("redacts credentials from production log text", () => {
    const text = redactSensitiveText(
      "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature password=hunter2hunter2 postgresql://user:secret@db.example/app",
    );
    expect(text).not.toContain("hunter2hunter2");
    expect(text).not.toContain("signature");
    expect(text).not.toContain(":secret@");
  });
  it("compares cron credentials in constant work over fixed-length digests", async () => {
    await expect(secretsMatch("correct-secret", "correct-secret")).resolves.toBe(true);
    await expect(secretsMatch("correct-secret", "incorrect-secret")).resolves.toBe(false);
  });
  it("never resolves a service-role credential from a browser-exposed VITE variable", () => {
    const serverSecret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const browserSecret = process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"];
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"] = "must-not-be-trusted";
    try {
      expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    } finally {
      if (serverSecret) process.env["SUPABASE_SERVICE_ROLE_KEY"] = serverSecret;
      else delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
      if (browserSecret) process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"] = browserSecret;
      else delete process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"];
    }
  });
  it("never returns internal exception details to visitors", () => {
    const response = mapErrorToResponse(new Error("database credential xyz connection failure"));
    expect(response.error.message).not.toContain("credential");
  });
  it("hides private device identifiers and anonymous account associations", () => {
    const post = mapRowToUnsaid({
      id: "1",
      text: "thought",
      handle: null,
      device_token: "secret",
      profile_id: "private-account",
      vetoed_by: ["secret"],
    });
    expect(post.deviceToken).toBeUndefined();
    expect(post.vetoedBy).toBeUndefined();
    expect(post.profileId).toBeNull();
    expect(mapRowToEcho({ handle: null, profile_id: "private-account" }).profileId).toBeNull();
  });
  it("rejects internal, arbitrary, credential-bearing, and non-HTTPS push endpoints", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/test",
      "https://127.0.0.1/test",
      "https://evil.com/test",
      "https://user:pass@fcm.googleapis.com/test",
      "https://fcm.googleapis.com:8443/test",
    ])
      expect(() => validatePushEndpoint(endpoint)).toThrow();
    expect(validatePushEndpoint("https://fcm.googleapis.com/fcm/send/test").hostname).toBe(
      "fcm.googleapis.com",
    );
  });
  it("fails closed when the rate limit database fails", async () => {
    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "OFFLINE" } }),
    } as never);
    await expect(checkRateLimit(undefined, "submit_post", "1234567890abcdef")).rejects.toThrow();
  });
  it("rejects manual cron triggers when no secret is configured", async () => {
    const original = process.env["CRON_SECRET"];
    delete process.env["CRON_SECRET"];
    try {
      const result = await handleTriggerWinnerSelection();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
      expect(getSupabaseAdminClient).not.toHaveBeenCalled();
    } finally {
      if (original) process.env["CRON_SECRET"] = original;
    }
  });
  it("does not trust local guest totals or create invalid profile rows", async () => {
    expect(
      await syncWarmth(undefined, { deviceToken: "1234567890abcdef", localWarmth: 999999 }),
    ).toEqual({ serverTotal: 0 });
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });
  it("rejects a guest requesting another account's private activity", async () => {
    const result = await handleFetchUserActivity({
      deviceToken: "1234567890abcdef",
      profileId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });
  it("ignores forged account ownership on a guest post", async () => {
    const rpc = vi.fn().mockImplementation(async (name: string) =>
      name === "record_and_check_rate_limit"
        ? { data: { allowed: true, remaining: 2 }, error: null }
        : {
            data: {
              id: "33333333-3333-4333-8333-333333333333",
              created_at: new Date().toISOString(),
              status: "published",
            },
            error: null,
          },
    );
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    const result = await handleSubmitPost({
      text: "A quiet afternoon in the garden.",
      category: "Silent Thoughts",
      deviceToken: "1234567890abcdef",
      profileId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.ok).toBe(true);
    expect(
      rpc.mock.calls.find((call) => call[0] === "insert_post_atomic")?.[1].p_profile_id,
    ).toBeNull();
  });
});
