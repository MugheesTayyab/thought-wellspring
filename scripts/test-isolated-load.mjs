import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

// No environment files, network clients, or production URLs. This exercises SQL
// contention/correctness in local WASM PostgreSQL, not hosted visitor capacity.
const db = new PGlite();
const results = [];
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL STABLE AS $$ SELECT current_user::text $$;`);
  for (const name of readdirSync("supabase/migrations").filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""));
  }
  console.log("PASS isolated schema initialized; seeding workload");
  await db.exec(`INSERT INTO public.unsaids (text,category,status,device_token)
    SELECT 'Isolated workload thought ' || n, 'Silent Thoughts', 'published', lpad(n::text, 16, '0')
    FROM generate_series(1,10000) n;`);
  console.log("PASS 10,000 isolated workload posts seeded");
  const { rows: posts } = await db.query("SELECT id FROM public.unsaids ORDER BY created_at DESC LIMIT 21");
  for (const concurrentSessions of [30, 150, 300]) {
    const latencies = [];
    const start = performance.now();
    await Promise.all(Array.from({ length: concurrentSessions }, async (_, index) => {
      const begun = performance.now();
      const feed = await db.query("SELECT id,text,category,reactions FROM public.unsaids WHERE status='published' ORDER BY created_at DESC LIMIT 21");
      assert.equal(feed.rows.length, 21);
      await db.query("SELECT id,text FROM public.echoes WHERE status='published' AND unsaid_id = ANY($1::uuid[])", [posts.map((post) => post.id)]);
      const token = (concurrentSessions * 1000 + index).toString(16).padStart(16, "0");
      await db.query("SELECT public.set_reaction_atomic($1,$2,'heart',true)", [posts[0].id, token]);
      latencies.push(performance.now() - begun);
    }));
    const elapsedMs = performance.now() - start;
    latencies.sort((a, b) => a - b);
    results.push({ concurrentSessions, sessions: latencies.length, operations: concurrentSessions * 3,
      elapsedMs: Math.round(elapsedMs), p95SessionMs: Math.round(latencies[Math.ceil(latencies.length * .95) - 1]), errors: 0 });
    const { rows } = await db.query("SELECT (reactions->>'heart')::int AS counter FROM public.unsaids WHERE id=$1", [posts[0].id]);
    const { rows: ledger } = await db.query("SELECT count(*)::int AS count FROM public.reactions WHERE unsaid_id=$1 AND reaction_key='heart'", [posts[0].id]);
    assert.equal(rows[0].counter, ledger[0].count, "Concurrent reaction counters must match ledger");
    console.log(`PASS isolated ${concurrentSessions}-session SQL burst; counters match ledger`);
  }
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/isolated-load.json", JSON.stringify({ environment: "local PGlite WASM; queued single-engine execution", seededPosts: 10000,
    capacityCertified: false, results }, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await db.close();
}
