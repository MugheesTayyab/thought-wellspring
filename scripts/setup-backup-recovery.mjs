import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import assert from "node:assert/strict";
import {
  protectSecret,
  readProtectedSecret,
  hasProtectedSecret,
  stateDirectory,
} from "./lib/backup-storage.mjs";

const privateKey = readProtectedSecret("backup-private-key");
if (!hasProtectedSecret("backup-recovery-code")) {
  assert.ok(!existsSync("config/backup-key-recovery.enc"),"Existing recovery material must not be silently replaced");
  protectSecret("backup-recovery-code", randomBytes(32));
}
const code = readProtectedSecret("backup-recovery-code");
assert.equal(code.length, 32);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", code, iv);
const ciphertext = Buffer.concat([cipher.update(privateKey), cipher.final()]);
const capsule = Buffer.concat([Buffer.from("BHKR1"), iv, cipher.getAuthTag(), ciphertext]);
const decipher = createDecipheriv("aes-256-gcm", code, capsule.subarray(5, 17));
decipher.setAuthTag(capsule.subarray(17, 33));
const recovered = Buffer.concat([decipher.update(capsule.subarray(33)), decipher.final()]);
assert.deepEqual(recovered, privateKey);
mkdirSync("config", { recursive: true });
writeFileSync("config/backup-key-recovery.enc", capsule);
const directory = join(stateDirectory(), "recovery");
mkdirSync(directory, { recursive: true, mode: 0o700 });
// This portable secret is an explicit owner handoff, outside every sync folder.
// GitHub gets only the capsule and cannot decrypt it without this random code.
const filename = join(directory, "RECOVERY-CODE.txt");
if (!existsSync(filename))
  writeFileSync(
    filename,
    `BajiHears backup recovery code — keep private, store in your password manager or offline.\n\n${code.toString("base64url")}\n\nThis unlocks encrypted database backups. Keep it separate from GitHub. Do not share it in chat.\n`,
    { mode: 0o600 },
  );
privateKey.fill(0);
recovered.fill(0);
code.fill(0);
console.log(
  "PASS portable private-key recovery capsule created with an independent random256-bit code; code saved privately outside OneDrive and not printed",
);
