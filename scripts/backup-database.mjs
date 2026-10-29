import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import { backupPermissions } from "./lib/backup-permissions.mjs";
import {
  backupDirectory,
  backupPublicKey,
  hasProtectedSecret,
  readProtectedSecret,
} from "./lib/backup-storage.mjs";
import { encryptBackup } from "./lib/backup-crypto.mjs";
import { verifyRestore } from "./lib/restore-backup.mjs";

const staging = process.argv.includes("--staging");
const env = { ...process.env };
for (const filename of [staging ? ".env.staging.local" : ".env.local"]) {
  if (!existsSync(filename)) continue;
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const ref = staging ? "yolnsxesyosrozfobaen" : "qsloqqvdunfuyqqdmgil";
const secretName = staging ? "backup-staging-database-url" : "backup-database-url";
const protectedUrl =
  process.platform === "win32" && hasProtectedSecret(secretName)
    ? readProtectedSecret(secretName)
    : null;
const url = new URL(
  staging
    ? process.env.STAGING_DATABASE_URL || protectedUrl?.toString() || env.STAGING_DATABASE_URL
    : process.env.SUPABASE_DATABASE_URL || protectedUrl?.toString() || env.SUPABASE_DATABASE_URL,
);
protectedUrl?.fill(0);
url.searchParams.delete("sslmode");
if (
  ![`postgres.${ref}`, `bajihears_backup.${ref}`].includes(url.username) ||
  !url.hostname.endsWith(".pooler.supabase.com")
)
  throw new Error("Backup source guard failed");
if (process.env.GITHUB_ACTIONS === "true" && url.username !== `bajihears_backup.${ref}`)
  throw new Error("CI requires a dedicated backup-only credential; admin credential refused");
const ca = resolve("scripts/certs/supabase-ca.crt");
const client = new pg.Client({
  connectionString: url.href,
  ssl: { rejectUnauthorized: true, ca: readFileSync(ca, "utf8") },
  connectionTimeoutMillis: 20000,
  query_timeout: 30000,
});
const executable =
  env.PG_DUMP_PATH ||
  (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin/pg_dump.exe" : "pg_dump");
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
try {
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshot = (await client.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
  const tables = (
    await client.query(
      "SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','auth','supabase_migrations') ORDER BY schemaname,tablename",
    )
  ).rows;
  const counts = {};
  for (const row of tables)
    counts[`${row.schemaname}.${row.tablename}`] = (
      await client.query(
        `SELECT count(*)::text AS count FROM ${quote(row.schemaname)}.${quote(row.tablename)}`,
      )
    ).rows[0].count;
  const policies = (
    await client.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public'")
  ).rows[0].count;
  const roles = (
    await client.query(
      "SELECT rolname,rolbypassrls FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname",
    )
  ).rows;
  const permissions = await backupPermissions(client);
  const dump = await new Promise((resolveDump, reject) => {
    const child = spawn(
      executable,
      [
        "--format=custom",
        "--schema=public",
        "--schema=auth",
        "--schema=supabase_migrations",
        `--snapshot=${snapshot}`,
      ],
      {
        windowsHide: true,
        timeout: 180000,
        env: {
          ...process.env,
          PGHOST: url.hostname,
          PGPORT: url.port || "5432",
          PGUSER: decodeURIComponent(url.username),
          PGDATABASE: url.pathname.slice(1),
          PGPASSWORD: decodeURIComponent(url.password),
          PGSSLMODE: "verify-full",
          PGSSLROOTCERT: ca,
          PGCONNECT_TIMEOUT: "20",
          PGOPTIONS: "-c default_transaction_read_only=on",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const chunks = [];
    let size = 0;
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 512 * 1024 * 1024) {
        child.kill();
        reject(new Error("Backup exceeds the safe size bound"));
      } else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", () => reject(new Error("PostgreSQL backup tool unavailable")));
    child.on("close", (code) =>
      code === 0
        ? resolveDump(Buffer.concat(chunks))
        : reject(new Error(`Database backup failed: ${stderr.slice(0, 900)}`)),
    );
  });
  await client.query("ROLLBACK");
  const manifest = {
    version: 1,
    project: ref,
    createdAt: new Date().toISOString(),
    schemas: ["public", "auth", "supabase_migrations"],
    counts,
    roles,
    permissions,
    publicPolicies: policies,
    dumpSha256: createHash("sha256").update(dump).digest("hex"),
    restoreTested: false,
  };
  const directory = backupDirectory();
  if (process.argv.includes("--verify")) {
    const result = await verifyRestore(manifest, dump);
    manifest.restoreTested = true;
    writeFileSync(join(directory, "restore-result.json"), JSON.stringify(result, null, 2), {
      mode: 0o600,
    });
  }
  const plaintext = Buffer.from(JSON.stringify({ manifest, dump: dump.toString("base64") }));
  const envelope = encryptBackup(plaintext, backupPublicKey());
  if(process.env.GITHUB_ACTIONS==="true" && envelope.length > 10*1024*1024)throw new Error("Snapshot exceeds the configured free artifact budget; review retention before increasing storage");
  const filename = join(directory, `${ref}-${Date.now()}.dump.enc`);
  writeFileSync(filename, envelope, { mode: 0o600 });
  writeFileSync(
    join(directory, "latest.json"),
    JSON.stringify(
      {
        file: filename,
        project: ref,
        createdAt: manifest.createdAt,
        ciphertextSha256: createHash("sha256").update(envelope).digest("hex"),
        bytes: envelope.length,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  plaintext.fill(0);
  dump.fill(0);
  console.log(
    `PASS read-only consistent ${staging ? "staging" : "production"} snapshot encrypted with RSA-4096/AES-256-GCM; ${tables.length} tables; ${manifest.restoreTested ? "restore verified; " : ""}no private row contents logged`,
  );
} catch (error) {
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]"));
  process.exitCode = 1;
} finally {
  await client.end();
}
