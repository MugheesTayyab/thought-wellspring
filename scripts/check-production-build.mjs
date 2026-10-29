import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Prevent a previously built staging frontend from reaching the public Worker.
const config = JSON.parse(readFileSync("wrangler.json", "utf8"));
assert.equal(config.name, "bajihears");
assert.equal(config.vars.SUPABASE_URL, "https://qsloqqvdunfuyqqdmgil.supabase.co");
const assets = readdirSync(".output/public/assets")
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(`.output/public/assets/${name}`, "utf8"))
  .join("\n");
assert.ok(
  assets.includes(config.vars.SUPABASE_URL),
  "Production backend missing from browser build",
);
assert.ok(
  !assets.includes("yolnsxesyosrozfobaen.supabase.co"),
  "Staging backend found in production build",
);
console.log("PASS production Worker and browser build target the production backend");
