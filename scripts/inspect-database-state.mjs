import { readFileSync } from "node:fs";
import pg from "pg";

const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
}

if (!env.SUPABASE_DATABASE_URL) throw new Error("SUPABASE_DATABASE_URL is missing.");
const databaseUrl = new URL(env.SUPABASE_DATABASE_URL);
databaseUrl.searchParams.delete("sslmode");
const caPath = env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt";
const client = new pg.Client({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: true, ca: readFileSync(caPath, "utf8") },
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});

try {
  await client.connect();
  const objects = await client.query(`
    SELECT
      to_regclass('public.push_outbox') IS NOT NULL AS push_outbox,
      to_regclass('public.moderation_notifications') IS NOT NULL AS moderation_notifications,
      to_regprocedure('public.insert_post_atomic(text,text,text,uuid,text,text,text)') IS NOT NULL AS insert_post,
      to_regprocedure('public.enqueue_winner_push(bigint,jsonb)') IS NOT NULL AS enqueue_push,
      to_regprocedure('public.get_editorial_originals(text)') IS NOT NULL AS get_editorial_originals,
      has_table_privilege('anon', 'public.unsaids', 'select') AS anon_unsaids_select,
      has_table_privilege('anon', 'public.profiles', 'select') AS anon_profiles_select
  `);
  const identity = await client.query(`
    SELECT current_database() AS database, current_user AS user,
      inet_server_addr()::text AS server_address
  `);
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  let migrations = [];
  try {
    migrations = (
      await client.query(
        "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version",
      )
    ).rows;
  } catch (error) {
    migrations = [{ error: error.code }];
  }
  const requiredTables = [
    "echo_reports",
    "moderation_notifications",
    "post_reports",
    "push_outbox",
  ];
  const requiredMigrations = [
    "20260924000000",
    "20260925000000",
    "20260926000000",
    "20260927000000",
    "20260928000000",
    "20261020000000",
    "20261022000000",
    "20261022010000",
    "20261022020000",
    "20261023000000",
    "20261024000000",
    "20261025000000",
  ];
  const tableNames = tables.rows.map(({ table_name }) => table_name);
  const appliedVersions = migrations.map(({ version }) => version).filter(Boolean);
  const operational = {};
  if (tableNames.includes("moderation_notifications")) {
    operational.moderationNotifications = (
      await client.query(`
        SELECT status, count(*)::int AS count, min(created_at) AS oldest
        FROM public.moderation_notifications GROUP BY status ORDER BY status
      `)
    ).rows;
  }
  if (tableNames.includes("push_outbox")) {
    operational.pushOutbox = (
      await client.query(`
        SELECT state, count(*)::int AS count, min(created_at) AS oldest
        FROM public.push_outbox GROUP BY state ORDER BY state
      `)
    ).rows;
  }
  if (tableNames.includes("winner_cycles")) {
    operational.latestWinnerCycle = (
      await client.query(`
        SELECT cycle_start, cycle_end, status, created_at
        FROM public.winner_cycles ORDER BY cycle_end DESC LIMIT 1
      `)
    ).rows[0] ?? null;
  }
  if (objects.rows[0].get_editorial_originals) {
    operational.editorial = (
      await client.query(`
        SELECT count(*)::int AS count,
          min(display_order)::int AS first_order,
          max(display_order)::int AS last_order,
          count(*) FILTER (WHERE status <> 'published')::int AS not_published
        FROM public.unsaids WHERE source_type = 'editorial'
      `)
    ).rows[0];
  } else {
    operational.editorial = { available: false };
  }
  const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
  const missingMigrations = requiredMigrations.filter(
    (version) => !appliedVersions.includes(version),
  );
  console.log(
    JSON.stringify(
      {
        identity: identity.rows[0],
        objects: objects.rows[0],
        tables: tableNames,
        migrations,
        operational,
      },
      null,
      2,
    ),
  );
  if (
    missingTables.length ||
    missingMigrations.length ||
    !objects.rows[0].insert_post ||
    !objects.rows[0].enqueue_push ||
    !objects.rows[0].moderation_notifications ||
    !objects.rows[0].get_editorial_originals ||
    objects.rows[0].anon_unsaids_select ||
    objects.rows[0].anon_profiles_select
  ) {
    throw new Error(
      `Production schema is not release-ready (missing tables: ${missingTables.join(", ") || "none"}; missing migrations: ${missingMigrations.join(", ") || "none"}).`,
    );
  }
  console.log("PASS production migration history, RPCs, and direct table privileges.");
} finally {
  await client.end();
}
