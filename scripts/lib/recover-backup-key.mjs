import { readFileSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import assert from "node:assert/strict";
export function recoverBackupKey(codeText) {
  const code = Buffer.from(codeText, "base64url");
  assert.equal(code.length, 32);
  const capsule = readFileSync("config/backup-key-recovery.enc");
  assert.equal(capsule.subarray(0, 5).toString(), "BHKR1");
  try {
    const decipher = createDecipheriv("aes-256-gcm", code, capsule.subarray(5, 17));
    decipher.setAuthTag(capsule.subarray(17, 33));
    return Buffer.concat([decipher.update(capsule.subarray(33)), decipher.final()]);
  } finally {
    code.fill(0);
  }
}
