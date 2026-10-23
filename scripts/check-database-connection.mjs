import { readFileSync } from "node:fs";
import pg from "pg";
const text = readFileSync(".env.local", "utf8");
const line = text.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_DATABASE_URL="));
const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  line?.slice(line.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
if (!connectionString) throw new Error("Database connection URL missing.");
const url = new URL(connectionString);
url.searchParams.delete("sslmode");
const caPath = process.env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt";
const ca = readFileSync(caPath, "utf8");
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});
try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS database, version() AS version");
  console.log("PASS PostgreSQL connection and read-only query", result.rows[0].database);
} catch (error) {
  console.error(
    "FAIL PostgreSQL connection",
    error.code || error.name,
    error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted URL]"),
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
