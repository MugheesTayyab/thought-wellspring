import fs from "fs";
import path from "path";
import { submitPost, fetchFeed, fetchWinner, reactToPost } from "../functions/posts";
import { fetchActiveDuel, submitDuelVote } from "../functions/duels";
import { reportPost } from "../functions/moderation";
import { validateDeviceToken, DeviceTokenError } from "../middleware/device-token";
import { RateLimitError } from "../middleware/rate-limit";
import type { DatabaseEnv } from "../db/client";

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
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
    };
  } catch (err) {
    return {
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    };
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("  BajiHears — Phase 2 Server E2E Verification    ");
  console.log("=================================================");

  const env = loadEnv();
  const testRunId = Math.random().toString(16).slice(2, 6);
  // 16-char hex tokens
  const testDeviceA = `111122223333${testRunId}`;
  const testDeviceB = `aaaa88889999${testRunId}`;
  const rateLimitDevice = `ffff00001111${testRunId}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string) {
    if (condition) {
      console.log(`[PASS] ${testId}: ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testId}: ${desc}`);
      failed++;
    }
  }

  // T-12: Device Token Validation (Invalid Format)
  try {
    validateDeviceToken("too_short");
    assert(false, "T-12", "Should have rejected short token");
  } catch (err: any) {
    assert(err instanceof DeviceTokenError, "T-12", "Rejected invalid token length/format");
  }

  // T-13: Device Token Validation (Missing)
  try {
    validateDeviceToken("");
    assert(false, "T-13", "Should have rejected missing token");
  } catch (err: any) {
    assert(err instanceof DeviceTokenError, "T-13", "Rejected empty/missing token");
  }

  // T-01: fetchFeed
  let initialFeed: any;
  try {
    initialFeed = await fetchFeed(env, { limit: 10 });
    assert(Array.isArray(initialFeed.posts), "T-01", "fetchFeed returned an array of posts");
  } catch (err: any) {
    assert(false, "T-01", `fetchFeed failed: ${err.message}`);
  }

  // T-02: submitPost (clean confession)
  let createdPostId = "";
  try {
    const postRes = await submitPost(env, {
      text: `Tonight the stars are whispering memories of you [${testRunId}]`,
      category: "Silent Thoughts",
      deviceToken: testDeviceA,
      handle: "chai_aur_chand",
    });
    createdPostId = postRes.id;
    assert(
      postRes.status === "published" && Boolean(postRes.id),
      "T-02",
      `Clean post published successfully (id: ${postRes.id})`
    );

    // Verify it appears in feed
    const feedAfter = await fetchFeed(env, { limit: 5 });
    const found = feedAfter.posts.some((p) => p.id === createdPostId);
    assert(found, "T-02b", "Newly published post appears in public feed");
  } catch (err: any) {
    assert(false, "T-02", `submitPost failed: ${err.message}`);
  }

  // T-03: submitPost (Spam detection -> shadow review status)
  try {
    const spamRes = await submitPost(env, {
      text: "Call me for free money 03001234567 follow me instagram.com",
      category: "Spill The Tea",
      deviceToken: testDeviceB,
    });
    assert(
      spamRes.status === "review",
      "T-03",
      "Spam post flagged with 'review' status (shadow review)"
    );

    // Confirm it does NOT appear in public feed
    const feedCheck = await fetchFeed(env, { limit: 10 });
    const foundSpam = feedCheck.posts.some((p) => p.id === spamRes.id);
    assert(!foundSpam, "T-03b", "Spam post does NOT appear in public feed");
  } catch (err: any) {
    assert(false, "T-03", `submitPost spam check failed: ${err.message}`);
  }

  // T-04: submitPost Rate Limiting (3 per hour)
  try {
    // Submit 3 posts quickly with rateLimitDevice
    await submitPost(env, { text: "Post one of the hour test", category: "Vibe Check", deviceToken: rateLimitDevice });
    await submitPost(env, { text: "Post two of the hour test", category: "Vibe Check", deviceToken: rateLimitDevice });
    await submitPost(env, { text: "Post three of the hour test", category: "Vibe Check", deviceToken: rateLimitDevice });

    // 4th should throw RateLimitError
    try {
      await submitPost(env, { text: "Post four should be blocked", category: "Vibe Check", deviceToken: rateLimitDevice });
      assert(false, "T-04", "4th post should have been rate limited");
    } catch (rateErr: any) {
      assert(
        rateErr instanceof RateLimitError || rateErr.message.includes("Rate limit"),
        "T-04",
        "4th post in 60 minutes correctly rejected with RateLimitError"
      );
    }
  } catch (err: any) {
    assert(false, "T-04", `Rate limit test error: ${err.message}`);
  }

  // T-05: reactToPost
  if (createdPostId) {
    try {
      const reactRes = await reactToPost(env, {
        postId: createdPostId,
        reactionKey: "heart",
        deviceToken: testDeviceB,
      });
      assert(
        reactRes.reactions.heart >= 1,
        "T-05",
        `Reacted with 'heart', new heart count: ${reactRes.reactions.heart}`
      );
    } catch (err: any) {
      assert(false, "T-05", `reactToPost failed: ${err.message}`);
    }

    // T-06: reactToPost duplicate reaction from same device
    try {
      await reactToPost(env, {
        postId: createdPostId,
        reactionKey: "heart",
        deviceToken: testDeviceB,
      });
      assert(false, "T-06", "Duplicate reaction should have thrown");
    } catch (dupErr: any) {
      assert(
        dupErr.message.includes("already") || dupErr.message.includes("Duplicate"),
        "T-06",
        "Duplicate reaction from same device rejected"
      );
    }
  }

  // T-07: fetchWinner
  try {
    const winnerRes = await fetchWinner(env);
    assert(
      Boolean(winnerRes.winner && winnerRes.hook),
      "T-07",
      `fetchWinner returned winner (isFallback: ${winnerRes.isFallback}, hook: "${winnerRes.hook}")`
    );
  } catch (err: any) {
    assert(false, "T-07", `fetchWinner failed: ${err.message}`);
  }

  // T-08: submitDuelVote
  try {
    const activeDuelRes = await fetchActiveDuel(env, testDeviceA);
    if (activeDuelRes.duel) {
      const duelId = activeDuelRes.duel.id;
      const voteRes = await submitDuelVote(env, {
        duelId,
        choiceIndex: 0,
        deviceToken: testDeviceA,
      });
      assert(
        voteRes.choiceIndex === 0 && voteRes.votesA > 0,
        "T-08",
        `Voted on duel, votesA is now: ${voteRes.votesA}`
      );

      // T-09: Duplicate vote on duel
      try {
        await submitDuelVote(env, {
          duelId,
          choiceIndex: 1,
          deviceToken: testDeviceA,
        });
        assert(false, "T-09", "Duplicate duel vote should have thrown");
      } catch (dupVoteErr: any) {
        assert(
          dupVoteErr.message.includes("already voted"),
          "T-09",
          "Duplicate duel vote correctly rejected"
        );
      }
    } else {
      console.log("[SKIP] T-08 & T-09: No active duel found to vote on");
    }
  } catch (err: any) {
    assert(false, "T-08", `Duel vote error: ${err.message}`);
  }

  // T-10 & T-11: Moderation / reportPost
  if (createdPostId) {
    // T-11: Self-veto forbidden (testDeviceA is the author of createdPostId)
    try {
      await reportPost(env, {
        postId: createdPostId,
        deviceToken: testDeviceA,
      });
      assert(false, "T-11", "Self-report should have thrown");
    } catch (selfErr: any) {
      assert(
        selfErr.message.includes("Author cannot report") || selfErr.message.includes("SELF_VETO"),
        "T-11",
        "Author prevented from reporting own post"
      );
    }

    // T-10: Legitimate report from testDeviceB
    try {
      const reportRes = await reportPost(env, {
        postId: createdPostId,
        deviceToken: testDeviceB,
      });
      assert(reportRes.reported === true, "T-10", "Legitimate report recorded successfully");
    } catch (err: any) {
      assert(false, "T-10", `reportPost failed: ${err.message}`);
    }
  }

  console.log("=================================================");
  console.log(`  Tests completed: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test suite exception:", err);
  process.exit(1);
});
