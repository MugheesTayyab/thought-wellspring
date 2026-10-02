import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const checkDeviceActions = await supabase.from("device_actions").select("id").limit(1);
const checkDuels = await supabase.from("duels").select("id").limit(1);
const checkDuelVotes = await supabase.from("duel_votes").select("id").limit(1);
const checkEchoes = await supabase.from("echoes").select("id").limit(1);
const checkReactions = await supabase.from("reactions").select("id").limit(1);
const checkUnsaids = await supabase.from("unsaids").select("id").limit(1);
const checkProfiles = await supabase.from("profiles").select("id, push_subscription").limit(1);
const checkAnonSub = await supabase.from("anonymous_subscriptions").select("id").limit(1);
const checkPushLogs = await supabase.from("push_delivery_logs").select("id").limit(1);

// Test RPC calls
const testRateLimitRpc = await supabase.rpc("record_and_check_rate_limit", {
  p_device_token: "0000000000000001",
  p_action_type: "react",
  p_limit: 100,
  p_window_minutes: 60,
});

const testWinnerRpc = await supabase.rpc("crown_cycle_winner", {
  p_cycle_start: new Date(Date.now() - 86400000).toISOString(),
  p_cycle_end: new Date().toISOString(),
  p_triggered_by: "cron",
});

console.log("=== SUPABASE TABLE VERIFICATION ===");
console.log("unsaids:", checkUnsaids.error ? `FAIL: ${checkUnsaids.error.message}` : "OK");
console.log("profiles:", checkProfiles.error ? `FAIL: ${checkProfiles.error.message}` : "OK");
console.log("duels:", checkDuels.error ? `FAIL: ${checkDuels.error.message}` : "OK");
console.log("duel_votes:", checkDuelVotes.error ? `FAIL: ${checkDuelVotes.error.message}` : "OK");
console.log("echoes:", checkEchoes.error ? `FAIL: ${checkEchoes.error.message}` : "OK");
console.log("reactions:", checkReactions.error ? `FAIL: ${checkReactions.error.message}` : "OK");
console.log(
  "device_actions:",
  checkDeviceActions.error ? `FAIL: ${checkDeviceActions.error.message}` : "OK",
);
console.log(
  "anonymous_subscriptions:",
  checkAnonSub.error ? `FAIL: ${checkAnonSub.error.message}` : "OK",
);
console.log(
  "push_delivery_logs:",
  checkPushLogs.error ? `FAIL: ${checkPushLogs.error.message}` : "OK",
);

console.log("\n=== SUPABASE RPC VERIFICATION ===");
console.log(
  "record_and_check_rate_limit:",
  testRateLimitRpc.error ? `FAIL: ${testRateLimitRpc.error.message}` : "OK",
  testRateLimitRpc.data,
);
console.log(
  "crown_cycle_winner:",
  testWinnerRpc.error ? `FAIL: ${testWinnerRpc.error.message}` : "OK",
  testWinnerRpc.data,
);
