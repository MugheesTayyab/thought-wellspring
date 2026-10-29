import assert from "node:assert/strict";
import { toJSON, fromCrossJSON } from "seroval";

// Read-only public checks. No credentials, mutations, load testing or plan changes.
const feedId = "0adb6a8478d457523eb2fccf20aff0eee86bfb18d20643fb4b83b2628f5517fb";
const targets = ["https://bajihears.app", "https://bajihears.mugheestayyab4.workers.dev"];
async function verifySite(base) {
  const response = await fetch(`${base}/`, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, "Homepage must return 200");
  const html = await response.text();
  assert.match(html, /BajiHears/);
  assert.doesNotMatch(html, /<title>You're offline|This page didn't load/);
  const payload = encodeURIComponent(JSON.stringify(toJSON({ data: { page: 0, limit: 1 } })));
  const feed = await fetch(`${base}/_serverFn/${feedId}?payload=${payload}`, {
    headers: { "x-tsr-serverfn": "true", "sec-fetch-site": "same-origin", Origin: base },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(feed.status, 200, "Feed must return 200");
  const decoded = fromCrossJSON(await feed.json(), { refs: new Map() });
  assert.equal(decoded.result?.ok, true, "Feed backend must be available");
  assert.ok(decoded.result.data?.posts?.length > 0, "Published feed must contain content");
  console.log(`PASS rendered document and real backend feed: ${new URL(base).hostname}`);
}
for (const target of targets) {
  try {
    await verifySite(target);
  } catch (error) {
    console.warn(`Initial public check failed for ${new URL(target).hostname}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await verifySite(target);
  }
}
const runs = await fetch(
  "https://api.github.com/repos/MugheesTayyab/thought-wellspring/actions/workflows/encrypted-backup.yml/runs?status=success&per_page=1",
  {
    headers: { "User-Agent": "BajiHears-public-health" },
    signal: AbortSignal.timeout(15000),
  },
);
assert.equal(runs.status, 200, "Backup status must be readable");
const latest = (await runs.json()).workflow_runs?.[0];
assert.ok(latest?.updated_at, "A successful encrypted backup is required");
const ageHours = (Date.now() - Date.parse(latest.updated_at)) / 3600000;
assert.ok(ageHours >= 0 && ageHours < 30, "No successful encrypted backup in the last 30 hours");
console.log(`PASS encrypted backup freshness: ${ageHours.toFixed(1)} hours`);
