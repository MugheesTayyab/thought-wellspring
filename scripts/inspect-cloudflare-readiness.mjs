import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const config = readFileSync(join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"), "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Existing Cloudflare authorization unavailable");
const account = "f421715fb869755eeed3d568cd858417";
const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
}
const approved = (env.MODERATOR_EMAILS || "").toLowerCase().split(",").map((v) => v.trim());
async function get(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  return { status: response.status, success: data.success, result: data.result, errors: data.errors?.map((v) => ({ code: v.code, message: v.message })) };
}
const addresses = await get(`accounts/${account}/email/routing/addresses`);
const zones = await get("zones?name=bajihears.app");
const zoneId = zones.result?.[0]?.id;
const routing = zoneId ? await get(`zones/${zoneId}/email/routing`) : null;
const settings = await get(`accounts/${account}/workers/account-settings`);
const subscriptions = await get(`accounts/${account}/subscriptions`);
const result = {
  verifiedApprovedEmailDestinations: Array.isArray(addresses.result) ? addresses.result.filter((v) => v.verified && approved.includes(v.email?.toLowerCase())).length : 0,
  emailAddressRead: { status: addresses.status, success: addresses.success, errors: addresses.errors },
  domainFound: Boolean(zoneId),
  zonePlan: zones.result?.[0]?.plan?.name ?? null,
  routing: routing ? { status: routing.status, enabled: routing.result?.enabled, errors: routing.errors } : null,
  workersSettings: settings,
  planRead: { status: subscriptions.status, success: subscriptions.success,
    plans: Array.isArray(subscriptions.result) ? subscriptions.result.map((v) => ({
      name: v.rate_plan?.public_name ?? v.rate_plan?.id, status: v.state,
    })) : [], errors: subscriptions.errors },
};
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/cloudflare-readiness.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
