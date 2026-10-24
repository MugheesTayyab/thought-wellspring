import { execSync } from "node:child_process";

console.log("=== BajiHears Master Brand Asset Generation Pipeline ===");

console.log("\n[1/3] Building production icon variants with Python/Pillow...");
execSync("python scripts/build-brand-icons.py", { stdio: "inherit" });

console.log("\n[2/3] Generating pure vector brand.svg...");
execSync("node scripts/generate-brand-svg.mjs", { stdio: "inherit" });

console.log("\n[3/3] Generating official 1200x630 OpenGraph share artwork...");
execSync("node scripts/generate-og-image.mjs", { stdio: "inherit" });

console.log("\n✓ All BajiHears brand assets generated and verified.");
