import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { backupDirectory, readProtectedSecret } from "./lib/backup-storage.mjs";
import { decryptBackup } from "./lib/backup-crypto.mjs";
import { verifyRestore } from "./lib/restore-backup.mjs";
import { recoverBackupKey } from "./lib/recover-backup-key.mjs";

const directory = backupDirectory();
const latest = JSON.parse(readFileSync(join(directory, "latest.json"), "utf8"));
assert.ok(resolve(latest.file).startsWith(directory + sep));
const envelope = readFileSync(latest.file);
assert.equal(createHash("sha256").update(envelope).digest("hex"), latest.ciphertextSha256);
const privateKey = process.env.BAJIHEARS_BACKUP_RECOVERY_CODE
  ? recoverBackupKey(process.env.BAJIHEARS_BACKUP_RECOVERY_CODE)
  : readProtectedSecret("backup-private-key");
let payload;
let dump;
try {
  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptBackup(tampered, privateKey));
  payload = decryptBackup(envelope, privateKey);
  const decoded = JSON.parse(payload.toString());
  dump = Buffer.from(decoded.dump, "base64");
  const result = await verifyRestore(decoded.manifest, dump);
  result.tamperRejected = true;
  writeFileSync(join(directory, "restore-result.json"), JSON.stringify(result, null, 2), {
    mode: 0o600,
  });
  console.log(
    `PASS decrypted production/staging backup restored outside synced folders: ${result.tablesChecked} tables, ${result.publicPolicies} policies, ownership/RLS/grants, account references and tamper rejection`,
  );
} catch (error) {
  console.error(String(error.message).slice(0, 1000));
  process.exitCode = 1;
} finally {
  privateKey.fill(0);
  payload?.fill(0);
  dump?.fill(0);
}
