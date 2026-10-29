import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyBackupHealth } from "./lib/verify-backup-health.mjs";
const now = Date.parse("2026-10-29T12:00:00Z");
const job = {
  name: "backup",
  conclusion: "success",
  steps: [
    {
      name: "Create consistent read-only production snapshot and encrypt it",
      conclusion: "success",
    },
  ],
};
const artifact = {
  id: 2,
  name: "encrypted-database-backup-1",
  size_in_bytes: 400000,
  expired: false,
  created_at: "2026-10-29T06:00:00Z",
  expires_at: "2026-11-28T06:00:00Z",
};
function mock(jobs, artifacts, runs = [{ id: 1 }]) {
  return async (url) => ({
    status: 200,
    json: async () =>
      url.includes("/workflows/")
        ? { workflow_runs: runs }
        : url.includes("/jobs?")
          ? { jobs }
          : { artifacts },
  });
}
test("completed backup plus recent live artifact is healthy", async () => {
  assert.deepEqual(await verifyBackupHealth(mock([job], [artifact]), now), {
    runId: 1,
    artifactId: 2,
    ageHours: 6,
  });
});
test("successful workflow with skipped backup cannot refresh health", async () => {
  await assert.rejects(
    verifyBackupHealth(mock([{ ...job, conclusion: "skipped" }], [artifact]), now),
    /No completed backup/,
  );
});
test("successful job without encrypted artifact cannot refresh health", async () => {
  await assert.rejects(verifyBackupHealth(mock([job], []), now), /No completed backup/);
});
test("expired or deleted backup is not recoverable coverage", async () => {
  await assert.rejects(
    verifyBackupHealth(mock([job], [{ ...artifact, expired: true }]), now),
    /No completed backup/,
  );
});
test("rerunning an old workflow cannot make a stale artifact fresh", async () => {
  await assert.rejects(
    verifyBackupHealth(
      mock(
        [job],
        [{ ...artifact, created_at: "2026-10-27T06:00:00Z" }],
        [{ id: 1, updated_at: "2026-10-29T11:59:00Z" }],
      ),
      now,
    ),
    /No completed backup/,
  );
});
test("failed snapshot step cannot be treated as successful coverage", async () => {
  await assert.rejects(
    verifyBackupHealth(
      mock([{ ...job, steps: [{ ...job.steps[0], conclusion: "failure" }] }], [artifact]),
      now,
    ),
    /No completed backup/,
  );
});
