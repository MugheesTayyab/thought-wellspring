import assert from "node:assert/strict";
const root = "https://api.github.com/repos/MugheesTayyab/thought-wellspring";
export async function verifyBackupHealth(fetcher = fetch, now = Date.now()) {
  async function get(path) {
    const response = await fetcher(`${root}${path}`, {
      headers: {
        "User-Agent": "BajiHears-public-health",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, "Backup evidence must be readable");
    return response.json();
  }
  const { workflow_runs: runs } = await get(
    "/actions/workflows/encrypted-backup.yml/runs?status=success&per_page=5",
  );
  for (const run of runs || []) {
    const { jobs } = await get(`/actions/runs/${run.id}/jobs?filter=latest`);
    const backup = jobs?.find(
      (job) =>
        job.name === "backup" &&
        job.conclusion === "success" &&
        job.steps?.some(
          (step) =>
            step.name === "Create consistent read-only production snapshot and encrypt it" &&
            step.conclusion === "success",
        ),
    );
    if (!backup) continue;
    const { artifacts } = await get(`/actions/runs/${run.id}/artifacts?per_page=100`);
    const artifact = artifacts?.find(
      (item) =>
        item.name === `encrypted-database-backup-${run.id}` &&
        !item.expired &&
        item.size_in_bytes > 0 &&
        Date.parse(item.expires_at) > now,
    );
    if (!artifact) continue;
    const ageHours = (now - Date.parse(artifact.created_at)) / 3600000;
    if (ageHours >= 0 && ageHours < 30) return { runId: run.id, artifactId: artifact.id, ageHours };
  }
  throw new Error(
    "No completed backup with a recent, non-expired encrypted artifact in the last 30 hours",
  );
}
