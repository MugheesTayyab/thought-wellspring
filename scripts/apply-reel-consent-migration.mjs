import { readFileSync } from "node:fs";
import pg from "pg";

// Deliberately limited to the reviewed reel-consent migration. Dry run by default.
const version = "20261109000000";
const name = "reel_consent";
// The file carries its own BEGIN/COMMIT. They're removed here so it runs inside this
// script's transaction, and a failed check below can still roll everything back.
const sql = readFileSync(`supabase/migrations/${version}_${name}.sql`, "utf8").replace(
  /^\s*(BEGIN|COMMIT);\s*$/gm,
  "",
);
const signature = "public.insert_post_atomic(text,text,text,uuid,text,text,text,boolean)";
const oldSignature = "public.insert_post_atomic(text,text,text,uuid,text,text,text)";

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

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('bajihears-release-migration'))");
  const existing = await client.query(
    "SELECT version FROM supabase_migrations.schema_migrations WHERE version=$1",
    [version],
  );
  const before = (
    await client.query(`SELECT
      to_regprocedure('${oldSignature}') IS NOT NULL AS old_function,
      (SELECT count(*)::int FROM public.unsaids) AS posts`)
  ).rows[0];

  if (existing.rowCount) {
    console.log(`PASS migration ${version} already recorded; no changes made`);
  } else if (!process.argv.includes("--apply")) {
    console.log(
      `PENDING ${version}_${name}; old function present: ${before.old_function}; posts: ${before.posts}`,
    );
  } else {
    if (!before.old_function) throw new Error("Expected function signature is missing; stopped");
    await client.query(sql);

    const check = (
      await client.query(`SELECT
        has_function_privilege('service_role', '${signature}', 'execute') AS server,
        has_function_privilege('anon', '${signature}', 'execute') AS anon,
        has_function_privilege('authenticated', '${signature}', 'execute') AS authenticated,
        to_regprocedure('${oldSignature}') IS NOT NULL AS old_function,
        (SELECT count(*)::int FROM public.unsaids) AS posts,
        (SELECT count(*)::int FROM public.unsaids WHERE reel_consent) AS opted_in,
        (SELECT is_nullable = 'NO' AND column_default = 'false' FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'reel_consent') AS column_ok`)
    ).rows[0];

    if (!check.server || check.anon || check.authenticated)
      throw new Error("Permission verification failed; rolling back");
    if (check.old_function) throw new Error("Old function still present; rolling back");
    if (!check.column_ok) throw new Error("Column verification failed; rolling back");
    if (check.opted_in !== 0) throw new Error("Existing posts were opted in; rolling back");
    if (check.posts !== before.posts) throw new Error("Post count changed; rolling back");

    await client.query(
      "INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)",
      [version, name, [sql]],
    );
    console.log(
      `PASS applied and verified ${version}_${name}; posts: ${check.posts}; opted in: ${check.opted_in}`,
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Reel-consent migration failed", error.code || error.name, error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
