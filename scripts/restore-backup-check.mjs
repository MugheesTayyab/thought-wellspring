import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { randomBytes, createDecipheriv, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import assert from "node:assert/strict";
import { backupPermissions } from "./lib/backup-permissions.mjs";

const env={...process.env};
if(existsSync(".env.backup.local")) for(const line of readFileSync(".env.backup.local","utf8").split(/\r?\n/)) {
  const match=line.match(/^([A-Z_0-9]+)=(.*)$/);if(match&&!env[match[1]])env[match[1]]=match[2].replace(/^["']|["']$/g,"");
}
const key=Buffer.from(env.BACKUP_ENCRYPTION_KEY||"","base64");assert.equal(key.length,32);
const latest=JSON.parse(readFileSync("artifacts/backups/latest.json","utf8"));
const backupRoot=resolve("artifacts/backups")+sep;
assert.ok(resolve(latest.file).startsWith(backupRoot),"Only the local generated backup may be tested");
const encrypted=readFileSync(latest.file);assert.equal(encrypted.subarray(0,5).toString(),"BHBK1");
assert.equal(createHash("sha256").update(encrypted).digest("hex"),latest.ciphertextSha256);
function decrypt(input) {
  const decipher=createDecipheriv("aes-256-gcm",key,input.subarray(5,17));decipher.setAuthTag(input.subarray(17,33));
  return Buffer.concat([decipher.update(input.subarray(33)),decipher.final()]);
}
const tampered=Buffer.from(encrypted);tampered[tampered.length-1]^=1;
assert.throws(()=>decrypt(tampered),"Tampering must fail authentication");
const payload=decrypt(encrypted);const {manifest,dump:encoded}=JSON.parse(payload.toString());
const dump=Buffer.from(encoded,"base64");assert.equal(createHash("sha256").update(dump).digest("hex"),manifest.dumpSha256);
assert.ok(["qsloqqvdunfuyqqdmgil","yolnsxesyosrozfobaen"].includes(manifest.project));
const root=resolve("artifacts/restore-checks");mkdirSync(root,{recursive:true,mode:0o700});
const directory=join(root,`run-${Date.now()}-${randomBytes(4).toString("hex")}`);
assert.ok(resolve(directory).startsWith(root+sep));mkdirSync(directory,{mode:0o700});
const password=randomBytes(32).toString("base64url");const passwordFile=join(directory,"password");writeFileSync(passwordFile,password,{mode:0o600});
const data=join(directory,"data");
const binary=name=>process.env.PG_BIN_DIR?join(process.env.PG_BIN_DIR,name+(process.platform==="win32"?".exe":"")):process.platform==="win32"?`C:/Program Files/PostgreSQL/18/bin/${name}.exe`:name;
function run(name,args,input) {
  const result=spawnSync(binary(name),args,{input,encoding:input?undefined:"utf8",windowsHide:true,timeout:120000,maxBuffer:4*1024*1024, ...(name==="pg_ctl"?{stdio:"ignore"}:{}),
    env:{...process.env,PGPASSWORD:password,PGCONNECT_TIMEOUT:"10"}});
  if(result.status!==0) throw new Error(`${name} failed: ${String(result.stderr||result.error||"").slice(0,1200)}`);
}
const port=55432;let started=false;let client;
const quote=value=>`"${value.replaceAll('"','""')}"`;
try {
  run("initdb",["-D",data,"-U","postgres","--auth=scram-sha-256",`--pwfile=${passwordFile}`,"--encoding=UTF8","--no-locale"]);
  started=true;run("pg_ctl",["-D",data,"-l",join(directory,"server.log"),"-o",`-p ${port} -h 127.0.0.1`,"-w","start"]);
  // This tool never accepts a remote restore URL or a caller-chosen hostname.
  client=new pg.Client({host:"127.0.0.1",port,database:"postgres",user:"postgres",password,connectionTimeoutMillis:10000,query_timeout:30000});await client.connect();
  const identity=(await client.query("SELECT inet_server_addr()::text AS host, current_setting('data_directory') AS directory")).rows[0];
  assert.equal(identity.host.split("/")[0],"127.0.0.1");assert.equal(resolve(identity.directory),resolve(data));
  for(const role of manifest.roles) {
    if(role.rolname==="postgres")continue;
    await client.query(`CREATE ROLE ${quote(role.rolname)} NOLOGIN ${role.rolbypassrls?"BYPASSRLS":"NOBYPASSRLS"}`);
  }
  await client.query("DROP SCHEMA public CASCADE");
  run("pg_restore",["--exit-on-error","--no-owner","-h","127.0.0.1","-p",String(port),"-U","postgres","-d","postgres"],dump);
  let tables=0;
  for(const [name,expected] of Object.entries(manifest.counts)) {
    const [schema,table]=name.split(".");
    const count=(await client.query(`SELECT count(*)::text AS count FROM ${quote(schema)}.${quote(table)}`)).rows[0].count;
    assert.equal(count,expected,`Restored row count differs for ${name}`);tables++;
  }
  const policies=(await client.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public'")).rows[0].count;
  assert.equal(policies,manifest.publicPolicies);
  assert.deepEqual(await backupPermissions(client),manifest.permissions,"Public table and RPC permissions must survive restore");
  const orphans=(await client.query("SELECT count(*)::int AS count FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL")).rows[0].count;
  assert.equal(orphans,0);
  mkdirSync("artifacts/backups",{recursive:true});
  writeFileSync("artifacts/backups/restore-result.json",JSON.stringify({project:manifest.project,backupCreatedAt:manifest.createdAt,checkedAt:new Date().toISOString(),tablesChecked:tables,publicPolicies:policies,orphanProfiles:orphans,tamperRejected:true,loopbackOnly:true,passed:true},null,2));
  console.log(`PASS encrypted backup restored on isolated loopback PostgreSQL: ${tables} table counts, ${policies} policies, account references and tamper rejection; no private row contents logged`);
} catch(error) {console.error(String(error.message).slice(0,1600));process.exitCode=1;}
finally {
  await client?.end();
  if(started && existsSync(join(data,"postmaster.pid"))) run("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);
  dump.fill(0);payload.fill(0);key.fill(0);
  // Never recursively remove an unchecked/computed path outside this run's root.
  if(resolve(directory).startsWith(root+sep)&&directory.includes(`${sep}run-`)) rmSync(directory,{recursive:true,force:true});
}
