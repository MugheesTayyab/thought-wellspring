import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import assert from "node:assert/strict";
import { hasProtectedSecret, protectSecret, readProtectedSecret } from "./lib/backup-storage.mjs";

if (existsSync(".env.backup.local")) {
  const match = readFileSync(".env.backup.local", "utf8").match(/^BACKUP_ENCRYPTION_KEY=(.+)$/m);
  if (match) {
    const old = Buffer.from(match[1].trim(), "base64");
    protectSecret("legacy-aes-key", old);
    const restored = readProtectedSecret("legacy-aes-key");
    assert.deepEqual(restored, old);
    restored.fill(0);
    old.fill(0);
    writeFileSync(
      ".env.backup.local",
      "# Backup keys are now Windows-DPAPI protected outside OneDrive.\n",
    );
  }
}
mkdirSync("config", { recursive: true });
let privateBytes;
if (!hasProtectedSecret("backup-private-key")) {
  assert.ok(!existsSync("config/backup-public-key.pem"),"An existing backup key must be recovered, not silently replaced");
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  privateBytes = Buffer.from(pair.privateKey);
  protectSecret("backup-private-key", privateBytes);
  assert.deepEqual(readProtectedSecret("backup-private-key"), privateBytes);
  writeFileSync("config/backup-public-key.pem", pair.publicKey);
} else {
  privateBytes = readProtectedSecret("backup-private-key");
  assert.equal(
    readFileSync("config/backup-public-key.pem", "utf8"),
    createPublicKey(privateBytes).export({ type: "spki", format: "pem" }),
  );
}
privateBytes.fill(0);
console.log(
  "PASS RSA-4096 backup key: only public key in repository; private key protected by current Windows user outside OneDrive; previous AES key preserved privately",
);
