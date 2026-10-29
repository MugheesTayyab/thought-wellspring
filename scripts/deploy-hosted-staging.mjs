import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const env = {};
for (const line of readFileSync(".env.staging.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
}
if (
  env.STAGING_PROJECT_REF !== "yolnsxesyosrozfobaen" ||
  env.SUPABASE_URL !== "https://yolnsxesyosrozfobaen.supabase.co"
)
  throw new Error("Staging reference guard failed");
const builtAssets = readdirSync(".output/public/assets")
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(`.output/public/assets/${name}`, "utf8"))
  .join("\n");
if (
  !builtAssets.includes(env.SUPABASE_URL) ||
  builtAssets.includes("https://qsloqqvdunfuyqqdmgil.supabase.co")
)
  throw new Error("Build is not isolated staging; run build --mode staging first");
const config = JSON.parse(readFileSync(".output/server/wrangler.json", "utf8"));
config.name = "bajihears-launch-staging";
config.main = resolve(".output/server/index.mjs");
config.assets = { binding: "ASSETS", directory: resolve(".output/public") };
config.vars = { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY };
config.triggers = { crons: [] };
delete config.send_email;
delete config.routes;
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/staging-wrangler.json", JSON.stringify(config, null, 2));
if (process.argv.includes("--deploy")) {
  const deployed = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      "--config",
      "artifacts/staging-wrangler.json",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (deployed.status !== 0) {
    console.error(deployed.stdout, deployed.stderr);
    throw new Error("Staging deployment failed");
  }
  console.log(deployed.stdout);
  const secret = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "secret",
      "put",
      "SUPABASE_SERVICE_ROLE_KEY",
      "--config",
      "artifacts/staging-wrangler.json",
    ],
    { input: env.SUPABASE_SERVICE_ROLE_KEY, encoding: "utf8", windowsHide: true },
  );
  if (secret.status !== 0) throw new Error("Staging server secret configuration failed");
  console.log(
    "PASS isolated staging deployed with its own backend secret and no email or cron bindings",
  );
} else console.log("PASS generated staging-only deployment configuration; no deployment performed");
