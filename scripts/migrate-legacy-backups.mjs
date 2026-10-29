import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { resolve, join, sep, basename } from "node:path";
import { createHash, createDecipheriv } from "node:crypto";
import assert from "node:assert/strict";
import {
  backupDirectory,
  backupPublicKey,
  readProtectedSecret,
  rejectSyncedPath,
} from "./lib/backup-storage.mjs";
import { encryptBackup, decryptBackup } from "./lib/backup-crypto.mjs";

const source = resolve("artifacts/backups");
const destination = join(backupDirectory(), "legacy");
rejectSyncedPath(destination);
mkdirSync(destination, { recursive: true, mode: 0o700 });
const originals = join(destination, "originals");
mkdirSync(originals, { mode: 0o700 });
const privateKey = readProtectedSecret("backup-private-key");
let migrated = 0;
try {
  if (existsSync(source))
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.dump$|\.dump\.enc$/.test(entry.name)) continue;
      assert.equal(basename(entry.name), entry.name);
      const input = resolve(source, entry.name);
      const originalTarget = resolve(originals, entry.name);
      assert.ok(input.startsWith(source + sep) && originalTarget.startsWith(originals + sep));
      assert.ok(
        !existsSync(originalTarget),
        "An original is already archived; refusing to overwrite",
      );
      const bytes = readFileSync(input);
      let payload;
      if (bytes.subarray(0, 5).toString() === "BHBK1") {
        const old = readProtectedSecret("legacy-aes-key");
        try {
          const decipher = createDecipheriv("aes-256-gcm", old, bytes.subarray(5, 17));
          decipher.setAuthTag(bytes.subarray(17, 33));
          payload = Buffer.concat([decipher.update(bytes.subarray(33)), decipher.final()]);
        } finally {
          old.fill(0);
        }
      } else
        payload = Buffer.from(
          JSON.stringify({
            type: "archived-legacy-file",
            originalName: entry.name,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            file: bytes.toString("base64"),
          }),
        );
      const encrypted = encryptBackup(payload, backupPublicKey());
      const checked = decryptBackup(encrypted, privateKey);
      assert.deepEqual(checked, payload);
      checked.fill(0);
      const target = join(destination, `${entry.name}.rsa.enc`);
      assert.ok(!existsSync(target));
      writeFileSync(target, encrypted, { mode: 0o600 });
      // Preserve the exact original outside sync rather than deleting user backup data.
      renameSync(input, originalTarget);
      payload.fill(0);
      bytes.fill(0);
      migrated++;
    }
  console.log(
    `PASS ${migrated} historical backups archived with new asymmetric encryption; originals preserved privately outside OneDrive; cloud version history not purged`,
  );
} finally {
  privateKey.fill(0);
}
