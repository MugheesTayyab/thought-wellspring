import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

// Isolated PostgreSQL. Never opens .env.local or connects to production.
const db = new PGlite();
let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
};
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const rpc = async (name, args) =>
  (
    await query(
      `SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) AS result`,
      args,
    )
  )[0].result;
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL STABLE AS $$ SELECT current_user::text $$;`);
  for (const name of readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(`supabase/migrations/${name}`, "utf8").replace(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      "",
    );
    await db.exec(sql);
    console.log(`PASS migration ${name}`);
  }
  const user = "11111111-1111-4111-8111-111111111111";
  const user2 = "22222222-2222-4222-8222-222222222222";
  const post = "33333333-3333-4333-8333-333333333333";
  const duel = "00000000-0000-0000-0000-000000000001";
  const device = "1234567890abcdef";
  await db.query("INSERT INTO auth.users VALUES ($1), ($2)", [user, user2]);
  await test("Account linking creates a valid profile and is idempotent", async () => {
    const a = await rpc("link_guest_account", [user, device, "reader", 12]);
    const b = await rpc("link_guest_account", [user, device, "reader", 12]);
    assert.equal(a.id, user);
    assert.equal(b.handle, a.handle);
  });
  await test("Shared browser cannot transfer a different account identity", async () => {
    const b = await rpc("link_guest_account", [user2, device, "reader", 12]);
    assert.equal(b.device_token, null);
  });
  await db.query(
    `INSERT INTO public.unsaids(id,text,category,device_token,status) VALUES($1, 'A real thought', 'Silent Thoughts', $2, 'published')`,
    [post, device],
  );
  await test("Reaction ledger and counters commit together, duplicate add is idempotent", async () => {
    await rpc("set_reaction_atomic", [post, device, "heart", true]);
    const r = await rpc("set_reaction_atomic", [post, device, "heart", true]);
    assert.equal(r.heart, 1);
    assert.equal((await query("SELECT count(*)::int AS n FROM public.reactions"))[0].n, 1);
    assert.equal((await rpc("set_reaction_atomic", [post, device, "heart", false])).heart, 0);
  });
  await test("Duplicate duel vote does not increment totals", async () => {
    assert.equal((await rpc("record_duel_vote_atomic", [duel, device, 0])).success, true);
    assert.equal((await rpc("record_duel_vote_atomic", [duel, device, 1])).code, "ALREADY_VOTED");
    const [row] = await query("SELECT votes_a, votes_b FROM public.duels WHERE id=$1", [duel]);
    assert.equal(row.votes_a, 1);
    assert.equal(row.votes_b, 0);
  });
  await test("Inactive duels reject votes", async () => {
    await db.query("UPDATE public.duels SET active=false WHERE id=$1", [duel]);
    await assert.rejects(
      () => rpc("record_duel_vote_atomic", [duel, "abcdef1234567890", 0]),
      /Duel not found/,
    );
  });
  await test("Rolling rate limit enforces its configured limit", async () => {
    for (let i = 0; i < 3; i++)
      assert.equal(
        (await rpc("record_and_check_rate_limit", [device, "submit_post", 3, 60])).allowed,
        true,
      );
    assert.equal(
      (await rpc("record_and_check_rate_limit", [device, "submit_post", 3, 60])).allowed,
      false,
    );
  });
  await test("Echo cap is enforced in a transaction and unpublished posts reject replies", async () => {
    for (let i = 0; i < 50; i++)
      await rpc("insert_echo_atomic", [post, `Reply ${i}`, null, device, null]);
    await assert.rejects(
      () => rpc("insert_echo_atomic", [post, "One extra", null, device, null]),
      /Echo limit/,
    );
    await db.query("UPDATE public.unsaids SET status='review' WHERE id=$1", [post]);
    await assert.rejects(
      () => rpc("insert_echo_atomic", [post, "Hidden reply", null, device, null]),
      /Post not found/,
    );
  });
  await test("Daily reward can only be claimed once", async () => {
    assert.equal((await rpc("claim_daily_bonus_atomic", [user, 5])).warmth_total, 5);
    await assert.rejects(() => rpc("claim_daily_bonus_atomic", [user, 5]), /already claimed/);
  });
  await test("Reporting rejects self-reports and duplicate reports", async () => {
    assert.equal((await rpc("append_veto_atomic", [post, device])).code, "SELF_VETO_FORBIDDEN");
    assert.equal((await rpc("append_veto_atomic", [post, "0000000000000099"])).success, true);
    assert.equal(
      (await rpc("append_veto_atomic", [post, "0000000000000099"])).code,
      "ALREADY_REPORTED",
    );
  });
  await test("Purchase is atomic and cannot overspend or purchase twice", async () => {
    const a = await rpc("purchase_store_item_atomic", [user, "test-item", 3]);
    assert.equal(a.warmth_total, 2);
    assert.deepEqual(a.purchased_items, ["test-item"]);
    await assert.rejects(
      () => rpc("purchase_store_item_atomic", [user, "test-item", 3]),
      /already purchased/,
    );
    await assert.rejects(
      () => rpc("purchase_store_item_atomic", [user, "another-item", 3]),
      /Insufficient/,
    );
    assert.equal(
      (await query("SELECT warmth_total FROM public.profiles WHERE id=$1", [user]))[0].warmth_total,
      2,
    );
  });
  await test("Posting cooldown is enforced across browser tokens on the same account", async () => {
    await rpc("insert_post_atomic", [
      "A quiet afternoon",
      null,
      "ffffffffffffffff",
      user2,
      "Silent Thoughts",
      "midnight-static",
      "published",
    ]);
    await assert.rejects(
      () =>
        rpc("insert_post_atomic", [
          "A second thought",
          null,
          "eeeeeeeeeeeeeeee",
          user2,
          "Silent Thoughts",
          "midnight-static",
          "published",
        ]),
      /one thought every 12 hours/,
    );
    await assert.rejects(
      () =>
        rpc("insert_post_atomic", [
          "A guest retry",
          null,
          "ffffffffffffffff",
          null,
          "Silent Thoughts",
          "midnight-static",
          "published",
        ]),
      /one thought every 12 hours/,
    );
  });
  await test("Durable push queue is idempotent and retries undelivered messages", async () => {
    await db.query(
      "INSERT INTO public.anonymous_subscriptions(device_token,endpoint,p256dh,auth) VALUES($1,$2,$3,$4)",
      [device, "https://fcm.googleapis.com/fcm/send/test", "public-key", "auth-key"],
    );
    assert.equal(await rpc("enqueue_winner_push", [123456, { title: "A new pick" }]), 1);
    assert.equal(await rpc("enqueue_winner_push", [123456, { title: "A new pick" }]), 0);
    const batch = await rpc("claim_push_batch", [25]);
    assert.equal(batch.length, 1);
    assert.equal((await rpc("claim_push_batch", [25])).length, 0);
    await rpc("complete_push_batch", [[{ id: batch[0].id, success: false, expired: false }]]);
    assert.equal((await query("SELECT state FROM public.push_outbox"))[0].state, "pending");
    await db.exec("UPDATE public.push_outbox SET next_attempt=now()-interval '1 second'");
    const retry = await rpc("claim_push_batch", [25]);
    assert.equal(retry.length, 1);
    await rpc("complete_push_batch", [[{ id: retry[0].id, success: true, expired: false }]]);
    assert.equal((await query("SELECT state FROM public.push_outbox"))[0].state, "delivered");
  });
  await test("Both public roles are denied private tables and all mutation RPCs", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const table of [
        "profiles",
        "unsaids",
        "echoes",
        "reactions",
        "duel_votes",
        "device_actions",
        "echo_reports",
        "anonymous_subscriptions",
        "push_delivery_logs",
        "push_outbox",
        "moderation_queue",
      ]) {
        assert.equal(
          (
            await query("SELECT has_table_privilege($1, $2, 'SELECT') AS allowed", [
              role,
              `public.${table}`,
            ])
          )[0].allowed,
          false,
          `${role} ${table}`,
        );
        assert.equal(
          (
            await query("SELECT has_table_privilege($1, $2, 'INSERT') AS allowed", [
              role,
              `public.${table}`,
            ])
          )[0].allowed,
          false,
        );
      }
      const functions = await query(
        `SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`,
      );
      for (const fn of functions)
        assert.equal(
          (
            await query("SELECT has_function_privilege($1, $2::oid, 'EXECUTE') AS allowed", [
              role,
              fn.oid,
            ])
          )[0].allowed,
          false,
        );
    }
    assert.equal(
      (
        await query(
          "SELECT has_table_privilege('service_role','public.unsaids','INSERT') AS allowed",
        )
      )[0].allowed,
      true,
    );
  });
  console.log(`${passed} database behavior/security checks passed in isolated PostgreSQL.`);
} finally {
  await db.close();
}
