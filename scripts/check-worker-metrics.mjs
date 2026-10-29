import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const config = readFileSync(
  join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"),
  "utf8",
);
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Existing Cloudflare authorization unavailable");
const end = new Date().toISOString();
const start = new Date(Date.now() - 24 * 3600000).toISOString();
const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({
    query: `query($account: string!, $start: Time!, $end: Time!) {
    viewer { accounts(filter: {accountTag: $account}) { workersInvocationsAdaptive(limit:100,
      filter: {datetime_geq:$start,datetime_leq:$end,scriptName_in:["bajihears","bajihears-launch-staging"]}) {
        dimensions { scriptName status } sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 wallTimeP50 wallTimeP99 }
    } } } }`,
    variables: { account: "f421715fb869755eeed3d568cd858417", start, end },
  }),
  signal: AbortSignal.timeout(20000),
});
const result = { start, end, status: response.status, ...(await response.json()) };
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/worker-metrics.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
