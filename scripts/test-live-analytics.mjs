import { chromium, firefox } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const browser =
  process.env.TEST_BROWSER_ENGINE === "firefox"
    ? await firefox.launch({ headless: true })
    : await chromium.launch({
        channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
        headless: true,
        args: ["--disable-quic"],
      });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const receipts = [];
let tagRequests = 0;
const isCollection = (url) =>
  /(^|\.)google-analytics\.com$/.test(url.hostname) && url.pathname.endsWith("/collect");
page.on("request", (request) => {
  if (request.url().startsWith("https://www.googletagmanager.com/gtag/js")) tagRequests++;
});
context.on("response", (response) => {
  const url = new URL(response.url());
  if (isCollection(url))
    receipts.push({
      status: response.status(),
      measurementId: url.searchParams.get("tid"),
      event: url.searchParams.get("en"),
      page: url.searchParams.get("dl"),
    });
});
try {
  const base = process.env.TEST_BASE_URL || "https://bajihears.app";
  assert.ok(
    [
      "https://bajihears.app",
      "https://bajihears.mugheestayyab4.workers.dev",
      "http://127.0.0.1:4179",
    ].includes(base),
  );
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Accept Analytics", exact: true }).waitFor();
  assert.equal(tagRequests, 0, "No Google script before consent");
  assert.equal(receipts.length, 0, "No collection before consent");
  const collected = page.waitForResponse((response) => isCollection(new URL(response.url())), {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Accept Analytics", exact: true }).click();
  await collected;
  assert.equal(tagRequests, 1);
  await page.waitForTimeout(1000);
  assert.ok(
    receipts.some(
      (v) => v.status === 204 && v.measurementId === "G-YK9LL21171" && v.event === "page_view",
    ),
  );
  assert.ok(receipts.every((v) => !v.page || (!new URL(v.page).search && !new URL(v.page).hash)));
  const duelCollected = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        isCollection(url) &&
        url.searchParams.get("en") === "page_view" &&
        new URL(url.searchParams.get("dl")).pathname === "/duel"
      );
    },
    { timeout: 30000 },
  );
  await page.getByRole("navigation").getByRole("link", { name: "Duel", exact: true }).click();
  await duelCollected;
  await page.waitForTimeout(500);
  assert.equal(
    receipts.filter((v) => v.event === "page_view" && new URL(v.page).pathname === "/duel").length,
    1,
    "One real SPA page view",
  );
  await page.getByRole("navigation").getByRole("link", { name: "Corner", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Your Corner sections" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const peer = await context.newPage();
  const peerCollected = peer.waitForResponse((response) => isCollection(new URL(response.url())), {
    timeout: 30000,
  });
  await peer.goto(base, { waitUntil: "domcontentloaded" });
  await peerCollected;
  await page.getByRole("button", { name: "Enabled", exact: true }).click();
  await page.waitForFunction(() => window["ga-disable-G-YK9LL21171"] === true);
  await peer.waitForFunction(() => window["ga-disable-G-YK9LL21171"] === true);
  await page.waitForTimeout(1500);
  const countAfterWithdrawal = receipts.length;
  await page.getByRole("navigation").getByRole("link", { name: "Wall", exact: true }).click();
  await peer.getByRole("navigation").getByRole("link", { name: "Duel", exact: true }).click();
  await page.waitForTimeout(1500);
  assert.equal(
    receipts.length,
    countAfterWithdrawal,
    "Withdrawal stops real collection on navigation",
  );
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/live-analytics-receipts.json", JSON.stringify(receipts, null, 2));
  console.log(
    "PASS actual Google 204 receipt, one SPA page view, and no collection after consent withdrawal across two tabs for G-YK9LL21171",
  );
} finally {
  await context.close();
  await browser.close();
}
