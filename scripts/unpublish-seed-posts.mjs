import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

// One-off cleanup: takes the old pre-launch seed posts off the public Wall. They were
// imported with invented handles and reaction counts by the former seed migration,
// which marked every row with SEED_DEVICE_TOKEN or SEED_ID_PREFIX.
//
// Dry run by default. --apply needs --expect=<count> from the dry run, and rolls back
// if the number of matching rows differs. Rows are only moved to status 'rejected',
// so the file written to artifacts/ can restore them.
const SEED_DEVICE_TOKEN = "00000000feed0001";
const SEED_ID_PREFIX = "11111111-0000-4000-8000-%";
// Early manual test posts from 2026-09-24 to 26 ("Post one of the hour test" and similar).
// They carry no seed marker, so they are listed one by one after being read individually.
const TEST_POST_IDS = [
  "bc492bdb-e61c-4629-ae2a-01eb75392f9d",
  "33ceb344-5211-41f2-9bf4-895c7b8220ea",
  "aac6a3ee-1304-4ca6-a385-f189dc333373",
  "8e7b0c1e-7927-4f56-819f-9e64b3fecca5",
  "19096c29-c695-40f5-92be-7a7678d80997",
  "8771751c-242a-48bd-864b-d6b2c0992d6e",
  "bb071caa-2c5a-431c-a83f-c2916ab6f95c",
  "8e2bdb96-ba08-4f79-86bf-93b3063471a8",
  "33773ef5-2cab-4581-9b8d-1746ac302f36",
];

const apply = process.argv.includes("--apply");
const expected = Number(process.argv.find((arg) => arg.startsWith("--expect="))?.split("=")[1]);
if (apply && !Number.isInteger(expected)) throw new Error("--apply requires --expect=<count>");

const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
}
if (!env.SUPABASE_DATABASE_URL) throw new Error("Database configuration missing");
const url = new URL(env.SUPABASE_DATABASE_URL);
url.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt", "utf8"),
  },
  connectionTimeoutMillis: 15000,
  query_timeout: 35000,
});

const SEED_ROW = `source_type = 'community' AND (device_token = $1 OR id::text LIKE $2)`;
const params = [SEED_DEVICE_TOKEN, SEED_ID_PREFIX];

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('bajihears-release-migration'))");

  const summary = await client.query(
    `SELECT status, count(*)::int AS posts, count(handle)::int AS with_handle,
            count(profile_id)::int AS with_account, count(*) FILTER (WHERE is_winner)::int AS winners,
            min(created_at)::date::text AS first_day, max(created_at)::date::text AS last_day
     FROM public.unsaids WHERE ${SEED_ROW} GROUP BY status ORDER BY status`,
    params,
  );
  console.log("Seed rows by status");
  console.table(summary.rows);

  const others = await client.query(
    `SELECT source_type, count(*)::int AS posts, min(created_at)::date::text AS first_day,
            max(created_at)::date::text AS last_day
     FROM public.unsaids WHERE status = 'published' AND NOT (${SEED_ROW})
     GROUP BY source_type ORDER BY source_type`,
    params,
  );
  console.log("Published posts that would stay on the Wall");
  console.table(others.rows);

  const unmarked = await client.query(
    `SELECT id, created_at::date::text AS day, handle, device_token IS NOT NULL AS has_device,
            profile_id IS NOT NULL AS has_account, left(text, 70) AS preview
     FROM public.unsaids WHERE status = 'published' AND source_type = 'community' AND NOT (${SEED_ROW})
     ORDER BY created_at`,
    params,
  );
  console.log("Community posts without a seed marker (not touched by this script)");
  console.table(unmarked.rows);

  const engagement = await client.query(
    `WITH seed AS (SELECT id FROM public.unsaids WHERE status = 'published' AND ${SEED_ROW})
     SELECT (SELECT count(*)::int FROM public.reactions WHERE unsaid_id IN (SELECT id FROM seed)) AS reader_reactions,
            (SELECT count(*)::int FROM public.echoes WHERE unsaid_id IN (SELECT id FROM seed)) AS echoes`,
    params,
  );
  console.log("Activity attached to the published seed rows");
  console.table(engagement.rows);

  const targets = await client.query(
    `SELECT id FROM public.unsaids
     WHERE status = 'published' AND ((${SEED_ROW}) OR id = ANY($3::uuid[]))
     ORDER BY id FOR UPDATE`,
    [...params, TEST_POST_IDS],
  );
  console.log(`Would unpublish: ${targets.rowCount}`);

  if (!apply) {
    console.log("DRY RUN: no changes made");
    await client.query("ROLLBACK");
  } else {
    if (targets.rowCount !== expected) {
      throw new Error(`Expected ${expected} rows but matched ${targets.rowCount}; rolling back`);
    }
    const ids = targets.rows.map((row) => row.id);
    const updated = await client.query(
      `UPDATE public.unsaids SET status = 'rejected' WHERE id = ANY($1::uuid[]) AND status = 'published'`,
      [ids],
    );
    if (updated.rowCount !== expected) throw new Error("Update count mismatch; rolling back");
    await client.query(
      `INSERT INTO public.moderation_audit_log
         (unsaid_id, action_type, performed_by, previous_status, new_status, reason, target_type)
       SELECT id, 'manual_reject', 'OWNER_SEED_CLEANUP', 'published', 'rejected',
              'Pre-launch seed or test post removed from public Wall', 'post'
       FROM unnest($1::uuid[]) AS id`,
      [ids],
    );

    mkdirSync("artifacts", { recursive: true });
    const restoreFile = `artifacts/seed-posts-unpublished-${new Date().toISOString().slice(0, 10)}.json`;
    // Written before COMMIT so a successful commit can never lack its restore list.
    writeFileSync(
      restoreFile,
      JSON.stringify(
        {
          unpublishedAt: new Date().toISOString(),
          count: ids.length,
          restoreSql:
            "UPDATE public.unsaids SET status = 'published' WHERE status = 'rejected' AND id = ANY(<ids>::uuid[]);",
          ids,
        },
        null,
        2,
      ),
    );
    await client.query("COMMIT");
    console.log(`PASS unpublished ${ids.length} seed posts; restore list at ${restoreFile}`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Seed post cleanup failed:", error.code || error.name, error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
