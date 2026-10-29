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

async function safeGoto(targetUrl) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    } catch (error) {
      lastError = error;
      console.warn(`Navigation attempt ${attempt + 1} failed: ${String(error).split("\n")[0]}`);
      if (!String(error).includes("net::ERR_") || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

try {
  for (const [route, canonical] of [
    ["/", "https://bajihears.app/"],
    ["/duel", "https://bajihears.app/duel"],
    ["/corner", "https://bajihears.app/corner"],
  ]) {
    const response = await safeGoto(`${base}${route}`);
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
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), canonical);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), canonical);
    console.log(`PASS live route ${route}`);
  }

  await safeGoto(`${base}/`);
  await page.getByText("BajiHears Original · Fictional", { exact: true }).first().waitFor();
  for (
    let i = 0;
    i < 5 && (await page.getByText("BajiHears Original · Fictional", { exact: true }).count()) < 30;
    i++
  ) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }
  assert.equal(await page.getByText("BajiHears Original · Fictional", { exact: true }).count(), 30);
  const originalCards = page.locator("article[data-editorial-seed-id]");
  if ((await originalCards.count()) > 0) {
    assert.equal(await originalCards.count(), 30);
    assert.deepEqual(
      (
        await originalCards.evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-editorial-seed-id")),
        )
      ).sort(),
      Array.from({ length: 30 }, (_, index) => `BH-${String(index + 1).padStart(3, "0")}`),
    );
  }
  console.log("PASS exactly 30 labeled Originals are visible in production");

  await safeGoto(`${base}/admin/moderation`);
  await page.getByText("Sign in with Google", { exact: true }).waitFor();
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute("content"),
    "noindex, nofollow",
  );
  console.log("PASS signed-out moderation route exposes no dashboard and is noindex");

  const readResponse = await safeGoto(`${base}/read`);
  assert.equal(readResponse?.status(), 200);
  assert.equal(new URL(page.url()).pathname, "/");
  console.log("PASS live /read redirect");

  const diagnostics = await context.request.get(`${base}/diagnostics`);
  assert.equal(diagnostics.status(), 404);
  console.log("PASS live diagnostics disabled");

  for (const asset of [
    "/manifest.webmanifest",
    "/brand.svg",
    "/favicon.ico",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/badge-72.png",
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

  if (process.env.TEST_OAUTH_START === "1") {
    await page.goto(`${base}/corner`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("navigation", { name: "Your Corner sections" })
      .getByRole("button", { name: "Settings" })
      .click();
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.waitForURL((url) => url.hostname === "accounts.google.com", { timeout: 30000 });
    console.log("PASS live Google OAuth reaches the Google authorization screen");
  }
} finally {
  await browser.close();
}
