import { describe, expect, it, vi, beforeEach } from "vitest";
import { verifyModerator } from "../lib/authorization";
import { mapErrorToResponse } from "../lib/wrap-server-fn";
import { reportPost, reportEcho } from "../functions/moderation";
import { getSupabaseAnonClient, getSupabaseAdminClient } from "../db/client";

vi.mock("../db/client", () => ({
  getSupabaseAdminClient: vi.fn(),
  getSupabaseAnonClient: vi.fn(),
}));

vi.mock("../middleware/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../db/unsaids", () => ({
  reportPost: vi.fn(),
  appendVeto: vi.fn(),
}));

vi.mock("../db/echoes", () => ({
  reportEcho: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Production Trust & Safety Engine", () => {
  describe("Group A: Administrator Authorization & Security", () => {
    it("denies unauthenticated requests with 401 Unauthorized", async () => {
      await expect(verifyModerator(undefined, undefined)).rejects.toThrow(
        /Unauthorized: Authentication required/i,
      );
    });

    it("denies expired or invalid sessions with 401 Unauthorized", async () => {
      vi.mocked(getSupabaseAnonClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid session" },
          }),
        },
      } as any);

      await expect(verifyModerator(undefined, "expired.jwt.token")).rejects.toThrow(
        /Unauthorized: Invalid or expired session/i,
      );
    });

    it("denies authenticated users not on the moderator allowlist with 403 Forbidden", async () => {
      vi.mocked(getSupabaseAnonClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "regular-user-uuid-1234",
                email: "regular@gmail.com",
              },
            },
            error: null,
          }),
        },
      } as any);

      const env = {
        MODERATOR_USER_IDS: "owner-uuid-9999",
        MODERATOR_EMAILS: "owner@bajihears.app",
      };

      await expect(verifyModerator(env, "valid.regular.user.jwt")).rejects.toThrow(
        /Forbidden: Administrator privileges required/i,
      );
    });

    it("authorizes moderator matching MODERATOR_USER_IDS allowlist", async () => {
      vi.mocked(getSupabaseAnonClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "owner-uuid-9999",
                email: "someuser@gmail.com",
              },
            },
            error: null,
          }),
        },
      } as any);

      const env = {
        MODERATOR_USER_IDS: "other-id,owner-uuid-9999,another-id",
        MODERATOR_EMAILS: "",
      };

      const result = await verifyModerator(env, "valid.owner.jwt");
      expect(result.userId).toBe("owner-uuid-9999");
      expect(result.role).toBe("moderator");
    });

    it("authorizes moderator matching MODERATOR_EMAILS allowlist", async () => {
      vi.mocked(getSupabaseAnonClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "random-uuid-5555",
                email: "FOUNDER@bajihears.app",
              },
            },
            error: null,
          }),
        },
      } as any);

      const env = {
        MODERATOR_USER_IDS: "",
        MODERATOR_EMAILS: "founder@bajihears.app,admin@bajihears.app",
      };

      const result = await verifyModerator(env, "valid.founder.jwt");
      expect(result.userId).toBe("random-uuid-5555");
      expect(result.email).toBe("founder@bajihears.app");
      expect(result.role).toBe("moderator");
    });

    it("denies access by default if allowlists are completely empty", async () => {
      vi.mocked(getSupabaseAnonClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "anyone-uuid",
                email: "anyone@gmail.com",
              },
            },
            error: null,
          }),
        },
      } as any);

      const env = {
        MODERATOR_USER_IDS: "",
        MODERATOR_EMAILS: "",
      };

      await expect(verifyModerator(env, "some.jwt")).rejects.toThrow(
        /Forbidden: Administrator privileges required/i,
      );
    });

    it("maps forbidden error to 403 status code in wrapServerFn", () => {
      const err = new Error("Forbidden: Administrator privileges required.");
      const res = mapErrorToResponse(err);
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("FORBIDDEN");
      expect(res.error.statusCode).toBe(403);
    });

    it("maps unauthorized error to 401 status code in wrapServerFn", () => {
      const err = new Error("Unauthorized: Authentication required.");
      const res = mapErrorToResponse(err);
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("UNAUTHORIZED");
      expect(res.error.statusCode).toBe(401);
    });

    it("maps already rejected error to 409 status code in wrapServerFn", () => {
      const err = new Error("This post has already been removed by moderation");
      const res = mapErrorToResponse(err);
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("ALREADY_REJECTED");
      expect(res.error.statusCode).toBe(409);
    });

    it("maps invalid transition error to 400 status code in wrapServerFn", () => {
      const err = new Error("INVALID_TRANSITION: Post is already published with no open reports");
      const res = mapErrorToResponse(err);
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("INVALID_TRANSITION");
      expect(res.error.statusCode).toBe(400);
    });
  });

  describe("Group B: Report Submission & Validation", () => {
    it("validates post ID as UUID", async () => {
      await expect(
        reportPost(undefined, {
          postId: "not-a-uuid",
          deviceToken: "0123456789abcdef",
          reason: "Spam content",
        }),
      ).rejects.toThrow(/invalid/i);
    });

    it("validates device token length", async () => {
      await expect(
        reportPost(undefined, {
          postId: "11111111-1111-4111-8111-111111111111",
          deviceToken: "short",
          reason: "Spam content",
        }),
      ).rejects.toThrow();
    });

    it("passes validated report with custom reason to database layer", async () => {
      const { reportPost: dbReportPost } = await import("../db/unsaids");
      vi.mocked(dbReportPost).mockResolvedValue({
        data: { vetoCount: 1, status: "published", quarantined: false },
        error: null,
      });

      const res = await reportPost(undefined, {
        postId: "11111111-1111-4111-8111-111111111111",
        deviceToken: "0123456789abcdef",
        reason: "Harassment and threats",
      });

      expect(res.reported).toBe(true);
      expect(dbReportPost).toHaveBeenCalledWith(
        undefined,
        "11111111-1111-4111-8111-111111111111",
        "0123456789abcdef",
        "Harassment and threats",
      );
    });

    it("validates echo ID as UUID and checks reason length", async () => {
      await expect(
        reportEcho(undefined, {
          echoId: "invalid-id",
          deviceToken: "0123456789abcdef",
          reason: "Spam",
        }),
      ).rejects.toThrow(/invalid/i);
    });

    it("delegates echo reports to database layer", async () => {
      const { reportEcho: dbReportEcho } = await import("../db/echoes");
      vi.mocked(dbReportEcho).mockResolvedValue({
        data: { reported: true },
        error: null,
      });

      const res = await reportEcho(undefined, {
        echoId: "22222222-2222-4222-8222-222222222222",
        deviceToken: "0123456789abcdef",
        reason: "Defamatory reply",
      });

      expect(res.reported).toBe(true);
      expect(dbReportEcho).toHaveBeenCalledWith(undefined, {
        echoId: "22222222-2222-4222-8222-222222222222",
        reporterDeviceToken: "0123456789abcdef",
        reason: "Defamatory reply",
      });
    });
  });

  describe("Group C: Notification Integrity", () => {
    it("safely handles missing notification credentials without crashing", async () => {
      const { drainModerationNotifications } = await import("../lib/moderation/notifications");

      const rpc = vi.fn();
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc,
      } as any);

      // Environment without external provider credentials
      const env = {
        TELEGRAM_BOT_TOKEN: undefined,
        TELEGRAM_CHAT_ID: undefined,
        MODERATION_WEBHOOK_URL: undefined,
      };

      const result = await drainModerationNotifications(env, 5);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("retries failed notification deliveries safely with valid claim token", async () => {
      const { drainModerationNotifications } = await import("../lib/moderation/notifications");

      // Mock fetch rejection
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout to Telegram API"));

      const completeCalls: any[] = [];
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockImplementation((name: string, args: any) => {
          if (name === "claim_moderation_notifications") {
            return Promise.resolve({
              data: [
                {
                  id: "notif-uuid-failed",
                  claim_token: "claim-token-uuid-fail",
                  event_type: "quarantine",
                  target_type: "post",
                  target_id: "post-uuid-2",
                  preview_text: "Quarantined post",
                  category: "Secrets",
                  reason: "Doxxing",
                  priority: "urgent",
                  report_count: 3,
                  attempts: 1,
                },
              ],
              error: null,
            });
          }
          if (name === "complete_moderation_notification") {
            completeCalls.push(args);
            return Promise.resolve({ data: { success: true, code: "RETRY_SCHEDULED" }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      } as any);

      const env = {
        TELEGRAM_BOT_TOKEN: "fake-bot-token",
        TELEGRAM_CHAT_ID: "12345678",
      };

      const result = await drainModerationNotifications(env, 5);
      expect(result.failed).toBe(1);
      expect(completeCalls.length).toBe(1);
      expect(completeCalls[0].p_claim_token).toBe("claim-token-uuid-fail");
      expect(completeCalls[0].p_success).toBe(false);
      expect(completeCalls[0].p_error).toContain("Network timeout");

      globalThis.fetch = originalFetch;
    });

    it("warns and handles stale worker rejection when lease was lost", async () => {
      const { drainModerationNotifications } = await import("../lib/moderation/notifications");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockImplementation((name: string) => {
          if (name === "claim_moderation_notifications") {
            return Promise.resolve({
              data: [
                {
                  id: "notif-stale-1",
                  claim_token: "stale-token",
                  event_type: "post_report",
                  target_type: "post",
                  target_id: "post-uuid-stale",
                  preview_text: "Stale test",
                  category: "Secrets",
                  reason: "Spam",
                  priority: "normal",
                  report_count: 1,
                  attempts: 1,
                },
              ],
              error: null,
            });
          }
          if (name === "complete_moderation_notification") {
            return Promise.resolve({
              data: { success: false, code: "STALE_CLAIM_TOKEN", message: "Claim token does not match active lease" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      } as any);

      const env = {
        MODERATION_WEBHOOK_URL: "https://alerts.example.test/moderation",
      };

      const result = await drainModerationNotifications(env, 5);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("STALE_CLAIM_TOKEN"),
      );
      globalThis.fetch = originalFetch;
      warnSpy.mockRestore();
    });
  });

  describe("Group D: Dashboard Privacy & Authorization Defense", () => {
    it("denies unauthenticated requests to handleFetchModerationDashboard", async () => {
      const { handleFetchModerationDashboard } = await import("../handlers/admin-moderation");
      const res = await handleFetchModerationDashboard();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.statusCode).toBe(401);
      }
    });

    it("verifies moderation queue records never expose author or reporter device tokens", async () => {
      const { fetchModerationPostQueue } = await import("../db/moderation");
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "post-uuid-1",
                  text: "Public confession text",
                  category: "Silent Thoughts",
                  status: "published",
                  veto_count: 2,
                  open_report_count: 2,
                  unique_reporters: 2,
                  echo_count: 1,
                  created_at: new Date().toISOString(),
                  first_reported_at: new Date().toISOString(),
                  latest_reported_at: new Date().toISOString(),
                  latest_reason: "Suspicious claim",
                  triage_bucket: "REPORTED_VISIBLE",
                  triage_priority: "MEDIUM: Multiple Community Reports",
                },
              ],
              error: null,
            }),
          }),
        }),
      } as any);

      const res = await fetchModerationPostQueue(undefined);
      expect(res.error).toBeNull();
      expect(res.data.length).toBe(1);
      const item = res.data[0]!;
      expect((item as any).device_token).toBeUndefined();
      expect((item as any).reporter_device_token).toBeUndefined();
      expect((item as any).reporter_tokens).toBeUndefined();
      expect((item as any).vetoed_by).toBeUndefined();
      expect(item.id).toBe("post-uuid-1");
      expect(item.uniqueReporters).toBe(2);
    });
  });
});
