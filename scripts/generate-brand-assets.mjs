import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

// New typography-only assets; no generated illustration or mascot.
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:#faf7f3;color:#342d2a;font-family:Georgia,serif;padding:72px;box-sizing:border-box;height:630px"><div style="font-size:28px;color:#a34f46">bh / BajiHears</div><div style="font-size:82px;line-height:1.08;margin-top:100px;max-width:920px">For the thoughts you<br>keep to yourself.</div><div style="font-family:Arial,sans-serif;font-size:26px;color:#746b66;margin-top:48px">Read the Wall. Share a thought. Take part in a Duel.</div></body></html>`,
  );
  await page.screenshot({ path: "public/og-image.png" });
  for (const [size, path] of [
    [192, "public/favicon.png"],
    [512, "public/icon-512.png"],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0">${readFileSync("public/brand.svg", "utf8").replace('width="192" height="192"', `width="${size}" height="${size}"`)}</body></html>`,
    );
    await page.screenshot({ path, omitBackground: true });
  }
  console.log("Generated typography-only share image and application icons.");
} finally {
  await browser.close();
}
