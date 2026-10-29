import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import pg from "pg";
const env = {};
for (const line of readFileSync(".env.staging.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
}
const ref = "yolnsxesyosrozfobaen";
if (env.STAGING_PROJECT_REF !== ref || env.SUPABASE_URL !== `https://${ref}.supabase.co`)
  throw new Error("Staging project guard failed");
const connection = new URL(env.STAGING_DATABASE_URL);
if (
  connection.username !== `postgres.${ref}` ||
  !connection.hostname.endsWith(".pooler.supabase.com")
)
  throw new Error("Staging database guard failed");
const client = new pg.Client({
  connectionString: connection.href,
  ssl: { rejectUnauthorized: true, ca: readFileSync("scripts/certs/supabase-ca.crt", "utf8") },
  connectionTimeoutMillis: 20000,
  query_timeout: 120000,
});
try {
  await client.connect();
  await client.query(
    "CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text primary key, name text, statements text[])",
  );
  for (const filename of readdirSync("supabase/migrations")
    .filter((v) => v.endsWith(".sql"))
    .sort()) {
    const version = filename.split("_")[0];
    if (
      (
        await client.query("SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1", [
          version,
        ])
      ).rowCount
    )
      continue;
    const sql = readFileSync(`supabase/migrations/${filename}`, "utf8").replace(
      /^\s*(BEGIN|COMMIT);\s*$/gm,
      "",
    );
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)",
        [version, filename.slice(version.length + 1, -4), [sql]],
      );
      await client.query("COMMIT");
      console.log(`PASS staging migration ${version}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  if (process.argv.includes("--reset-synthetic")) {
    const safe = await client.query(
      "SELECT (SELECT count(*) FROM public.profiles) = 0 AND (SELECT count(*) FROM public.unsaids WHERE text NOT LIKE 'Synthetic %') = 0 AS safe",
    );
    if (!safe.rows[0].safe)
      throw new Error("Refusing to reset staging with non-synthetic content or accounts");
    await client.query("TRUNCATE public.unsaids CASCADE");
  }
  await client.query(`INSERT INTO public.unsaids(id,text,category,status,device_token,created_at)
    SELECT ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'Synthetic staging thought ' || n || ': taking a quiet moment to reflect on an ordinary day.',
      'Silent Thoughts','published',lpad(to_hex(n),16,'0'),now()-make_interval(secs=>n)
    FROM generate_series(1,10000) n ON CONFLICT(id) DO NOTHING`);
  await client.query(`INSERT INTO public.unsaids(id,text,category,status,source_type,editorial_seed_id,editorial_label,display_order)
    SELECT ('11111111-1111-4111-8111-' || lpad(n::text,12,'0'))::uuid, 'Synthetic fictional staging original ' || n || '.', 'Silent Thoughts', 'published',
      'editorial','BH-' || lpad(n::text,3,'0'),'BajiHears Original · Fictional',n
    FROM generate_series(1,30) n ON CONFLICT(id) DO NOTHING`);
  await client.query(
    "UPDATE public.unsaids SET text=rpad(text,260,'.') WHERE text LIKE 'Synthetic %' AND char_length(text)<260",
  );
  await client.query(`INSERT INTO public.echoes(id,unsaid_id,text,device_token,status)
    SELECT ('22222222-2222-4222-8222-' || lpad((n*2+e)::text,12,'0'))::uuid,
      ('11111111-1111-4111-8111-' || lpad(n::text,12,'0'))::uuid,
      rpad('Synthetic seeded staging reply ' || n || ':' || e || '.',190,'.'),
      lpad(to_hex(30000+n*2+e),16,'0'),'published'
    FROM generate_series(1,30) n CROSS JOIN generate_series(1,2) e ON CONFLICT(id) DO NOTHING`);
  await client.query("ANALYZE public.unsaids");
  const counts = await client.query("SELECT count(*)::int AS posts FROM public.unsaids");
  console.log(
    `PASS hosted staging seeded ${counts.rows[0].posts} synthetic posts; no production connection opened`,
  );
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/staging-dataset.json",
    JSON.stringify({
      project: ref,
      posts: counts.rows[0].posts,
      region: "ap-southeast-1",
      compute: "NANO",
      productionTouched: false,
    }),
  );
} catch (error) {
  console.error(
    "Hosted staging setup failed",
    error.code || error.name,
    String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]"),
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
