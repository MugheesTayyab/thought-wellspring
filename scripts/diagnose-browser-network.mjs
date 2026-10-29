import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const urls = [
  "https://example.com/",
  "https://bajihears.app/duel",
  "https://bajihears.mugheestayyab4.workers.dev/duel",
];
const results = [];
const address = process.argv.find((arg) => arg.startsWith("--ip="))?.slice(5);
if (address && !["104.21.92.25", "172.67.185.85"].includes(address))
  throw new Error("Use an observed public DNS address only");
for (const channel of ["chrome", "msedge"]) {
  let browser;
  try {
    browser = await chromium.launch({
      channel,
      headless: true,
      args: [
        "--disable-quic",
        ...(address ? [`--host-resolver-rules=MAP bajihears.app ${address}`] : []),
        ...(process.argv.includes("--without-ech")
          ? ["--disable-features=EncryptedClientHello"]
          : []),
      ],
    });
    for (const url of process.argv.includes("--cloudflare-control")
      ? ["https://www.cloudflare.com/", urls[1]]
      : address
        ? [urls[1]]
        : urls) {
      for (
        let index = 0;
        index < (process.argv.includes("--cloudflare-control") ? 1 : 3);
        index++
      ) {
        const context = await browser.newContext();
        if (process.argv.includes("--intercept"))
          await context.route("**/*", (route) => route.continue());
        const page = await context.newPage();
        const start = performance.now();
        try {
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          const title = await page.title();
          results.push({
            channel,
            url,
            status: response?.status(),
            title,
            ms: Math.round(performance.now() - start),
          });
        } catch (error) {
          results.push({ channel, url, error: String(error).split("\n")[0] });
        }
        await context.close();
      }
    }
  } catch (error) {
    results.push({ channel, available: false, error: String(error).split("\n")[0] });
  } finally {
    await browser?.close();
  }
}
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  process.argv.includes("--cloudflare-control")
    ? "artifacts/browser-network-cloudflare-control.json"
    : process.argv.includes("--without-ech")
      ? "artifacts/browser-network-without-ech.json"
      : address
        ? `artifacts/browser-network-${address}.json`
        : process.argv.includes("--intercept")
          ? "artifacts/browser-network-intercept-diagnostic.json"
          : "artifacts/browser-network-diagnostic.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
