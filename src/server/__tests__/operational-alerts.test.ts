import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdminClient } from "../db/client";
import { getServerEnv } from "../lib/get-env";
import { reportOperationalError } from "../lib/alerts/operational-errors";
import { mapErrorToResponse, wrapServerFn } from "../lib/wrap-server-fn";

vi.mock("../db/client", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../lib/get-env", () => ({
  getServerEnv: vi.fn(),
}));

function mockEnv(overrides: Partial<ReturnType<typeof getServerEnv>> = {}) {
  const send = vi.fn().mockResolvedValue(undefined);
  vi.mocked(getServerEnv).mockReturnValue({
    MODERATION_EMAIL: { send },
    MODERATION_EMAIL_TO: "mod@bajihears.app",
    MODERATOR_EMAILS: "mod@bajihears.app",
    ...overrides,
  } as ReturnType<typeof getServerEnv>);
  return { send };
}

describe("reportOperationalError", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdminClient).mockReset();
    vi.mocked(getServerEnv).mockReset();
  });

  it("emails the approved moderator only when the DB claim grants it", async () => {
    const { send } = mockEnv();
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as any);

    await reportOperationalError(new Error("boom"));

    expect(rpc).toHaveBeenCalledWith(
      "claim_operational_alert",
      expect.objectContaining({ p_cooldown_seconds: 900 }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    const sent = send.mock.calls[0]?.[0];
    expect(sent?.to).toBe("mod@bajihears.app");
    expect(sent?.text).not.toContain("boom");
  });

  it("stays silent when the DB claim denies it (cooldown active)", async () => {
    const { send } = mockEnv();
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as any);

    await reportOperationalError(new Error("boom"));

    expect(send).not.toHaveBeenCalled();
  });

  it("never sends to an email outside the moderator allowlist", async () => {
    const { send } = mockEnv({ MODERATOR_EMAILS: "someone-else@bajihears.app" });
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as any);

    await reportOperationalError(new Error("boom"));

    expect(send).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never throws, even when every dependency fails", async () => {
    vi.mocked(getServerEnv).mockImplementation(() => {
      throw new Error("env unavailable");
    });
    await expect(reportOperationalError(new Error("boom"))).resolves.toBeUndefined();
  });

  it("does nothing when no moderation email channel is configured", async () => {
    vi.mocked(getServerEnv).mockReturnValue({} as ReturnType<typeof getServerEnv>);
    await expect(reportOperationalError(new Error("boom"))).resolves.toBeUndefined();
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

describe("wrapServerFn operational alert wiring", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdminClient).mockReset();
    vi.mocked(getServerEnv).mockReset();
  });

  it("fires the alert only for UNEXPECTED_ERROR, not classified business errors", async () => {
    const { send } = mockEnv();
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as any);

    const classified = await wrapServerFn(() => Promise.reject(new Error("already voted")));
    expect(classified.ok).toBe(false);
    if (!classified.ok) expect(classified.error.code).toBe("ALREADY_VOTED");
    expect(send).not.toHaveBeenCalled();

    const unexpected = await wrapServerFn(() => Promise.reject(new Error("segfault-ish")));
    expect(unexpected.ok).toBe(false);
    if (!unexpected.ok) expect(unexpected.error.code).toBe("UNEXPECTED_ERROR");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("matches mapErrorToResponse's own classification for the alert gate", () => {
    expect(mapErrorToResponse(new Error("already voted")).error.code).toBe("ALREADY_VOTED");
    expect(mapErrorToResponse(new Error("totally unknown")).error.code).toBe("UNEXPECTED_ERROR");
  });
});
