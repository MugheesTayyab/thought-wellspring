import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const config = readFileSync(join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"), "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Cloudflare authorization unavailable");
const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
}
const approved = (env.MODERATOR_EMAILS || "").split(",").map((v) => v.trim().toLowerCase());
const response = await fetch("https://api.cloudflare.com/client/v4/accounts/f421715fb869755eeed3d568cd858417/email/routing/addresses", {
  headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
});
const data = await response.json();
if (!response.ok || !data.success) throw new Error("Could not verify email destinations");
const matches = data.result.filter((v) => v.verified && approved.includes(v.email.toLowerCase()));
if (matches.length !== 1) throw new Error("Exactly one existing verified approved moderator destination is required");
if (process.argv.includes("--send-test")) {
  const sent = await fetch("https://api.cloudflare.com/client/v4/accounts/f421715fb869755eeed3d568cd858417/email/sending/send", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: matches[0].email, from: "alerts@bajihears.app",
      subject: "BajiHears moderation delivery verification",
      text: "This is the authorized BajiHears launch-readiness alert test. Moderation alerts are configured for this existing verified moderator address. Dashboard: https://bajihears.app/admin/moderation. No user content or identity is included." }),
    signal: AbortSignal.timeout(20000),
  });
  const delivery = await sent.json();
  console.log(JSON.stringify({ status: sent.status, success: delivery.success,
    delivered: delivery.result?.delivered?.length ?? 0, queued: delivery.result?.queued?.length ?? 0,
    permanentBounces: delivery.result?.permanent_bounces?.length ?? 0,
    errors: delivery.errors?.map((error) => error.code) }));
  if (!sent.ok || !delivery.success || delivery.result?.permanent_bounces?.length) process.exitCode = 1;
} else if (!process.argv.includes("--apply")) {
  console.log("PASS one existing verified moderator destination available; use --apply to configure");
} else {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "secret", "put", "MODERATION_EMAIL_TO", "--name", "bajihears"], {
    input: `${matches[0].email}\n`, encoding: "utf8", windowsHide: true,
  });
  if (result.status !== 0) throw new Error("Native email destination configuration failed");
  console.log("PASS configured verified moderator destination as a Worker secret; address not published");
}
