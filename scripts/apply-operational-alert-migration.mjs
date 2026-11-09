import { readFileSync } from "node:fs";
import pg from "pg";

// Deliberately limited to the reviewed, additive-only operational-alert migration.
const version = "20261108000000";
const name = "operational_alert_dedup";
const sql = readFileSync(`supabase/migrations/${version}_${name}.sql`, "utf8");
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
  ssl: { rejectUnauthorized: true, ca: readFileSync(env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt", "utf8") },
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
  if (existing.rowCount) {
    console.log(`PASS migration ${version} already recorded; no changes made`);
  } else if (!process.argv.includes("--apply")) {
    console.log(`PENDING ${version}_${name}; use --apply only with production authorization`);
  } else {
    await client.query(sql);
    const permissions = await client.query(`SELECT
      has_function_privilege('service_role', 'public.claim_operational_alert(text,int)', 'execute') AS server,
      has_function_privilege('anon', 'public.claim_operational_alert(text,int)', 'execute') AS anon,
      has_function_privilege('authenticated', 'public.claim_operational_alert(text,int)', 'execute') AS authenticated,
      has_table_privilege('anon', 'public.operational_alerts_sent', 'select') AS anon_table,
      has_table_privilege('authenticated', 'public.operational_alerts_sent', 'select') AS authenticated_table`);
    const result = permissions.rows[0];
    if (!result.server || result.anon || result.authenticated || result.anon_table || result.authenticated_table)
      throw new Error("Permission verification failed; rolling back");
    await client.query(
      "INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)",
      [version, name, [sql]],
    );
    console.log(`PASS applied and verified ${version}_${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Operational-alert migration failed", error.code || error.name, error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
