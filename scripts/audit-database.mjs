import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  /* CI uses environment variables. */
}
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Supabase public environment is missing.");
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
};
const publicClient = createClient(url, anon, options);
const admin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, options)
  : null;
let failed = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed++;
}
const settings = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: anon },
  signal: AbortSignal.timeout(15000),
});
const auth = await settings.json();
check("Auth settings reachable", settings.ok);
check("Google OAuth provider enabled", auth.external?.google === true);
for (const table of ["duels"]) {
  const result = await publicClient.from(table).select("id").limit(1);
  check(`Public ${table} read`, !result.error, result.error?.code);
}
for (const table of [
  "unsaids",
  "echoes",
  "profiles",
  "reactions",
  "duel_votes",
  "device_actions",
  "anonymous_subscriptions",
  "push_delivery_logs",
  "push_outbox",
  "echo_reports",
  "moderation_audit_log",
  "moderation_queue",
]) {
  const result = await publicClient.from(table).select("*").limit(1);
  // Permission denial is expected. Empty results alone do not prove grants are safe.
  check(
    `Public ${table} access denied`,
    Boolean(result.error),
    result.error?.code || "accessible (even if empty)",
  );
}
for (const table of ["unsaids", "echoes"]) {
  const result = await publicClient.from(table).select("device_token").limit(1);
  check(`Private ${table}.device_token inaccessible`, Boolean(result.error), result.error?.code);
}
if (admin) {
  for (const table of [
    "profiles",
    "unsaids",
    "echoes",
    "reactions",
    "duels",
    "duel_votes",
    "device_actions",
    "echo_reports",
    "anonymous_subscriptions",
    "push_delivery_logs",
    "push_outbox",
    "winner_cycles",
  ]) {
    const result = await admin.from(table).select("*", { count: "exact", head: true });
    check(`Server ${table} schema available`, !result.error, result.error?.code);
  }
}
// OpenAPI introspection is read-only; never call mutation RPCs as a health check.
const schemaResponse = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  signal: AbortSignal.timeout(15000),
});
const schema = await schemaResponse.json();
const privileged = new Set([
  "record_and_check_rate_limit", "purge_old_device_actions", "append_veto_atomic",
  "crown_cycle_winner", "increment_reaction_atomic", "set_reaction_atomic",
  "record_duel_vote_atomic", "insert_echo_atomic", "insert_post_atomic",
  "link_guest_account", "increment_profile_warmth", "increment_profile_actions",
  "claim_daily_bonus_atomic", "purchase_store_item_atomic", "enqueue_winner_push",
  "claim_push_batch", "complete_push_batch",
]);
const exposed = Object.keys(schema.paths || {}).filter((path) => privileged.has(path.replace(/^\/rpc\//, "")));
check("Privileged RPCs absent from public API", exposed.length === 0, exposed.join(", "));
console.log(`Database audit: ${failed} failed checks. No rows were changed.`);
process.exitCode = failed ? 1 : 0;
