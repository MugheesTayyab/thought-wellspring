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
  await test("Single report immediately appears in moderation_queue view while post remains published", async () => {
    const pId = "44444444-4444-4444-8444-444444444444";
    await db.query(
      "INSERT INTO public.unsaids(id,text,category,device_token,status) VALUES($1, 'Public reported confession', 'Silent Thoughts', 'author1111111111', 'published')",
      [pId],
    );
    const r1 = await rpc("report_post_atomic", [pId, "reporter11111111", "Suspicious claim"]);
    assert.equal(r1.success, true);
    assert.equal(r1.quarantined, false);

    // Verify post is STILL published
    const [postRow] = await query("SELECT status FROM public.unsaids WHERE id=$1", [pId]);
    assert.equal(postRow.status, "published");

    // Verify post is IMMEDIATELY visible in moderation_queue
    const qRows = await query("SELECT * FROM public.moderation_queue WHERE id=$1", [pId]);
    assert.equal(qRows.length, 1);
    assert.equal(qRows[0].open_report_count, 1);
    assert.equal(qRows[0].triage_bucket, "REPORTED_VISIBLE");
    assert.equal(qRows[0].latest_reason, "Suspicious claim");
  });
  await test("Three reports auto-quarantines post and logs audit entry", async () => {
    const pId = "44444444-4444-4444-8444-444444444444";
    await rpc("report_post_atomic", [pId, "reporter22222222", "Spam"]);
    const r3 = await rpc("report_post_atomic", [pId, "reporter33333333", "Threatening"]);
    assert.equal(r3.quarantined, true);

    const [postRow] = await query("SELECT status FROM public.unsaids WHERE id=$1", [pId]);
    assert.equal(postRow.status, "review");

    // Verify audit log has auto_quarantine record
    const auditRows = await query(
      "SELECT * FROM public.moderation_audit_log WHERE unsaid_id=$1 AND action_type='auto_quarantine'",
      [pId],
    );
    assert.equal(auditRows.length, 1);
    assert.equal(auditRows[0].new_status, "review");
  });
  await test("Reported echo appears in echo_moderation_queue and hides from public read after reject", async () => {
    const pId = "55555555-5555-4555-8555-555555555555";
    await db.query(
      "INSERT INTO public.unsaids(id,text,category,device_token,status) VALUES($1, 'Public parent for echo test', 'Silent Thoughts', 'author5555555555', 'published')",
      [pId],
    );
    const eId = (await rpc("insert_echo_atomic", [pId, "Offensive reply text", null, "echo_author11111", null])).id;

    // Report echo
    const repRes = await rpc("report_echo_atomic", [eId, "reporter11111111", "Defamation"]);
    assert.equal(repRes.success, true);

    // Verify echo appears in echo_moderation_queue with parent post text
    const eqRows = await query("SELECT * FROM public.echo_moderation_queue WHERE id=$1", [eId]);
    assert.equal(eqRows.length, 1);
    assert.equal(eqRows[0].open_report_count, 1);
    assert.equal(eqRows[0].parent_post_text, "Public parent for echo test");

    // Moderate echo: reject
    const modRes = await rpc("moderate_echo_atomic", [eId, "reject", "mod-user-1", "Violates terms"]);
    assert.equal(modRes.success, true);
    assert.equal(modRes.new_status, "rejected");

    // Verify public query (status = published) excludes the rejected echo
    const pubEchoes = await query("SELECT * FROM public.echoes WHERE id=$1 AND status='published'", [eId]);
    assert.equal(pubEchoes.length, 0);
  });
  await test("Moderator actions atomically transition post state and record audit", async () => {
    const pId = "44444444-4444-4444-8444-444444444444";
    // Currently in 'review'. Moderate to 'approve'
    const appRes = await rpc("moderate_post_atomic", [pId, "approve", "mod-user-1", "Verified safe"]);
    assert.equal(appRes.success, true);
    assert.equal(appRes.new_status, "published");

    // Open reports should now be 'actioned'
    const openReports = await query("SELECT * FROM public.post_reports WHERE post_id=$1 AND status='open'", [pId]);
    assert.equal(openReports.length, 0);

    // Audit log should have manual_approve
    const auditRows = await query(
      "SELECT * FROM public.moderation_audit_log WHERE unsaid_id=$1 AND action_type='manual_approve'",
      [pId],
    );
    assert.equal(auditRows.length, 1);
  });
  await test("Fix 1: Single fabricated urgent report does NOT quarantine published content", async () => {
    const pId = "66666666-6666-4666-8666-666666666666";
    await db.query(
      "INSERT INTO public.unsaids(id,text,category,device_token,status) VALUES($1, 'Legitimate confession to test fabricated report', 'Silent Thoughts', 'author6666666666', 'published')",
      [pId],
    );

    // Malicious user attempts to immediately quarantine by fabricating urgent text
    const maliciousReport = await rpc("report_post_atomic", [
      pId,
      "attacker11111111",
      "blackmail leak suicide doxx personal number address",
    ]);
    assert.equal(maliciousReport.success, true);
    assert.equal(maliciousReport.quarantined, false, "Post must NOT be quarantined on uncorroborated report");

    // Post must still be published
    const [postRow] = await query("SELECT status FROM public.unsaids WHERE id=$1", [pId]);
    assert.equal(postRow.status, "published");

    // But owner notification must be prioritized as urgent
    const [notif] = await query(
      "SELECT priority, event_type FROM public.moderation_notifications WHERE target_id=$1 ORDER BY created_at DESC LIMIT 1",
      [pId],
    );
    assert.equal(notif.priority, "urgent");
    assert.equal(notif.event_type, "post_report");

    // Repeat check for Echo
    const eId = (await rpc("insert_echo_atomic", [pId, "Legitimate Echo reply", null, "author_echo66666", null])).id;
    const maliciousEchoReport = await rpc("report_echo_atomic", [
      eId,
      "attacker22222222",
      "blackmail threat leak",
    ]);
    assert.equal(maliciousEchoReport.success, true);
    assert.equal(maliciousEchoReport.quarantined, false, "Echo must NOT be quarantined on uncorroborated report");

    const [echoRow] = await query("SELECT status FROM public.echoes WHERE id=$1", [eId]);
    assert.equal(echoRow.status, "published");
  });
  await test("Fix 2: Reporting rejected content is rejected and state machine prevents invalid transitions", async () => {
    const pId = "66666666-6666-4666-8666-666666666666";
    // 1. Moderator rejects the post
    const rejRes = await rpc("moderate_post_atomic", [pId, "reject", "mod-user-1", "Spam post"]);
    assert.equal(rejRes.success, true);
    assert.equal(rejRes.new_status, "rejected");

    // 2. Reporting an already-rejected post must be rejected with POST_ALREADY_REJECTED
    const repRejected = await rpc("report_post_atomic", [pId, "newreporter33333", "Another report"]);
    assert.equal(repRejected.success, false);
    assert.equal(repRejected.code, "POST_ALREADY_REJECTED");

    // 3. Invalid transition: cannot approve directly from rejected (must use restore)
    const invApprove = await rpc("moderate_post_atomic", [pId, "approve", "mod-user-1", "Try direct approve"]);
    assert.equal(invApprove.success, false);
    assert.equal(invApprove.code, "INVALID_TRANSITION");

    // 4. Invalid transition: cannot hide an already rejected post
    const invHide = await rpc("moderate_post_atomic", [pId, "hide", "mod-user-1", "Try hide"]);
    assert.equal(invHide.success, false);
    assert.equal(invHide.code, "INVALID_TRANSITION");

    // 5. Invalid transition: cannot reject an already rejected post
    const invRej = await rpc("moderate_post_atomic", [pId, "reject", "mod-user-1", "Try reject again"]);
    assert.equal(invRej.success, false);
    assert.equal(invRej.code, "INVALID_TRANSITION");

    // 6. Valid transition: restore brings post back to published
    const restoreRes = await rpc("moderate_post_atomic", [pId, "restore", "mod-user-1", "Restore post"]);
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.new_status, "published");

    // 7. Invalid transition: cannot restore a post that is already published
    const invRestore = await rpc("moderate_post_atomic", [pId, "restore", "mod-user-1", "Restore again"]);
    assert.equal(invRestore.success, false);
    assert.equal(invRestore.code, "INVALID_TRANSITION");

    // 8. Invalid transition: cannot dismiss reports when open report count is 0
    const invDismiss = await rpc("moderate_post_atomic", [pId, "dismiss_reports", "mod-user-1", "Dismiss empty"]);
    assert.equal(invDismiss.success, false);
    assert.equal(invDismiss.code, "INVALID_TRANSITION");

    // Check same transitions for Echo
    const [echoRow] = await query("SELECT id FROM public.echoes WHERE unsaid_id=$1 LIMIT 1", [pId]);
    const eId = echoRow.id;
    await rpc("moderate_echo_atomic", [eId, "reject", "mod-user-1", "Reject echo"]);

    const repEchoRej = await rpc("report_echo_atomic", [eId, "newreporter44444", "Echo report"]);
    assert.equal(repEchoRej.success, false);
    assert.equal(repEchoRej.code, "ECHO_ALREADY_REJECTED");

    const invEchoApp = await rpc("moderate_echo_atomic", [eId, "approve", "mod-user-1", "Direct approve echo"]);
    assert.equal(invEchoApp.success, false);
    assert.equal(invEchoApp.code, "INVALID_TRANSITION");
  });
  await test("Fix 3: Legacy report migration is backward-compatible, accurate, and idempotent", async () => {
    const legacyPost1 = "77777777-7777-4777-8777-777777777777";
    const legacyPost2 = "88888888-8888-4888-8888-888888888888";
    await db.query(
      `INSERT INTO public.unsaids(id, text, category, device_token, status, vetoed_by, veto_count)
       VALUES 
       ($1, 'Legacy published post', 'Silent Thoughts', 'legacy_author111', 'published', ARRAY['legacytoken11111', 'legacytoken22222'], 2),
       ($2, 'Legacy rejected post', 'Silent Thoughts', 'legacy_author222', 'rejected', ARRAY['legacytoken33333'], 1)`,
      [legacyPost1, legacyPost2],
    );

    // Run reconciliation query
    await db.exec(`
      INSERT INTO public.post_reports (post_id, reporter_device_token, reason, status, created_at)
      SELECT 
          u.id AS post_id,
          d.token AS reporter_device_token,
          'Legacy community report' AS reason,
          CASE WHEN u.status = 'rejected' THEN 'actioned' ELSE 'open' END AS status,
          COALESCE(u.updated_at, u.created_at, NOW()) AS created_at
      FROM public.unsaids u
      CROSS JOIN LATERAL UNNEST(u.vetoed_by) AS d(token)
      WHERE u.vetoed_by IS NOT NULL 
        AND array_length(u.vetoed_by, 1) > 0
        AND char_length(d.token) = 16
      ON CONFLICT (post_id, reporter_device_token) DO NOTHING;
    `);

    // Verify open reports populated for published post
    const rep1 = await query("SELECT * FROM public.post_reports WHERE post_id=$1 ORDER BY reporter_device_token", [legacyPost1]);
    assert.equal(rep1.length, 2);
    assert.equal(rep1[0].status, "open");
    assert.equal(rep1[0].reason, "Legacy community report");
    assert.equal(rep1[1].status, "open");

    // Verify actioned report populated for rejected post
    const rep2 = await query("SELECT * FROM public.post_reports WHERE post_id=$1", [legacyPost2]);
    assert.equal(rep2.length, 1);
    assert.equal(rep2[0].status, "actioned");

    // Verify queue reflects open reports from legacy migration
    const queueRows = await query("SELECT * FROM public.moderation_queue WHERE id=$1", [legacyPost1]);
    assert.equal(queueRows.length, 1);
    assert.equal(queueRows[0].open_report_count, 2);
    assert.equal(queueRows[0].unique_reporters, 2);

    // Verify idempotency: re-running does not throw or insert duplicates
    const countBefore = (await query("SELECT COUNT(*)::INT AS c FROM public.post_reports"))[0].c;
    await db.exec(`
      INSERT INTO public.post_reports (post_id, reporter_device_token, reason, status, created_at)
      SELECT 
          u.id AS post_id,
          d.token AS reporter_device_token,
          'Legacy community report' AS reason,
          CASE WHEN u.status = 'rejected' THEN 'actioned' ELSE 'open' END AS status,
          COALESCE(u.updated_at, u.created_at, NOW()) AS created_at
      FROM public.unsaids u
      CROSS JOIN LATERAL UNNEST(u.vetoed_by) AS d(token)
      WHERE u.vetoed_by IS NOT NULL 
        AND array_length(u.vetoed_by, 1) > 0
        AND char_length(d.token) = 16
      ON CONFLICT (post_id, reporter_device_token) DO NOTHING;
    `);
    const countAfter = (await query("SELECT COUNT(*)::INT AS c FROM public.post_reports"))[0].c;
    assert.equal(countBefore, countAfter, "Reconciliation must be strictly idempotent");
  });
  await test("Fix 4: Notification delivery lifecycle, delivered status protection, and escalations", async () => {
    const targetPost = "99999999-9999-4999-8999-999999999999";

    // 1. Enqueue first report -> pending notification created
    await db.query(
      "SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Preview 1', 'Cat', 'Reason 1', 'normal')",
      [targetPost],
    );
    const notifs1 = await query("SELECT * FROM public.moderation_notifications WHERE target_id=$1", [targetPost]);
    assert.equal(notifs1.length, 1);
    assert.equal(notifs1[0].status, "pending");
    assert.equal(notifs1[0].report_count, 1);

    // 2. Enqueue second report while still pending -> burst grouping increments report_count
    await db.query(
      "SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Preview 1', 'Cat', 'Reason 2', 'normal')",
      [targetPost],
    );
    const notifs2 = await query("SELECT * FROM public.moderation_notifications WHERE target_id=$1", [targetPost]);
    assert.equal(notifs2.length, 1, "Should group into existing pending notification");
    assert.equal(notifs2[0].report_count, 2);

    // 3. Claim with lease token and complete as delivered
    const claimed = await query("SELECT * FROM public.claim_moderation_notifications(10)");
    const targetClaimed = claimed.find((n) => n.target_id === targetPost);
    assert.ok(targetClaimed);
    assert.ok(targetClaimed.claim_token, "Claimed item must have a valid claim_token");

    const completeRes = await rpc("complete_moderation_notification", [targetClaimed.id, targetClaimed.claim_token, true, null]);
    assert.equal(completeRes.success, true);
    assert.equal(completeRes.code, "DELIVERED");

    const [deliveredNotif] = await query("SELECT * FROM public.moderation_notifications WHERE id=$1", [targetClaimed.id]);
    assert.equal(deliveredNotif.status, "delivered");
    assert.equal(deliveredNotif.claim_token, null);
    assert.equal(deliveredNotif.claim_expires_at, null);
    assert.ok(deliveredNotif.delivered_at);

    // 4. Enqueue subsequent event after delivery -> MUST create a NEW pending notification
    await db.query(
      "SELECT public.enqueue_moderation_notification('quarantine', 'post', $1, 'Preview escalated', 'Cat', 'Quarantined', 'urgent')",
      [targetPost],
    );
    const notifsAfterDelivery = await query(
      "SELECT * FROM public.moderation_notifications WHERE target_id=$1 ORDER BY created_at ASC",
      [targetPost],
    );
    assert.equal(notifsAfterDelivery.length, 2, "Must create a new notification row, not overwrite delivered one");
    assert.equal(notifsAfterDelivery[0].status, "delivered", "First notification must remain delivered");
    assert.equal(notifsAfterDelivery[1].status, "pending", "New notification must be pending");
    assert.equal(notifsAfterDelivery[1].priority, "urgent");
    assert.equal(notifsAfterDelivery[1].event_type, "quarantine");

    // 5. Test claim & retry failure threshold
    const claim2 = await query("SELECT * FROM public.claim_moderation_notifications(10)");
    const notif2Claimed = claim2.find((n) => n.id === notifsAfterDelivery[1].id);
    assert.ok(notif2Claimed);
    assert.ok(notif2Claimed.claim_token);

    // Attempt 1 fails
    const failRes1 = await rpc("complete_moderation_notification", [notif2Claimed.id, notif2Claimed.claim_token, false, "Network error 1"]);
    assert.equal(failRes1.success, true);
    assert.equal(failRes1.code, "RETRY_SCHEDULED");

    let [failedAttempt1] = await query("SELECT status, attempts, claim_token FROM public.moderation_notifications WHERE id=$1", [notif2Claimed.id]);
    assert.equal(failedAttempt1.status, "pending");
    assert.equal(failedAttempt1.attempts, 1);
    assert.equal(failedAttempt1.claim_token, null, "Claim token must be cleared on failed retry");

    // Fast-forward next_attempt to test attempt 2
    await db.query("UPDATE public.moderation_notifications SET next_attempt = NOW() - INTERVAL '1 second' WHERE id=$1", [notif2Claimed.id]);
    const claimAttempt2 = await query("SELECT * FROM public.claim_moderation_notifications(10)");
    const notif2Attempt2 = claimAttempt2.find((n) => n.id === notifsAfterDelivery[1].id);
    assert.ok(notif2Attempt2);
    assert.notEqual(notif2Attempt2.claim_token, notif2Claimed.claim_token, "Attempt 2 must generate a fresh claim token");

    await rpc("complete_moderation_notification", [notif2Attempt2.id, notif2Attempt2.claim_token, false, "Network error 2"]);

    // Fast-forward next_attempt to test attempt 3 (max attempts -> final failure)
    await db.query("UPDATE public.moderation_notifications SET next_attempt = NOW() - INTERVAL '1 second' WHERE id=$1", [notif2Claimed.id]);
    const claimAttempt3 = await query("SELECT * FROM public.claim_moderation_notifications(10)");
    const notif2Attempt3 = claimAttempt3.find((n) => n.id === notifsAfterDelivery[1].id);
    assert.ok(notif2Attempt3);

    const failRes3 = await rpc("complete_moderation_notification", [notif2Attempt3.id, notif2Attempt3.claim_token, false, "Network error 3"]);
    assert.equal(failRes3.success, true);
    assert.equal(failRes3.code, "FAILED");

    let [finalFailed] = await query("SELECT status, attempts, claim_token FROM public.moderation_notifications WHERE id=$1", [notif2Claimed.id]);
    assert.equal(finalFailed.status, "failed");
    assert.equal(finalFailed.attempts, 3);
    assert.equal(finalFailed.claim_token, null);
  });
  await test("Atomic claim tokens: Concurrent claims partition disjoint notifications", async () => {
    const postC1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const postC2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.query("SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Item 1', 'Cat', 'R1', 'normal')", [postC1]);
    await db.query("SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Item 2', 'Cat', 'R2', 'normal')", [postC2]);

    // Worker A claims 1 item
    const workerAClaims = await query("SELECT * FROM public.claim_moderation_notifications(1)");
    assert.equal(workerAClaims.length, 1);
    const workerAItem = workerAClaims[0];

    // Worker B claims 1 item concurrently
    const workerBClaims = await query("SELECT * FROM public.claim_moderation_notifications(1)");
    assert.equal(workerBClaims.length, 1);
    const workerBItem = workerBClaims[0];

    // Ensure disjoint claims and different claim tokens
    assert.notEqual(workerAItem.id, workerBItem.id, "Concurrent workers must claim disjoint items");
    assert.notEqual(workerAItem.claim_token, workerBItem.claim_token, "Claim tokens must be unique per worker");

    // Clean up claims
    await rpc("complete_moderation_notification", [workerAItem.id, workerAItem.claim_token, true, null]);
    await rpc("complete_moderation_notification", [workerBItem.id, workerBItem.claim_token, true, null]);
  });
  await test("Atomic claim tokens: Expired leases, stale completion rejection, and delivered immunity", async () => {
    const targetPost = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await db.query(
      "SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Lease race item', 'Cat', 'Race test', 'high')",
      [targetPost],
    );

    // 1. Worker 1 claims notification with a 2-second lease
    const worker1Claims = await query("SELECT * FROM public.claim_moderation_notifications(10, 2)");
    const w1Notif = worker1Claims.find((n) => n.target_id === targetPost);
    assert.ok(w1Notif);
    const w1Token = w1Notif.claim_token;

    // 2. Simulate worker 1 hanging and its lease expiring
    await db.query(
      "UPDATE public.moderation_notifications SET claim_expires_at = NOW() - INTERVAL '1 second', next_attempt = NOW() - INTERVAL '1 second' WHERE id = $1",
      [w1Notif.id],
    );

    // Verify lease expiration check: if worker 1 attempts completion after expiry (before any other claim)
    const expiredAttempt = await rpc("complete_moderation_notification", [w1Notif.id, w1Token, true, null]);
    assert.equal(expiredAttempt.success, false);
    assert.equal(expiredAttempt.code, "LEASE_EXPIRED");

    // 3. Worker 2 claims the newly eligible notification after Worker 1's lease expired
    const worker2Claims = await query("SELECT * FROM public.claim_moderation_notifications(10, 120)");
    const w2Notif = worker2Claims.find((n) => n.id === w1Notif.id);
    assert.ok(w2Notif, "Worker 2 must successfully claim item with expired lease");
    const w2Token = w2Notif.claim_token;
    assert.notEqual(w2Token, w1Token, "Worker 2 must receive a new claim token");

    // 4. Stale completion attempt: Worker 1 finally awakens and tries to complete with stale w1Token
    const staleCompletion = await rpc("complete_moderation_notification", [w1Notif.id, w1Token, true, null]);
    assert.equal(staleCompletion.success, false);
    assert.equal(staleCompletion.code, "STALE_CLAIM_TOKEN", "Stale worker completion attempt must be rejected");

    // 5. Worker 2 successfully delivers the notification
    const w2Delivery = await rpc("complete_moderation_notification", [w2Notif.id, w2Token, true, null]);
    assert.equal(w2Delivery.success, true);
    assert.equal(w2Delivery.code, "DELIVERED");

    // 6. Delivered immunity: Late failure callback from Worker 1 arrives after delivery
    const lateFailureCallback = await rpc("complete_moderation_notification", [
      w1Notif.id,
      w1Token,
      false,
      "Worker 1 late timeout failure",
    ]);
    assert.equal(lateFailureCallback.success, false);
    assert.equal(lateFailureCallback.code, "ALREADY_DELIVERED", "Delivered notification cannot be modified by late failure");

    // Also verify late callback even if someone passes w2Token after delivery
    const lateCallbackWithW2Token = await rpc("complete_moderation_notification", [
      w2Notif.id,
      w2Token,
      false,
      "Another late failure callback",
    ]);
    assert.equal(lateCallbackWithW2Token.success, false);
    assert.equal(lateCallbackWithW2Token.code, "ALREADY_DELIVERED");

    // 7. Verify database record is completely uncorrupted and still delivered
    const [finalRow] = await query("SELECT * FROM public.moderation_notifications WHERE id = $1", [w1Notif.id]);
    assert.equal(finalRow.status, "delivered");
    assert.equal(finalRow.last_error, null, "last_error must remain NULL despite late failure callbacks");
    assert.equal(finalRow.claim_token, null);
    assert.equal(finalRow.claim_expires_at, null);
  });
  await test("Atomic claim tokens: Never group new alerts into notifications currently claimed by a worker", async () => {
    const postD = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    // 1. Initial alert enqueued
    await db.query(
      "SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Active claim test', 'Cat', 'Initial concern', 'normal')",
      [postD],
    );

    // 2. Worker claims notification with 120s lease
    const claims = await query("SELECT * FROM public.claim_moderation_notifications(10, 120)");
    const claimedItem = claims.find((n) => n.target_id === postD);
    assert.ok(claimedItem);
    assert.equal(claimedItem.report_count, 1);

    // 3. New alert arrives WHILE item is actively claimed by worker
    await db.query(
      "SELECT public.enqueue_moderation_notification('post_report', 'post', $1, 'Active claim test', 'Cat', 'Second concern', 'high')",
      [postD],
    );

    // 4. Assert: Claimed notification was NOT grouped into; a distinct pending notification was created
    const notifs = await query(
      "SELECT * FROM public.moderation_notifications WHERE target_id = $1 ORDER BY created_at ASC",
      [postD],
    );
    assert.equal(notifs.length, 2, "Must create a new notification row rather than grouping into claimed item");
    assert.equal(notifs[0].id, claimedItem.id);
    assert.equal(notifs[0].report_count, 1, "Claimed item report_count must not be modified");
    assert.equal(notifs[1].status, "pending");
    assert.equal(notifs[1].report_count, 1);
    assert.equal(notifs[1].claim_token, null, "New item must be unclaimed and available");

    // 5. Worker delivers initial item
    const delivered = await rpc("complete_moderation_notification", [claimedItem.id, claimedItem.claim_token, true, null]);
    assert.equal(delivered.success, true);
    assert.equal(delivered.code, "DELIVERED");

    // 6. Subsequent worker run picks up the second notification
    const secondClaims = await query("SELECT * FROM public.claim_moderation_notifications(10, 120)");
    const secondClaimedItem = secondClaims.find((n) => n.id === notifs[1].id);
    assert.ok(secondClaimedItem, "Second notification must be claimed in next worker batch");
    assert.notEqual(secondClaimedItem.claim_token, claimedItem.claim_token);

    // Complete second notification
    await rpc("complete_moderation_notification", [secondClaimedItem.id, secondClaimedItem.claim_token, true, null]);
  });
  await test("Accurate database-derived moderation counts RPC", async () => {
    const counts = await rpc("get_moderation_counts", []);
    assert.equal(typeof counts.unresolved_reports, "number");
    assert.equal(typeof counts.auto_flagged_posts, "number");
    assert.equal(typeof counts.quarantined_content, "number");
    assert.equal(typeof counts.recently_resolved_24h, "number");
    assert.equal(counts.recently_resolved_24h >= 2, true);
  });
  await test("Editorial Collection: Atomic import, deterministic ordering, and idempotent re-run", async () => {
    // 1. Import BH-001
    const res1 = await rpc("import_editorial_seed_atomic", [
      "BH-001",
      1,
      "I told my family I had an early lecture so I could escape the mehndi before the aunties asked about marriage.",
      "Spill The Tea",
      "BajiHears Original / Fictional Scenario",
      JSON.stringify({ language: "Roman Urdu", country: "Pakistan", quality_score: 92 }),
      "published",
    ]);
    assert.equal(res1.success, true);
    assert.equal(res1.seed_id, "BH-001");
    const postUuid1 = res1.id;

    // 2. Import BH-002
    const res2 = await rpc("import_editorial_seed_atomic", [
      "BH-002",
      2,
      "For six months, I thought the encouraging notes on my desk were from my manager.",
      "Plot Twist",
      "BajiHears Original / Fictional Scenario",
      JSON.stringify({ language: "Natural English", country: "India", quality_score: 93 }),
      "published",
    ]);
    assert.equal(res2.success, true);

    // 3. Verify provenance: source_type is 'editorial', device_token is NULL, handle is NULL
    const [row1] = await query("SELECT * FROM public.unsaids WHERE editorial_seed_id = 'BH-001'");
    assert.equal(row1.source_type, "editorial");
    assert.equal(row1.device_token, null, "device_token must be strictly NULL for editorial posts");
    assert.equal(row1.handle, null);
    assert.equal(row1.display_order, 1);
    assert.equal(row1.editorial_label, "BajiHears Original / Fictional Scenario");
    assert.equal(row1.reactions.heart, 0);

    // 4. Idempotency test: Re-importing BH-001 updates in-place and preserves the UUID
    const res1Re = await rpc("import_editorial_seed_atomic", [
      "BH-001",
      1,
      "I told my family I had an early lecture so I could escape the mehndi before the aunties asked about marriage (updated).",
      "Spill The Tea",
      "BajiHears Original / Fictional Scenario",
      JSON.stringify({ language: "Roman Urdu", country: "Pakistan", quality_score: 92 }),
      "published",
    ]);
    assert.equal(res1Re.success, true);
    assert.equal(res1Re.id, postUuid1, "Re-run must update existing row in-place and retain stable UUID");

    const [row1Re] = await query("SELECT text FROM public.unsaids WHERE editorial_seed_id = 'BH-001'");
    assert.ok(row1Re.text.includes("(updated)"));

    // 5. Query via get_editorial_originals: verified ordered results
    const originals = await query("SELECT * FROM public.get_editorial_originals('published')");
    assert.equal(originals.length >= 2, true);
    assert.equal(originals[0].editorial_seed_id, "BH-001");
    assert.equal(originals[1].editorial_seed_id, "BH-002");
    assert.equal(originals[0].display_order < originals[1].display_order, true);

    // 6. Reader engagement: readers CAN react and comment on editorial stories
    const readerDevice = "fedcba0987654321";
    await rpc("set_reaction_atomic", [postUuid1, readerDevice, "heart", true]);
    const [reactedRow] = await query("SELECT reactions FROM public.unsaids WHERE id = $1", [postUuid1]);
    assert.equal(reactedRow.reactions.heart, 1);

    // 7. Moderation safety: readers can report editorial stories if needed
    const reportRes = await rpc("report_post_atomic", [postUuid1, readerDevice, "Testing editorial report"]);
    assert.equal(reportRes.success, true);

    // 8. Safe rollback: deleting editorial posts removes ONLY editorial rows, never community posts
    const communityCountBefore = (await query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'"))[0].n;
    assert.ok(communityCountBefore > 0);

    await query("DELETE FROM public.unsaids WHERE source_type = 'editorial'");
    const editorialCountAfter = (await query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'editorial'"))[0].n;
    assert.equal(editorialCountAfter, 0);

    const communityCountAfter = (await query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'"))[0].n;
    assert.equal(communityCountAfter, communityCountBefore, "Rollback must never delete or modify community posts");
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
        "echo_moderation_queue",
        "post_reports",
        "moderation_notifications",
        "moderation_audit_log",
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
