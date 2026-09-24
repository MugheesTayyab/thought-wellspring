import fs from "fs";
import path from "path";
import {
  handleFetchFeed,
  handleFetchWinner,
  handleSubmitPost,
  handleReactToPost,
} from "../../routes/api/wall";
import {
  handleFetchActiveDuel,
  handleSubmitDuelVote,
} from "../../routes/api/duels";
import { wrapServerFn } from "../lib/wrap-server-fn";
import { setWorkerEnv } from "../lib/get-env";
import { DeviceTokenError } from "../middleware/device-token";
import { RateLimitError } from "../middleware/rate-limit";
import { getSupabaseAdminClient, type DatabaseEnv } from "../db/client";

// Read .env.local for credentials
function loadEnv(): DatabaseEnv {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
    return {
      SUPABASE_URL: env.VITE_SUPABASE_URL,
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
    };
  } catch {
    return {
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    };
  }
}

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("  BajiHears — Phase 3 Route & HTTP Layer Tests   ");
  console.log("=================================================");

  const env = loadEnv();
  setWorkerEnv(env);
  process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

  const testRunId = Math.random().toString(16).slice(2, 6);
  const testDeviceA = `333344445555${testRunId}`;
  const testDeviceB = `777788889999${testRunId}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string, details?: unknown) {
    if (condition) {
      console.log(`[PASS] ${testId}: ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testId}: ${desc}`);
      if (details) console.error("       Details:", details);
      failed++;
    }
  }

  let createdPostId: string | null = null;
  const adminClient = getSupabaseAdminClient(env);

  try {
    // V-01: wrapServerFn utility: Clean result returns { ok: true, data: ... }
    const v01Res = await wrapServerFn(async () => {
      return { status: "ready", count: 42 };
    });
    assert(
      v01Res.ok === true && (v01Res as any).data?.count === 42,
      "V-01",
      "wrapServerFn utility returns { ok: true, data: ... } on success",
      v01Res
    );

    // V-02: wrapServerFn utility: DeviceTokenError returns { ok: false, error: { code: 'MISSING_DEVICE_TOKEN' } }
    const v02Res = await wrapServerFn(async () => {
      throw new DeviceTokenError("Missing required X-Device-Token header", "MISSING_DEVICE_TOKEN");
    });
    assert(
      v02Res.ok === false &&
        (v02Res as any).error?.code === "MISSING_DEVICE_TOKEN" &&
        (v02Res as any).error?.statusCode === 400,
      "V-02",
      "wrapServerFn utility catches DeviceTokenError and returns MISSING_DEVICE_TOKEN with 400 status",
      v02Res
    );

    // V-03: wrapServerFn utility: RateLimitError returns { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED' } }
    const v03Res = await wrapServerFn(async () => {
      throw new RateLimitError("Rate limit reached: Maximum 3 confessions per hour.", "submit_post", 3, 60);
    });
    assert(
      v03Res.ok === false &&
        (v03Res as any).error?.code === "RATE_LIMIT_EXCEEDED" &&
        (v03Res as any).error?.statusCode === 429,
      "V-03",
      "wrapServerFn utility catches RateLimitError and returns RATE_LIMIT_EXCEEDED with 429 status",
      v03Res
    );

    // V-04: apiFetchFeed handler: Returns { ok: true, data: { posts: [], page: 0, hasMore: boolean } }
    const v04Res = await handleFetchFeed({ limit: 5 });
    assert(
      v04Res.ok === true &&
        Array.isArray((v04Res as any).data?.posts) &&
        (v04Res as any).data?.page === 0 &&
        typeof (v04Res as any).data?.hasMore === "boolean",
      "V-04",
      "handleFetchFeed returns { ok: true, data: { posts, page, limit, hasMore } }",
      v04Res
    );

    // V-05: apiSubmitPost handler: Returns { ok: true, data: { id, status, createdAt } } on valid input
    const v05Res = await handleSubmitPost({
      text: "Phase 3 API verification confession: Testing TanStack Start server functions.",
      category: "Silent Thoughts",
      deviceToken: testDeviceA,
    });
    if (v05Res.ok) {
      createdPostId = (v05Res as any).data.id;
    }
    assert(
      v05Res.ok === true &&
        Boolean((v05Res as any).data?.id) &&
        (v05Res as any).data?.status === "published",
      "V-05",
      "handleSubmitPost successfully publishes post via wrapped API handler",
      v05Res
    );

    // V-06: apiSubmitPost handler: Returns { ok: false, error: { code: 'MISSING_DEVICE_TOKEN' } } on missing token
    const v06Res = await handleSubmitPost({
      text: "This should fail validation due to empty token.",
      category: "general",
      deviceToken: "",
    });
    assert(
      v06Res.ok === false && (v06Res as any).error?.code === "MISSING_DEVICE_TOKEN",
      "V-06",
      "handleSubmitPost returns MISSING_DEVICE_TOKEN error envelope on empty deviceToken",
      v06Res
    );

    // V-07: apiFetchWinner handler: Returns { ok: true, data: { winner, hook, isFallback } }
    const v07Res = await handleFetchWinner();
    assert(
      v07Res.ok === true &&
        Boolean((v07Res as any).data?.winner) &&
        typeof (v07Res as any).data?.hook === "string" &&
        typeof (v07Res as any).data?.isFallback === "boolean",
      "V-07",
      "handleFetchWinner returns { ok: true, data: { winner, hook, isFallback } }",
      v07Res
    );

    // V-08: apiReactToPost handler: Returns { ok: true, data: { reactions } } on first reaction
    if (createdPostId) {
      const v08Res = await handleReactToPost({
        postId: createdPostId,
        reactionKey: "heart",
        deviceToken: testDeviceA,
      });
      assert(
        v08Res.ok === true &&
          typeof (v08Res as any).data?.reactions?.heart === "number" &&
          (v08Res as any).data.reactions.heart >= 1,
        "V-08",
        "handleReactToPost returns updated reaction counters on first reaction",
        v08Res
      );

      // V-09: apiReactToPost handler: Returns { ok: false, error: { code: 'ALREADY_REACTED' } } on duplicate
      const v09Res = await handleReactToPost({
        postId: createdPostId,
        reactionKey: "heart",
        deviceToken: testDeviceA,
      });
      assert(
        v09Res.ok === false && (v09Res as any).error?.code === "ALREADY_REACTED",
        "V-09",
        "handleReactToPost returns ALREADY_REACTED error envelope on duplicate reaction",
        v09Res
      );
    } else {
      assert(false, "V-08", "Skipped V-08 because V-05 did not return createdPostId");
      assert(false, "V-09", "Skipped V-09 because V-05 did not return createdPostId");
    }

    // V-10: apiSubmitDuelVote: Returns { ok: true, data: { choiceIndex, votesA, votesB } }
    const activeDuelRes = await handleFetchActiveDuel();
    if (activeDuelRes.ok && activeDuelRes.data.duel) {
      const duelId = activeDuelRes.data.duel.id;
      const v10Res = await handleSubmitDuelVote({
        duelId,
        choiceIndex: 0,
        deviceToken: testDeviceB,
      });
      assert(
        v10Res.ok === true &&
          (v10Res as any).data?.choiceIndex === 0 &&
          typeof (v10Res as any).data?.votesA === "number",
        "V-10",
        "handleSubmitDuelVote records vote and returns updated counts",
        v10Res
      );
    } else {
      assert(false, "V-10", "No active duel found in database to vote on", activeDuelRes);
    }
  } finally {
    // Cleanup test post if created
    if (createdPostId) {
      await adminClient.from("reactions").delete().eq("unsaid_id", createdPostId);
      await adminClient.from("unsaids").delete().eq("id", createdPostId);
    }
    // Cleanup duel vote if recorded
    await adminClient.from("duel_votes").delete().eq("device_token", testDeviceB);
  }

  console.log("=================================================");
  console.log(`Phase 3 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error("Phase 3 test execution error:", err);
  process.exit(1);
});
