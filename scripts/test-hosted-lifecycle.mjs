import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { toJSON, fromCrossJSON } from "seroval";
import pg from "pg";
import https from "node:https";

// Fixed disposable staging targets. Never reads production credentials or writes production.
const ref = "yolnsxesyosrozfobaen";
const base = "https://bajihears-launch-staging.mugheestayyab4.workers.dev";
const env = Object.fromEntries(
  readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
      return match ? [[match[1], match[2]]] : [];
    }),
);
assert.equal(env.STAGING_PROJECT_REF, ref);
assert.equal(env.SUPABASE_URL, `https://${ref}.supabase.co`);
assert.equal(new URL(env.STAGING_DATABASE_URL).username, `postgres.${ref}`);
const config = JSON.parse(readFileSync("artifacts/staging-wrangler.json", "utf8"));
assert.equal(config.name, "bajihears-launch-staging");
assert.equal(config.vars.SUPABASE_URL, env.SUPABASE_URL);
const moderatorEmail = "qa-moderator@bajihears-staging.invalid";
const setup = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "secret",
    "put",
    "MODERATOR_EMAILS",
    "--config",
    "artifacts/staging-wrangler.json",
  ],
  {
    input: moderatorEmail,
    encoding: "utf8",
    windowsHide: true,
    timeout: 60000,
  },
);
assert.equal(setup.status, 0, "Could not configure isolated staging moderator");
const resolver = readdirSync(".output/server").find((name) =>
  name.includes("tanstack-start-server-fn-resolver"),
);
const ids = new Map(
  [
    ...readFileSync(`.output/server/${resolver}`, "utf8").matchAll(
      /"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g,
    ),
  ].map(([, id, name]) => [name.replace(/_createServerFn_handler$/, ""), id]),
);
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const database = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: readFileSync("scripts/certs/supabase-ca.crt", "utf8") },
  connectionTimeoutMillis: 15000,
});
const users = [];
const checks = [];
const token = () => randomBytes(8).toString("hex");
async function check(name, action) {
  await action();
  checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
async function user(email) {
  const password = randomBytes(32).toString("base64url");
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null, "Synthetic staging user creation failed");
  users.push(created.data.user.id);
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null, "Synthetic staging sign-in failed");
  return { id: signed.data.user.id, jwt: signed.data.session.access_token, client };
}
async function call(name, data, jwt, expectedError) {
  const id = ids.get(name);
  assert.ok(id, `Missing server function ${name}`);
  const method =
    name.startsWith("apiFetch") && !["apiFetchUserActivity"].includes(name) ? "GET" : "POST";
  const body = JSON.stringify(toJSON({ data }));
  // Fresh TLS connections avoid reusing stale local pooled sockets. This tests
  // backend behavior, not ordinary browser networking or connection capacity.
  const response = await new Promise((resolve, reject) => {
    const request = https.request(
      `${base}/_serverFn/${id}${method === "GET" ? `?payload=${encodeURIComponent(body)}` : ""}`,
      {
        method,
        agent: false,
        timeout: 20000,
        headers: {
          "content-type": "application/json",
          "x-tsr-serverfn": "true",
          "sec-fetch-site": "same-origin",
          Origin: base,
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      },
      (incoming) => {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("error", reject);
        incoming.on("end", () =>
          resolve({
            ok: incoming.statusCode === 200,
            status: incoming.statusCode,
            json: async () => JSON.parse(Buffer.concat(chunks).toString()),
          }),
        );
      },
    );
    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("Staging request timeout")));
    request.end(method === "POST" ? body : undefined);
  });
  assert.ok(response.ok, `HTTP ${response.status} from ${name}`);
  const { result } = fromCrossJSON(await response.json(), { refs: new Map() });
  if (expectedError) {
    assert.equal(result?.ok, false, `${name} must reject`);
    assert.equal(result.error.code, expectedError, `${name} unexpected rejection category`);
    return;
  }
  assert.equal(
    result?.ok,
    true,
    `${name}: ${result?.error?.code || "missing result"}: ${String(result?.error?.message || "").slice(0, 180)}`,
  );
  return result.data;
}
try {
  await database.connect();
  const suffix = token();
  const a = await user(`qa-a-${suffix}@bajihears-staging.invalid`);
  const b = await user(`qa-b-${suffix}@bajihears-staging.invalid`);
  const mod = await user(moderatorEmail);
  const deviceA = token(),
    deviceB = token(),
    reporter = token();
  const anonymous = await call("apiSubmitPost", {
    text: `Synthetic quiet anonymous reflection ${suffix}.`,
    category: "Silent Thoughts",
    deviceToken: deviceA,
    handle: null,
  });
  await check("anonymous post persists without public identity", async () => {
    const { post } = await call("apiFetchPostById", { id: anonymous.id });
    assert.equal(post.handle, null);
    assert.equal(post.profileId, null);
    assert.ok(!JSON.stringify(post).includes(deviceA));
  });
  const profileA = (
    await call(
      "apiMigrateGuestToAccount",
      { deviceToken: deviceA, handle: `qa_a_${suffix}`, avatarSeed: 1 },
      a.jwt,
    )
  ).profile;
  const profileB = (
    await call(
      "apiMigrateGuestToAccount",
      { deviceToken: deviceB, handle: `qa_b_${suffix}`, avatarSeed: 2 },
      b.jwt,
    )
  ).profile;
  await check("guest account linking and authenticated profile reload", async () => {
    assert.equal(profileA.id, a.id);
    assert.equal(profileB.id, b.id);
    assert.equal((await call("apiRefreshProfile", undefined, a.jwt)).profile.id, a.id);
  });
  await check("anonymous history stays absent from public profile after linking", async () => {
    const publicProfile = await call("apiFetchPublicProfile", { identifier: profileA.handle });
    assert.ok(!publicProfile.posts.some((post) => post.id === anonymous.id));
    const { post } = await call("apiFetchPostById", { id: anonymous.id });
    assert.equal(post.profileId, null);
  });
  await check("unauthenticated and cross-account private requests denied", async () => {
    await call("apiRefreshProfile", undefined, undefined, "UNAUTHORIZED");
    await call("apiRefreshProfile", undefined, "invalid-jwt", "UNAUTHORIZED");
    await call(
      "apiFetchUserActivity",
      { profileId: a.id, deviceToken: deviceB },
      b.jwt,
      "UNAUTHORIZED",
    );
  });
  const named = await call(
    "apiSubmitPost",
    {
      text: `Synthetic named reflection ${suffix}.`,
      category: "Silent Thoughts",
      deviceToken: deviceB,
      handle: "spoofed_handle",
      profileId: a.id,
    },
    b.jwt,
  );
  await check("named attribution derives from verified account", async () => {
    const row = (
      await database.query("SELECT handle, profile_id FROM public.unsaids WHERE id=$1", [named.id])
    ).rows[0];
    assert.equal(row.handle, profileB.handle);
    assert.equal(row.profile_id, b.id);
  });
  await check("repeat post submission rejects the twelve-hour cooldown", async () => {
    await call(
      "apiSubmitPost",
      {
        text: "Synthetic repeated reflection.",
        category: "Silent Thoughts",
        deviceToken: deviceB,
        handle: null,
      },
      b.jwt,
      "POST_COOLDOWN",
    );
  });
  await check("self-reporting is rejected and guest attribution cannot be spoofed", async () => {
    await call(
      "apiReportPost",
      { postId: named.id, reason: "Synthetic self report", deviceToken: deviceB },
      b.jwt,
      "SELF_VETO_FORBIDDEN",
    );
    await call(
      "apiSubmitPost",
      {
        text: "Synthetic attempted named guest post.",
        category: "Silent Thoughts",
        deviceToken: token(),
        handle: "pretend_account",
      },
      undefined,
      "VALIDATION_ERROR",
    );
  });
  await check("real reaction add, duplicate idempotence and removal persist", async () => {
    const input = { postId: named.id, reactionKey: "heart", deviceToken: deviceA };
    assert.equal((await call("apiReactToPost", input, a.jwt)).reactions.heart, 1);
    assert.equal((await call("apiReactToPost", input, a.jwt)).reactions.heart, 1);
    assert.equal((await call("apiUnreactToPost", input, a.jwt)).reactions.heart, 0);
  });
  const echo = await call(
    "apiAddEcho",
    {
      unsaidId: named.id,
      text: "Synthetic kind response for an isolated account check.",
      deviceToken: deviceA,
      handle: null,
    },
    a.jwt,
  );
  await check("anonymous Echo persists without public attribution", async () => {
    const { posts } = await call("apiFetchFeed", { limit: 20, page: 0 });
    const post = posts.find((item) => item.id === named.id);
    const publicEcho = post.echoes.find((item) => item.id === echo.id);
    assert.equal(publicEcho.profileId, null);
    assert.equal(publicEcho.handle, null);
    assert.ok(!JSON.stringify(publicEcho).includes(deviceA));
  });
  await check("post and Echo reports persist and duplicates reject", async () => {
    await call("apiReportPost", {
      postId: named.id,
      reason: "Synthetic staging report",
      deviceToken: reporter,
    });
    await call(
      "apiReportPost",
      { postId: named.id, reason: "Duplicate staging report", deviceToken: reporter },
      undefined,
      "ALREADY_REPORTED",
    );
    await call("apiReportEcho", {
      echoId: echo.id,
      reason: "Synthetic staging Echo report",
      deviceToken: reporter,
    });
  });
  await check("moderation denies guests and ordinary accounts", async () => {
    await call("apiFetchModerationDashboard", undefined, undefined, "UNAUTHORIZED");
    await call("apiFetchModerationDashboard", undefined, a.jwt, "FORBIDDEN");
  });
  await check("authorized moderator sees reports and hides content", async () => {
    const dashboard = await call("apiFetchModerationDashboard", undefined, mod.jwt);
    assert.ok(dashboard.items.some((item) => item.id === named.id));
    await call(
      "apiExecuteEchoModeration",
      { echoId: echo.id, action: "hide", reason: "Isolated synthetic safety check" },
      mod.jwt,
    );
    await call(
      "apiExecutePostModeration",
      { postId: named.id, action: "hide", reason: "Isolated synthetic safety check" },
      mod.jwt,
    );
    assert.equal((await call("apiFetchPostById", { id: named.id })).post, null);
  });
  await check("moderator restore and immutable audit entry persist", async () => {
    await call(
      "apiExecutePostModeration",
      { postId: named.id, action: "restore", reason: "Synthetic check completed" },
      mod.jwt,
    );
    assert.ok((await call("apiFetchPostById", { id: named.id })).post);
    const { entries } = await call("apiFetchModerationAuditLog", { limit: 100 }, mod.jwt);
    assert.ok(
      entries.some((item) => item.targetId === named.id && item.actionType === "manual_restore"),
    );
  });
  await check("post approval, rejection and report dismissal persist", async () => {
    const action = async (value) =>
      call(
        "apiExecutePostModeration",
        { postId: named.id, action: value, reason: "Synthetic staged moderation lifecycle" },
        mod.jwt,
      );
    await action("hide");
    await action("approve");
    assert.ok((await call("apiFetchPostById", { id: named.id })).post);
    await action("reject");
    assert.equal((await call("apiFetchPostById", { id: named.id })).post, null);
    await action("restore");
    await call("apiReportPost", {
      postId: named.id,
      reason: "Synthetic dismissal check",
      deviceToken: token(),
    });
    await action("dismiss_reports");
    const open = await database.query(
      "SELECT count(*)::int AS count FROM public.post_reports WHERE post_id=$1 AND status='open'",
      [named.id],
    );
    assert.equal(open.rows[0].count, 0);
  });
  await check("Echo approval, rejection, restore and dismissal persist", async () => {
    const action = async (value) =>
      call(
        "apiExecuteEchoModeration",
        { echoId: echo.id, action: value, reason: "Synthetic staged Echo lifecycle" },
        mod.jwt,
      );
    await action("approve");
    await action("reject");
    assert.equal(
      (await database.query("SELECT status FROM public.echoes WHERE id=$1", [echo.id])).rows[0]
        .status,
      "rejected",
    );
    await action("restore");
    await call("apiReportEcho", {
      echoId: echo.id,
      reason: "Synthetic dismissal check",
      deviceToken: token(),
    });
    await action("dismiss_reports");
    assert.equal(
      (
        await database.query(
          "SELECT count(*)::int AS count FROM public.echo_reports WHERE echo_id=$1 AND status='open'",
          [echo.id],
        )
      ).rows[0].count,
      0,
    );
    assert.equal(
      (await database.query("SELECT status FROM public.echoes WHERE id=$1", [echo.id])).rows[0]
        .status,
      "published",
    );
  });
  await check("account switching does not expose another profile", async () => {
    await a.client.auth.signOut({ scope: "local" });
    assert.equal((await a.client.auth.getSession()).data.session, null);
    assert.equal((await call("apiRefreshProfile", undefined, b.jwt)).profile.id, b.id);
  });
} catch (error) {
  checks.push({
    name: "lifecycle completion",
    passed: false,
    error: String(error.message).slice(0, 250),
  });
  console.error(String(error.message).slice(0, 250));
  process.exitCode = 1;
} finally {
  // Only the synthetic accounts created by this invocation may be removed.
  for (const id of users) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) {
      console.error("Synthetic staging account cleanup failed");
      process.exitCode = 1;
    }
  }
  await database.end();
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/hosted-lifecycle-results.json",
    JSON.stringify(
      {
        target: base,
        project: ref,
        checkedAt: new Date().toISOString(),
        checks,
        productionWrites: 0,
      },
      null,
      2,
    ),
  );
}
