import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import assert from "node:assert/strict";
import { protectSecret, readProtectedSecret, hasProtectedSecret } from "./lib/backup-storage.mjs";

const staging = process.argv.includes("--staging");
const env = {};
for (const line of readFileSync(staging ? ".env.staging.local" : ".env.local", "utf8").split(
  /\r?\n/,
)) {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}
const ref = staging ? "yolnsxesyosrozfobaen" : "qsloqqvdunfuyqqdmgil";
const url = new URL(staging ? env.STAGING_DATABASE_URL : env.SUPABASE_DATABASE_URL);
url.searchParams.delete("sslmode");
assert.equal(url.username, `postgres.${ref}`);
assert.ok(url.hostname.endsWith(".pooler.supabase.com"));
if (!process.argv.includes("--apply")) {
  console.log(
    "PLAN: dedicated backup login with PostgreSQL pg_read_all_data and RLS bypass for complete backups, including private accounts/posts. No write/admin/function grants; limit3 connections; default read-only transactions. This is full database read access. Store its credential in Windows DPAPI; GitHub storage requires separate explicit approval.",
  );
  process.exit(0);
}
const client = new pg.Client({
  connectionString: url.href,
  ssl: { rejectUnauthorized: true, ca: readFileSync("scripts/certs/supabase-ca.crt", "utf8") },
  connectionTimeoutMillis: 20000,
  query_timeout: 30000,
});
const secretName = staging ? "backup-staging-database-url" : "backup-database-url";
let step = "connect";
try {
  await client.connect();
  const existing = (await client.query("SELECT 1 FROM pg_roles WHERE rolname='bajihears_backup'"))
    .rowCount;
  if (existing)
    assert.ok(
      hasProtectedSecret(secretName),
      "Existing login has no protected credential; refusing silent rotation",
    );
  const password = existing ? null : randomBytes(32).toString("base64url");
  await client.query("BEGIN");
  try {
    step = "create backup-only login";
    if (!existing)
      await client.query(
        `CREATE ROLE bajihears_backup LOGIN PASSWORD ${client.escapeLiteral(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT BYPASSRLS CONNECTION LIMIT 3`,
      );
    await client.query("ALTER ROLE bajihears_backup SET default_transaction_read_only=on");
    await client.query("ALTER ROLE bajihears_backup SET statement_timeout='120s'");
    await client.query(
      "ALTER ROLE bajihears_backup SET idle_in_transaction_session_timeout='180s'",
    );
    step = "grant PostgreSQL standard read-only capabilities";
    await client.query("GRANT pg_read_all_data TO bajihears_backup WITH INHERIT TRUE");
    await client.query("GRANT pg_read_all_data TO bajihears_backup WITH SET FALSE");
    step = "verify no write/admin access";
    const writes = (
      await client.query(
        "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname IN ('public','auth','supabase_migrations') AND (has_table_privilege('bajihears_backup',format('%I.%I',schemaname,tablename),'INSERT') OR has_table_privilege('bajihears_backup',format('%I.%I',schemaname,tablename),'UPDATE') OR has_table_privilege('bajihears_backup',format('%I.%I',schemaname,tablename),'DELETE'))",
      )
    ).rows[0].count;
    assert.equal(writes, 0);
    const mutators = (
      await client.query(
        "SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND has_function_privilege('service_role',p.oid,'EXECUTE') AND NOT has_function_privilege('anon',p.oid,'EXECUTE') AND has_function_privilege('bajihears_backup',p.oid,'EXECUTE')",
      )
    ).rows[0].count;
    assert.equal(mutators, 0);
    assert.equal(
      (
        await client.query(
          "SELECT has_schema_privilege('bajihears_backup','public','CREATE') AS allowed",
        )
      ).rows[0].allowed,
      false,
    );
    const role = (
      await client.query(
        "SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='bajihears_backup'",
      )
    ).rows[0];
    assert.ok(Object.values(role).every((value) => value === false));
    assert.equal(
      (
        await client.query(
          "SELECT has_schema_privilege('bajihears_backup','auth','USAGE') AS allowed",
        )
      ).rows[0].allowed,
      true,
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  if (!existing) {
    url.username = `bajihears_backup.${ref}`;
    url.password = password;
    const bytes = Buffer.from(url.href);
    protectSecret(secretName, bytes);
    assert.deepEqual(readProtectedSecret(secretName), bytes);
    bytes.fill(0);
  }
  console.log(
    `PASS ${staging ? "staging" : "production"} backup login verified: full reads, no table writes/admin privileges/privileged RPC execution; credential protected locally; no content rows changed`,
  );
} catch (error) {
  console.error("Backup-reader setup failed", step, error.code || error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
