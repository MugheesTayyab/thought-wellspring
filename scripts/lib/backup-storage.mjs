import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import process from "node:process";
import assert from "node:assert/strict";

export function rejectSyncedPath(path) {
  const candidate = resolve(path).toLowerCase();
  assert.ok(!candidate.includes("onedrive"), "Private backup files must be outside OneDrive");
  for (const name of ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"]) {
    const root = process.env[name];
    if (root)
      assert.ok(
        candidate !== resolve(root).toLowerCase() &&
          !candidate.startsWith(resolve(root).toLowerCase() + sep),
        "Private backup path is synced",
      );
  }
}
export function stateDirectory() {
  assert.equal(process.platform, "win32", "Local key storage requires Windows DPAPI");
  const directory = resolve(process.env.LOCALAPPDATA, "BajiHears");
  rejectSyncedPath(directory);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}
export function backupDirectory() {
  const directory =
    process.env.GITHUB_ACTIONS === "true"
      ? resolve("artifacts/backups")
      : join(stateDirectory(), "backups");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}
export function restoreRoot() {
  const directory = resolve(tmpdir(), "bajihears-restore-checks");
  rejectSyncedPath(directory);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}
const secretPath = (name) => {
  assert.ok(
    [
      "backup-private-key",
      "legacy-aes-key",
      "backup-database-url",
      "backup-staging-database-url",
      "backup-recovery-code",
    ].includes(name),
  );
  return join(stateDirectory(), `${name}.dpapi`);
};
export const hasProtectedSecret = (name) => existsSync(secretPath(name));
export function protectSecret(name, bytes) {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Add-Type -AssemblyName System.Security; $taskBackupBytes=[Convert]::FromBase64String($env:BAJIHEARS_SECRET_VALUE); $taskBackupCipher=[Security.Cryptography.ProtectedData]::Protect($taskBackupBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [IO.File]::WriteAllBytes($env:BAJIHEARS_SECRET_PATH,$taskBackupCipher); [Array]::Clear($taskBackupBytes,0,$taskBackupBytes.Length)`,
    ],
    {
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        BAJIHEARS_SECRET_PATH: secretPath(name),
        BAJIHEARS_SECRET_VALUE: bytes.toString("base64"),
      },
      timeout: 20000,
    },
  );
}
export function readProtectedSecret(name) {
  const result = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Add-Type -AssemblyName System.Security; $taskBackupCipher=[IO.File]::ReadAllBytes($env:BAJIHEARS_SECRET_PATH); $taskBackupBytes=[Security.Cryptography.ProtectedData]::Unprotect($taskBackupCipher,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($taskBackupBytes)); [Array]::Clear($taskBackupBytes,0,$taskBackupBytes.Length)`,
    ],
    {
      windowsHide: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, BAJIHEARS_SECRET_PATH: secretPath(name) },
      timeout: 20000,
    },
  );
  return Buffer.from(result.trim(), "base64");
}
export function backupPublicKey() {
  return readFileSync("config/backup-public-key.pem", "utf8");
}
