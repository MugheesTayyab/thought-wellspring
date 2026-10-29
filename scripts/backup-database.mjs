import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes, createCipheriv, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import { backupPermissions } from "./lib/backup-permissions.mjs";

const staging = process.argv.includes("--staging");
const env = {...process.env};
for (const filename of [staging ? ".env.staging.local" : ".env.local", ".env.backup.local"]) {
  if (!existsSync(filename)) continue;
  for (const line of readFileSync(filename,"utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if(match && !env[match[1]]) env[match[1]]=match[2].replace(/^["']|["']$/g,"");
  }
}
const ref = staging ? "yolnsxesyosrozfobaen" : "qsloqqvdunfuyqqdmgil";
const url = new URL(staging ? env.STAGING_DATABASE_URL : env.SUPABASE_DATABASE_URL);
url.searchParams.delete("sslmode");
if(url.username!==`postgres.${ref}` || !url.hostname.endsWith(".pooler.supabase.com")) throw new Error("Backup source guard failed");
const key = Buffer.from(env.BACKUP_ENCRYPTION_KEY || "", "base64");
if(key.length!==32) throw new Error("A separate 32-byte BACKUP_ENCRYPTION_KEY is required");
const ca = resolve("scripts/certs/supabase-ca.crt");
const client = new pg.Client({connectionString:url.href, ssl:{rejectUnauthorized:true,ca:readFileSync(ca,"utf8")},connectionTimeoutMillis:20000,query_timeout:30000});
const executable = env.PG_DUMP_PATH || (process.platform==="win32" ? "C:/Program Files/PostgreSQL/18/bin/pg_dump.exe" : "pg_dump");
const quote = value => `"${value.replaceAll('"','""')}"`;
try {
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshot = (await client.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
  const tables = (await client.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','auth','supabase_migrations') ORDER BY schemaname,tablename")).rows;
  const counts = {};
  for(const row of tables) counts[`${row.schemaname}.${row.tablename}`]=(await client.query(`SELECT count(*)::text AS count FROM ${quote(row.schemaname)}.${quote(row.tablename)}`)).rows[0].count;
  const policies = (await client.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public'")).rows[0].count;
  const roles=(await client.query("SELECT rolname,rolbypassrls FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname")).rows;
  const permissions=await backupPermissions(client);
  const dump = await new Promise((resolveDump,reject)=>{
    const child=spawn(executable,["--format=custom","--no-owner","--schema=public","--schema=auth","--schema=supabase_migrations",`--snapshot=${snapshot}`],{
      windowsHide:true,env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGDATABASE:url.pathname.slice(1),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:"verify-full",PGSSLROOTCERT:ca,PGCONNECT_TIMEOUT:"20",PGOPTIONS:"-c default_transaction_read_only=on"},stdio:["ignore","pipe","pipe"]});
    const chunks=[];let size=0;let stderr="";
    child.stdout.on("data",chunk=>{size+=chunk.length;if(size>512*1024*1024){child.kill();reject(new Error("Backup exceeds the safe size bound"));}else chunks.push(chunk);});
    child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
    child.on("error",()=>reject(new Error("PostgreSQL backup tool unavailable")));
    child.on("close",code=>code===0?resolveDump(Buffer.concat(chunks)):reject(new Error(`Database backup failed: ${stderr.slice(0,900)}`)));
  });
  await client.query("ROLLBACK");
  const manifest={version:1,project:ref,createdAt:new Date().toISOString(),schemas:["public","auth","supabase_migrations"],counts,roles,permissions,publicPolicies:policies,dumpSha256:createHash("sha256").update(dump).digest("hex"),restoreTested:false};
  const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key,iv);
  const plaintext=Buffer.from(JSON.stringify({manifest,dump:dump.toString("base64")}));
  const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  const envelope=Buffer.concat([Buffer.from("BHBK1"),iv,cipher.getAuthTag(),encrypted]);
  const directory=resolve("artifacts/backups");mkdirSync(directory,{recursive:true,mode:0o700});
  const filename=join(directory,`${ref}-${Date.now()}.dump.enc`);
  writeFileSync(filename,envelope,{mode:0o600});
  writeFileSync(join(directory,"latest.json"),JSON.stringify({file:filename,project:ref,createdAt:manifest.createdAt,ciphertextSha256:createHash("sha256").update(envelope).digest("hex"),bytes:envelope.length},null,2),{mode:0o600});
  plaintext.fill(0);dump.fill(0);
  console.log(`PASS read-only consistent ${staging?"staging":"production"} snapshot encrypted with AES-256-GCM; ${tables.length} tables; no private row contents logged`);
} catch(error) {
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,"[redacted]"));process.exitCode=1;
} finally {key.fill(0);await client.end();}
