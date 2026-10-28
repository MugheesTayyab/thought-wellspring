import { readFileSync } from "node:fs";
import pg from "pg";

// Deliberately limited to the reviewed, permission-only release migration.
const version = "20261025010000";
const name = "echo_permissions_hardening";
const sql = readFileSync(`supabase/migrations/${version}_${name}.sql`, "utf8");
const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
}
if (!env.SUPABASE_DATABASE_URL) throw new Error("Database configuration missing");
const url = new URL(env.SUPABASE_DATABASE_URL);
url.searchParams.delete("sslmode");
const client = new pg.Client({ connectionString: url.toString(),
  ssl: { rejectUnauthorized: true, ca: readFileSync(env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt", "utf8") },
  connectionTimeoutMillis: 15000, query_timeout: 35000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('bajihears-release-migration'))");
  const existing = await client.query("SELECT version FROM supabase_migrations.schema_migrations WHERE version=$1", [version]);
  if (existing.rowCount) {
    console.log(`PASS migration ${version} already recorded; no changes made`);
  } else if (!process.argv.includes("--apply")) {
    console.log(`PENDING ${version}_${name}; use --apply only with production authorization`);
  } else {
    const target = await client.query("SELECT to_regprocedure('public.insert_echo_atomic(uuid,text,text,text,uuid)') IS NOT NULL AS present");
    if (!target.rows[0].present) throw new Error("Reviewed function signature is missing; migration stopped");
    await client.query(sql);
    const permissions = await client.query(`SELECT
      has_function_privilege('service_role', 'public.insert_echo_atomic(uuid,text,text,text,uuid)', 'execute') AS server,
      has_function_privilege('anon', 'public.insert_echo_atomic(uuid,text,text,text,uuid)', 'execute') AS anon,
      has_function_privilege('authenticated', 'public.insert_echo_atomic(uuid,text,text,text,uuid)', 'execute') AS authenticated`);
    const result = permissions.rows[0];
    if (!result.server || result.anon || result.authenticated) throw new Error("Permission verification failed; rolling back");
    await client.query("INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)", [version, name, [sql]]);
    console.log(`PASS applied and verified ${version}_${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Release migration failed", error.code || error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
