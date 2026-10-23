import { readFileSync, readdirSync } from "node:fs";
import { createECDH } from "node:crypto";
const secrets = new Map();
const localEnv = new Map();
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const envMatch = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (envMatch) localEnv.set(envMatch[1], envMatch[2].replace(/^["']|["']$/g, ""));
    const match = line.match(
      /^(SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|CRON_SECRET|SUPABASE_DATABASE_URL)=(.+)$/,
    );
    if (match && match[2].length > 12) secrets.set(match[1], match[2].replace(/^['"]|['"]$/g, ""));
  }
} catch {
  /* CI values come from the environment. */
}

const vapidPrivateKey = localEnv.get("VAPID_PRIVATE_KEY") || process.env.VAPID_PRIVATE_KEY;
const vapidPublicKey = localEnv.get("VITE_VAPID_PUBLIC_KEY") || process.env.VITE_VAPID_PUBLIC_KEY;
if (!vapidPrivateKey || !vapidPublicKey) {
  throw new Error("VAPID public/private keys are required for a release build.");
}
const vapid = createECDH("prime256v1");
vapid.setPrivateKey(Buffer.from(vapidPrivateKey, "base64url"));
if (vapid.getPublicKey().toString("base64url") !== vapidPublicKey) {
  throw new Error("VAPID_PRIVATE_KEY does not match VITE_VAPID_PUBLIC_KEY.");
}
const wrangler = JSON.parse(readFileSync("wrangler.json", "utf8"));
if (wrangler.vars?.VAPID_PUBLIC_KEY !== vapidPublicKey) {
  throw new Error("wrangler.json VAPID_PUBLIC_KEY does not match the browser build key.");
}
for (const key of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAPID_PRIVATE_KEY",
  "CRON_SECRET",
  "SUPABASE_DATABASE_URL",
])
  if (process.env[key]) secrets.set(key, process.env[key]);
let files = 0;
function scan(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const target = `${path}/${entry.name}`;
    if (entry.isDirectory()) scan(target);
    else if (/\.(js|mjs|json|html|map|css)$/.test(entry.name)) {
      files++;
      const text = readFileSync(target, "utf8");
      for (const [key, secret] of secrets)
        if (text.includes(secret))
          throw new Error(`${key} was found in a public asset. Do not deploy.`);
    }
  }
}
scan(".output/public");
console.log("PASS VAPID key pair and Worker/browser public keys match.");
console.log(`PASS ${files} public assets scanned; no configured server secrets found.`);
