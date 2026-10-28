import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.env.TEST_BASE_URL || "https://bajihears.app";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-quic"] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cacheNames = await page.evaluate(() => caches.keys());
  assert.ok(cacheNames.includes("bajihears-offline-v1"));
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("bajihears-offline-v1");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  assert.deepEqual(cached, ["/offline.html"], "Only generic offline shell may be cached");
  await context.setOffline(true);
  await page.goto(`${base}/corner`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "You're offline", exact: true }).waitFor();
  mkdirSync("artifacts/browser", { recursive: true });
  await page.screenshot({ path: "artifacts/browser/live-offline.png", fullPage: true });
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again", exact: true }).click();
  await page.getByRole("navigation").waitFor();
  assert.equal(await page.getByRole("heading", { name: "You're offline", exact: true }).count(), 0);
  console.log("PASS deployed service worker offline shell, private-cache exclusion and online recovery");
  await context.close();
} finally {
  await browser.close();
}
