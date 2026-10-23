import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4176";
const browser = await chromium.launch({ channel: "chrome", headless: true });
mkdirSync("artifacts/browser", { recursive: true });
async function setup({ ios = false, standalone = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    reducedMotion: "reduce",
    ...(ios
      ? {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        }
      : {}),
  });
  if (standalone)
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "standalone", { value: true }),
    );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // No production data is read or written during these checks.
  await page.route("**/_serverFn/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: { ok: true, data: { posts: [], hasMore: false, winner: null, serverTotal: 0 } },
        context: {},
      }),
    }),
  );
  await page.goto(base);
  await page.getByRole("navigation").waitFor();
  await page.waitForFunction(() => localStorage.getItem("bh:wall-visited") === "1");
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await page.clock.install();
  return { context, page, errors };
}
async function offer(page, outcome = "accepted") {
  await page.evaluate((result) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.__installCalled = true;
    };
    event.userChoice = Promise.resolve({ outcome: result });
    window.dispatchEvent(event);
  }, outcome);
  // Let React commit the captured install event before advancing virtual time.
  await page.waitForTimeout(100);
}
try {
  const { context, page, errors } = await setup();
  await offer(page);
  await page.clock.runFor(7000);
  assert.equal(await page.getByRole("dialog").count(), 0, "No immediate interruption");
  await page.clock.runFor(2000);
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.screenshot({
    path: "artifacts/browser/install-prompt-mobile.png",
    animations: "disabled",
  });
  const bounds = await dialog.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 360);
  await page.getByRole("button", { name: "Add BajiHears to my home screen" }).click();
  assert.equal(await page.evaluate(() => window.__installCalled), true);
  await page.getByRole("heading", { name: "A gentle nudge to come back." }).waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  assert.equal(await page.evaluate(() => localStorage.getItem("bh:appInstalled")), "true");
  assert.deepEqual(errors, []);
  await context.close();
  console.log(
    "PASS delayed native install, mobile fit, notification follow-up, installed tracking",
  );

  const dismissed = await setup();
  await offer(dismissed.page, "dismissed");
  await dismissed.page.clock.runFor(10000);
  await dismissed.page.getByRole("button", { name: "Add BajiHears to my home screen" }).click();
  await dismissed.page.waitForFunction(
    () => Number(localStorage.getItem("bh:installPromptAfter")) > Date.now(),
  );
  await dismissed.page.clock.runFor(500);
  assert.equal(await dismissed.page.getByRole("dialog").count(), 0);
  await dismissed.page.reload();
  await dismissed.page.getByRole("navigation").waitFor();
  await offer(dismissed.page);
  await dismissed.page.clock.runFor(12000);
  assert.equal(
    await dismissed.page.getByRole("dialog").count(),
    0,
    "Dismissal cooldown survives reload",
  );
  await dismissed.context.close();
  console.log("PASS native dismissal and persistent cooldown");

  const iphone = await setup({ ios: true });
  await iphone.page.clock.runFor(10000);
  await iphone.page.getByRole("button", { name: "Show me how to add it" }).click();
  await iphone.page.getByText("Tap Share, then Add to Home Screen.").waitFor();
  await iphone.page.keyboard.press("Escape");
  await iphone.page.waitForFunction(
    () => Number(localStorage.getItem("bh:installPromptAfter")) > Date.now(),
  );
  await iphone.page.clock.runFor(500);
  assert.equal(await iphone.page.getByRole("dialog").count(), 0);
  assert.deepEqual(iphone.errors, []);
  await iphone.context.close();
  console.log("PASS iPhone manual instructions and keyboard dismissal");

  const installed = await setup({ standalone: true });
  await installed.page.clock.runFor(10000);
  assert.equal(
    await installed.page.getByRole("heading", { name: "Keep your quiet corner close." }).count(),
    0,
  );
  await installed.context.close();
  console.log("PASS standalone users never receive an install invitation");
} finally {
  await browser.close();
}
