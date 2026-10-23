import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const base = (process.env.TEST_BASE_URL || "https://bajihears.mugheestayyab4.workers.dev").replace(
  /\/$/,
  "",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const pageErrors = [];
const serverErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
});

try {
  for (const route of ["/", "/duel", "/corner"]) {
    const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.status() < 500, `${route} returned ${response?.status()}`);
    await page.getByRole("navigation").waitFor();
    await page.waitForTimeout(1000);
    assert.equal(await page.getByText("This page didn't load", { exact: true }).count(), 0);
    if (route === "/") {
      assert.equal(await page.getByText("Couldn't load the Wall just now.").count(), 0);
    }
    if (route === "/duel") {
      assert.equal(await page.getByText("The Duel could not load", { exact: true }).count(), 0);
    }
    console.log(`PASS live route ${route}`);
  }

  const readResponse = await page.goto(`${base}/read`, { waitUntil: "domcontentloaded" });
  assert.equal(readResponse?.status(), 200);
  assert.equal(new URL(page.url()).pathname, "/");
  console.log("PASS live /read redirect");

  const diagnostics = await context.request.get(`${base}/diagnostics`);
  assert.equal(diagnostics.status(), 404);
  console.log("PASS live diagnostics disabled");

  for (const asset of [
    "/manifest.webmanifest",
    "/brand.svg",
    "/favicon.png",
    "/icon-512.png",
    "/og-image.png",
    "/sw.js",
  ]) {
    const response = await context.request.get(`${base}${asset}`);
    assert.equal(response.status(), 200, `${asset} returned ${response.status()}`);
  }
  console.log("PASS live manifest, brand, icons, share image, and service worker");
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(serverErrors, []);
  console.log("PASS live browser smoke test with no page or HTTP 5xx errors");
} finally {
  await browser.close();
}
