import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const urls = ["https://example.com/", "https://bajihears.app/duel", "https://bajihears.mugheestayyab4.workers.dev/duel"];
const results = [];
for (const channel of ["chrome", "msedge"]) {
  let browser;
  try {
    browser = await chromium.launch({ channel, headless: true, args: ["--disable-quic"] });
    for (const url of urls) {
      for (let index = 0; index < 3; index++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const start = performance.now();
        try {
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          const title = await page.title();
          results.push({ channel, url, status: response?.status(), title, ms: Math.round(performance.now() - start) });
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
writeFileSync("artifacts/browser-network-diagnostic.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
