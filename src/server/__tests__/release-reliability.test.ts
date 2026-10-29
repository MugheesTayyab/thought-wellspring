import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdminClient } from "../db/client";
import { checkRateLimit, checkRequestRateLimit } from "../middleware/rate-limit";
import { executeWinnerSelection } from "../jobs/winner-selection";
import { drainPushOutbox } from "../jobs/push-outbox";
import { drainModerationNotifications } from "../lib/moderation/notifications";
import { runScheduledTasks } from "../jobs/scheduled";
import { submitDuelVote } from "../functions/duels";

vi.mock("../db/client", () => ({ getSupabaseAdminClient: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeader: () => "203.0.113.12" }));
vi.mock("../lib/get-env", () => ({ getServerEnv: () => ({}), setWorkerEnv: vi.fn() }));
vi.mock("../jobs/winner-selection", () => ({ executeWinnerSelection: vi.fn() }));
vi.mock("../jobs/push-outbox", () => ({ drainPushOutbox: vi.fn() }));
vi.mock("../lib/moderation/notifications", () => ({ drainModerationNotifications: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("Campaign traffic and scheduled failure recovery", () => {
  it("accepts the existing seeded Duel identifiers without changing vote history", async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === "record_and_check_rate_limit"
      ? { allowed: true, remaining: 9 } : { success: true, votes_a: 1, votes_b: 0 }, error: null }));
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    await expect(submitDuelVote(undefined, { duelId: "00000000-0000-0000-0000-000000000001", choiceIndex: 0, deviceToken: "1234567890abcdef" }))
      .resolves.toEqual({ choiceIndex: 0, votesA: 1, votesB: 0 });
    expect(rpc).toHaveBeenCalledWith("record_duel_vote_atomic", expect.objectContaining({ p_duel_id: "00000000-0000-0000-0000-000000000001" }));
  });
  it("rejects malformed Duel identifiers before any database call", async () => {
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    await expect(submitDuelVote(undefined, { duelId: "not-a-uuid", choiceIndex: 0, deviceToken: "1234567890abcdef" })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("allows independent visitors on one network while enforcing individual quotas", async () => {
    const counts = new Map<string, number>();
    const rpc = vi.fn(async (_name, args) => {
      const key = `${args.p_device_token}:${args.p_action_type}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { data: { allowed: count <= args.p_limit, remaining: args.p_limit - count,
        limit: args.p_limit, retry_after_seconds: 3600 }, error: null };
    });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    for (let index = 0; index < 50; index++) {
      await expect(checkRateLimit(undefined, "submit_post", `visitor-${index}`)).resolves.toMatchObject({ allowed: true, remaining: 2 });
    }
    await checkRateLimit(undefined, "submit_post", "visitor-0");
    await checkRateLimit(undefined, "submit_post", "visitor-0");
    await expect(checkRateLimit(undefined, "submit_post", "visitor-0")).rejects.toMatchObject({ statusCode: 429 });
    expect(rpc.mock.calls.some(([, args]) => args.p_limit === 300)).toBe(true);
  });
  it("retains a finite network ceiling against rotating-device abuse", async () => {
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc: vi.fn().mockResolvedValue({
      data: { allowed: false, limit: 600, retry_after_seconds: 60 }, error: null,
    }) } as never);
    await expect(checkRequestRateLimit(undefined, "auth")).rejects.toMatchObject({ statusCode: 429, limit: 600 });
  });
  it("does not let selection or push failure prevent moderation and cleanup", async () => {
    vi.mocked(executeWinnerSelection).mockRejectedValueOnce(new Error("selection offline"));
    vi.mocked(drainPushOutbox).mockRejectedValueOnce(new Error("push offline"));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    await runScheduledTasks({});
    expect(drainModerationNotifications).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("purge_old_device_actions");
  });
});
