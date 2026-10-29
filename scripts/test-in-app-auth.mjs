import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.env.TEST_BASE_URL || "https://bajihears.app";
const address = process.env.TEST_RESOLVE_ADDRESS;
if (address) assert.ok(["104.21.92.25", "172.67.185.85"].includes(address));
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: address ? [`--host-resolver-rules=MAP bajihears.app ${address}`] : [],
});
try {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    serviceWorkers: "block",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 400.0.0",
  });
  let authorizations = 0;
  await context.route(/^https:\/\/[^/]+\.supabase\.co\//, (route) => {
    if (new URL(route.request().url()).pathname.includes("/auth/v1/authorize")) authorizations++;
    return route.abort();
  });
  await context.route("**/_serverFn/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          ok: true,
          data: {
            posts: [],
            totalLikesReceived: 0,
            totalPosts: 0,
            likedPosts: [],
            winner: null,
            duel: null,
            alreadyVoted: false,
          },
        },
        context: {},
      }),
    }),
  );
  await context.route("**/cdn-cgi/rum*", (route) =>
    route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": new URL(base).origin,
        "access-control-allow-credentials": "true",
      },
    }),
  );
  const page = await context.newPage();
  await page.goto(`${base}/corner`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("navigation", { name: "Your Corner sections" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("heading", { name: "Open BajiHears in your browser", exact: true })
    .waitFor();
  assert.equal(
    await dialog.getByRole("textbox", { name: "Browser link" }).inputValue(),
    "https://bajihears.app/corner",
  );
  assert.equal(authorizations, 0, "Never send Google OAuth into the embedded browser");
  assert.equal(new URL(page.url()).hostname, new URL(base).hostname);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  mkdirSync("artifacts/browser", { recursive: true });
  await page.screenshot({ path: "artifacts/browser/instagram-handoff.png", fullPage: true });
  await dialog.getByRole("button", { name: "Continue reading", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Wall", exact: true }).click();
  await page.waitForTimeout(10000);
  assert.equal(
    await page.getByRole("dialog").count(),
    0,
    "Do not offer unsupported in-app installation",
  );
  assert.equal(authorizations, 0);
  console.log(
    `PASS Instagram UA simulation: clear browser handoff at320px, no embedded Google authorization, continued reading, no unsupported install prompt${address ? " (diagnostic address pin; does not clear transport gate)" : ""}`,
  );
  await context.close();
} finally {
  await browser.close();
}
