import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  privateDecrypt,
  constants,
} from "node:crypto";
import assert from "node:assert/strict";
export function encryptBackup(payload, publicKey) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const wrapped = publicEncrypt(
    { key: publicKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING },
    key,
  );
  const size = Buffer.alloc(4);
  size.writeUInt32BE(wrapped.length);
  key.fill(0);
  return Buffer.concat([Buffer.from("BHBK2"), size, wrapped, iv, cipher.getAuthTag(), ciphertext]);
}
export function decryptBackup(envelope, privateKey) {
  assert.equal(envelope.subarray(0, 5).toString(), "BHBK2");
  const size = envelope.readUInt32BE(5);
  assert.equal(size, 512);
  const offset = 9 + size;
  const key = privateDecrypt(
    { key: privateKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING },
    envelope.subarray(9, offset),
  );
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, envelope.subarray(offset, offset + 12));
    decipher.setAuthTag(envelope.subarray(offset + 12, offset + 28));
    return Buffer.concat([decipher.update(envelope.subarray(offset + 28)), decipher.final()]);
  } finally {
    key.fill(0);
  }
}
