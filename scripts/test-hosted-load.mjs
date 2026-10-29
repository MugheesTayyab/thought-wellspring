import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { toJSON, fromCrossJSON } from "seroval";
import pg from "pg";
import assert from "node:assert/strict";

// This script cannot target production through environment variables or flags.
const base = "https://bajihears-launch-staging.mugheestayyab4.workers.dev";
const ref = "yolnsxesyosrozfobaen";
const env = {};
for (const line of readFileSync(".env.staging.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
}
assert.equal(env.STAGING_PROJECT_REF, ref);
assert.equal(new URL(env.STAGING_DATABASE_URL).username, `postgres.${ref}`);
const resolver = readdirSync(".output/server").find((v) =>
  v.includes("tanstack-start-server-fn-resolver"),
);
const source = readFileSync(`.output/server/${resolver}`, "utf8");
const ids = new Map(
  [...source.matchAll(/"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g)].map(
    ([, id, name]) => [name.replace(/_createServerFn_handler$/, ""), id],
  ),
);
const database = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: readFileSync("scripts/certs/supabase-ca.crt", "utf8") },
  connectionTimeoutMillis: 20000,
  query_timeout: 15000,
});
const token = () => randomBytes(8).toString("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let measurements = [];
async function call(name, data, expectedError) {
  const id = ids.get(name);
  assert.ok(id, `Missing server function ${name}`);
  const method = ["apiFetchFeed", "apiFetchWinner"].includes(name) ? "GET" : "POST";
  const payload = JSON.stringify(toJSON({ data }));
  const url = `${base}/_serverFn/${id}${method === "GET" ? `?payload=${encodeURIComponent(payload)}` : ""}`;
  assert.equal(new URL(url).hostname, "bajihears-launch-staging.mugheestayyab4.workers.dev");
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method,
      redirect: "error",
      headers: {
        "content-type": "application/json",
        "x-tsr-serverfn": "true",
        "sec-fetch-site": "same-origin",
        Origin: base,
      },
      ...(method === "POST" ? { body: payload } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const decoded = fromCrossJSON(JSON.parse(text), { refs: new Map() });
    const result = decoded.result;
    if (!result?.ok) {
      if (expectedError && result?.error?.code === expectedError)
        return { expectedRejection: true };
      throw new Error(result?.error?.code || "INVALID_RESULT");
    }
    measurements.push({
      name,
      ms: performance.now() - started,
      bytes: Buffer.byteLength(text),
      ok: true,
    });
    return result.data;
  } catch (error) {
    measurements.push({ name, ms: performance.now() - started, ok: false, error: error.message });
    throw error;
  }
}
const scenarios = [];
const soak = process.argv.includes("--soak");
const arrivalWindowMs = soak ? 300000 : 30000;
try {
  await database.connect();
  const duelDevice = token();
  const duel = await call("apiFetchActiveDuel", { deviceToken: duelDevice });
  assert.ok(duel.duel?.id, "Staging requires a real active Duel");
  await call("apiSubmitDuelVote", {
    duelId: duel.duel.id,
    choiceIndex: 0,
    deviceToken: duelDevice,
  });
  const persisted = await call("apiFetchActiveDuel", { deviceToken: duelDevice });
  assert.equal(persisted.alreadyVoted, true);
  await call(
    "apiSubmitDuelVote",
    { duelId: duel.duel.id, choiceIndex: 1, deviceToken: duelDevice },
    "ALREADY_VOTED",
  );
  console.log("PASS hosted real Duel vote persistence and duplicate rejection");

  for (const sessions of soak ? [3000] : [30, 150, 300]) {
    measurements = [];
    const sessionMs = [];
    const errors = [];
    let maxConnections = 0;
    let sampling = false;
    const sample = async () => {
      if (sampling) return;
      sampling = true;
      try {
        const result = await database.query(
          "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database()",
        );
        maxConnections = Math.max(maxConnections, result.rows[0].count);
      } finally {
        sampling = false;
      }
    };
    await sample();
    const sampler = setInterval(() => {
      void sample().catch(() => {});
    }, 1000);
    const start = performance.now();
    try {
      await Promise.all(
        Array.from({ length: sessions }, async (_, index) => {
          // Six times the arrival rate of the 10%-in-ten-minutes campaign model.
          await sleep((index * arrivalWindowMs) / sessions);
          const begun = performance.now();
          const deviceToken = token();
          const postId = `11111111-1111-4111-8111-${String((Math.floor(index / 10) % 20) + 1).padStart(12, "0")}`;
          try {
            const reads = await Promise.allSettled([
              call("apiFetchFeed", { page: 0, limit: 20 }),
              call("apiFetchWinner"),
              call("apiFetchActiveDuel", { deviceToken }),
            ]);
            for (const read of reads) if (read.status === "rejected") throw read.reason;
            await call("apiFetchFeed", { page: 1, limit: 20 });
            if (index % 3 === 0)
              await call("apiReactToPost", { postId, reactionKey: "heart", deviceToken });
            if (index % 10 === 0)
              await call("apiAddEcho", {
                unsaidId: postId,
                text: "A synthetic kind response from the staged workload.",
                handle: null,
                deviceToken,
              });
            if (index % (soak ? 20 : 10) === 1)
              await call("apiSubmitPost", {
                text: `A synthetic quiet reflection from staging reader ${deviceToken.slice(0, 6)}.`,
                category: "Silent Thoughts",
                handle: null,
                deviceToken,
              });
            if (index % 5 === 0)
              await call("apiSubmitDuelVote", {
                duelId: duel.duel.id,
                choiceIndex: index % 2,
                deviceToken,
              });
            sessionMs.push(performance.now() - begun);
          } catch (error) {
            errors.push({ index, error: error.message });
          }
        }),
      );
    } finally {
      clearInterval(sampler);
    }
    await sample();
    const sorted = measurements.map((v) => v.ms).sort((a, b) => a - b);
    const failures = measurements.filter((v) => !v.ok);
    const byAction = Object.fromEntries(
      [...new Set(measurements.map((v) => v.name))].map((name) => {
        const rows = measurements.filter((v) => v.name === name).sort((a, b) => a.ms - b.ms);
        return [
          name,
          {
            requests: rows.length,
            failures: rows.filter((v) => !v.ok).length,
            p95Ms: Math.round(rows[Math.ceil(rows.length * 0.95) - 1]?.ms || 0),
          },
        ];
      }),
    );
    const result = {
      modeledDailyVisitors: (sessions * 1000000) / arrivalWindowMs,
      sessions,
      arrivalWindowSeconds: arrivalWindowMs / 1000,
      elapsedMs: Math.round(performance.now() - start),
      requests: measurements.length,
      failedRequests: failures.length,
      successfulSessions: sessionMs.length,
      errorRate: failures.length / Math.max(1, measurements.length),
      p95RequestMs: Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1] || 0),
      p99RequestMs: Math.round(sorted[Math.ceil(sorted.length * 0.99) - 1] || 0),
      responseBytes: measurements.reduce((sum, v) => sum + (v.bytes || 0), 0),
      maxDatabaseConnections: maxConnections,
      byAction,
      errors: errors.slice(0, 10),
    };
    result.passed =
      result.errorRate < 0.01 &&
      result.p95RequestMs < 2000 &&
      result.p99RequestMs < 5000 &&
      sessionMs.length === sessions &&
      maxConnections <= 42;
    scenarios.push(result);
    console.log(
      `${result.passed ? "PASS" : "FAIL"} hosted ${sessions}-session scenario: ${JSON.stringify(result)}`,
    );
  }
  const consistency =
    await database.query(`SELECT count(*)::int AS mismatches FROM public.unsaids u WHERE
    (u.reactions->>'heart')::int <> (SELECT count(*) FROM public.reactions r WHERE r.unsaid_id=u.id AND r.reaction_key='heart')`);
  assert.equal(consistency.rows[0].mismatches, 0, "Stored reaction totals must equal ledger");
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    soak ? "artifacts/hosted-soak-results.json" : "artifacts/hosted-load-results.json",
    JSON.stringify(
      {
        base,
        project: ref,
        compute: "NANO",
        region: "ap-southeast-1",
        productionTouched: false,
        scenarioModel:
          "API sessions at six-times modeled campaign arrival rate; not 300 simultaneous in-flight requests",
        scenarios,
        reactionLedgerConsistent: true,
      },
      null,
      2,
    ),
  );
  if (scenarios.some((v) => !v.passed)) process.exitCode = 1;
} catch (error) {
  console.error("Hosted staging verification failed", error.message);
  process.exitCode = 1;
} finally {
  await database.end();
}
