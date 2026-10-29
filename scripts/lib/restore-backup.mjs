import { writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import assert from "node:assert/strict";
import { backupPermissions } from "./backup-permissions.mjs";
import { restoreRoot } from "./backup-storage.mjs";

export async function verifyRestore(manifest, dump) {
  assert.ok(["qsloqqvdunfuyqqdmgil", "yolnsxesyosrozfobaen"].includes(manifest.project));
  assert.equal(createHash("sha256").update(dump).digest("hex"), manifest.dumpSha256);
  const root = restoreRoot();
  const directory = mkdtempSync(join(root, "run-"));
  assert.ok(resolve(directory).startsWith(root + sep));
  const password = randomBytes(32).toString("base64url");
  const passwordFile = join(directory, "password");
  writeFileSync(passwordFile, password, { mode: 0o600 });
  const data = join(directory, "data");
  const binary = (name) =>
    process.env.PG_BIN_DIR
      ? join(process.env.PG_BIN_DIR, name + (process.platform === "win32" ? ".exe" : ""))
      : process.platform === "win32"
        ? `C:/Program Files/PostgreSQL/18/bin/${name}.exe`
        : name;
  function run(name, args, input) {
    const result = spawnSync(binary(name), args, {
      input,
      encoding: input ? undefined : "utf8",
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
      ...(name === "pg_ctl" ? { stdio: "ignore" } : {}),
      env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: "10" },
    });
    if (result.status !== 0)
      throw new Error(
        `${name} failed (exit ${result.status ?? result.error?.code ?? "unknown"}); private SQL output suppressed`,
      );
  }
  const port = 55432;
  let started = false;
  let client;
  const quote = (value) => `"${value.replaceAll('"', '""')}"`;
  try {
    run("initdb", [
      "-D",
      data,
      "-U",
      "postgres",
      "--auth=scram-sha-256",
      `--pwfile=${passwordFile}`,
      "--encoding=UTF8",
      "--no-locale",
    ]);
    started = true;
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      join(directory, "server.log"),
      "-o",
      `-p ${port} -h 127.0.0.1`,
      "-w",
      "start",
    ]);
    client = new pg.Client({
      host: "127.0.0.1",
      port,
      database: "postgres",
      user: "postgres",
      password,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    });
    await client.connect();
    const identity = (
      await client.query(
        "SELECT inet_server_addr()::text AS host,current_setting('data_directory') AS directory",
      )
    ).rows[0];
    assert.equal(identity.host.split("/")[0], "127.0.0.1");
    assert.equal(resolve(identity.directory), resolve(data));
    for (const role of manifest.roles)
      if (role.rolname !== "postgres")
        await client.query(
          `CREATE ROLE ${quote(role.rolname)} NOLOGIN ${role.rolbypassrls ? "BYPASSRLS" : "NOBYPASSRLS"}`,
        );
    await client.query("DROP SCHEMA public CASCADE");
    run(
      "pg_restore",
      [
        "--exit-on-error",
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-U",
        "postgres",
        "-d",
        "postgres",
      ],
      dump,
    );
    let tables = 0;
    for (const [name, expected] of Object.entries(manifest.counts)) {
      const [schema, table] = name.split(".");
      const count = (
        await client.query(`SELECT count(*)::text AS count FROM ${quote(schema)}.${quote(table)}`)
      ).rows[0].count;
      assert.equal(count, expected, `Restored count differs for ${name}`);
      tables++;
    }
    const policies = (
      await client.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public'")
    ).rows[0].count;
    assert.equal(policies, manifest.publicPolicies);
    assert.deepEqual(
      await backupPermissions(client),
      manifest.permissions,
      "Restored ownership/RLS/RPC privileges differ",
    );
    const orphans = (
      await client.query(
        "SELECT count(*)::int AS count FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL",
      )
    ).rows[0].count;
    assert.equal(orphans, 0);
    return {
      project: manifest.project,
      backupCreatedAt: manifest.createdAt,
      checkedAt: new Date().toISOString(),
      tablesChecked: tables,
      publicPolicies: policies,
      orphanProfiles: orphans,
      loopbackOnly: true,
      privateTempDirectory: true,
      passed: true,
    };
  } finally {
    await client?.end();
    if (started && existsSync(join(data, "postmaster.pid")))
      run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]);
    if (resolve(directory).startsWith(root + sep) && directory.includes(`${sep}run-`))
      rmSync(directory, { recursive: true, force: true });
  }
}
