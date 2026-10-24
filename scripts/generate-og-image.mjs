import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  const mascotBuf = readFileSync(resolve("public/icon-512.png"));
  const mascotBase64 = `data:image/png;base64,${mascotBuf.toString("base64")}`;

  const badgeBuf = readFileSync(resolve("public/assets/brand/header-badge.png"));
  const badgeBase64 = `data:image/png;base64,${badgeBuf.toString("base64")}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #FAF7F3;
      color: #2C2523;
      font-family: Georgia, serif;
      padding: 64px 72px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .watermark {
      position: absolute;
      right: -80px;
      bottom: -80px;
      width: 480px;
      height: 480px;
      border-radius: 50%;
      background: rgba(227, 184, 177, 0.15);
      pointer-events: none;
    }
    .left-col {
      max-width: 680px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      z-index: 2;
    }
    .brand-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-title {
      font-size: 38px;
      font-weight: 700;
      color: #A34F46;
      letter-spacing: -0.5px;
    }
    .wave-mark {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #A34F46;
      vertical-align: middle;
    }
    .headline {
      font-size: 72px;
      line-height: 1.1;
      font-weight: 700;
      color: #2C2523;
      letter-spacing: -1px;
      margin-top: 24px;
      margin-bottom: 20px;
    }
    .subhead {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 24px;
      line-height: 1.4;
      color: #746B66;
    }
    .tagline-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #8C372F;
      background: #FBE6E4;
      border: 1px solid #E3B8B1;
      padding: 8px 18px;
      border-radius: 999px;
      width: fit-content;
      margin-top: 24px;
    }
    .right-col {
      z-index: 2;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .mascot-card {
      width: 380px;
      height: 380px;
      border-radius: 48px;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(163, 79, 70, 0.18), 0 4px 12px rgba(0,0,0,0.06);
      border: 4px solid #FFFFFF;
      background: #B33B31;
    }
    .mascot-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  <div class="watermark"></div>

  <div class="left-col">
    <div>
      <div class="brand-header">
        <img src="${badgeBase64}" width="48" height="48" style="border-radius: 50%;" alt="BajiHears Logo" />
        <span class="brand-title">BajiHears</span>
        <span class="wave-mark">
          <span style="display:inline-block; width:5px; height:13px; border-right:2.5px solid currentColor; border-radius:0 999px 999px 0;"></span>
          <span style="display:inline-block; width:7px; height:20px; border-right:2.5px solid currentColor; border-radius:0 999px 999px 0; opacity:0.65;"></span>
        </span>
      </div>

      <div class="headline">For the thoughts you<br/>keep to yourself.</div>
      <div class="subhead">Read what others are thinking. Share when you feel like it. Take part in the daily Duel.</div>
    </div>

    <div class="tagline-pill">
      <span>✨ 100% Anonymous</span>
      <span style="opacity:0.4;">·</span>
      <span>No Sign-Up</span>
      <span style="opacity:0.4;">·</span>
      <span>Curated Fiction & Community</span>
    </div>
  </div>

  <div class="right-col">
    <div class="mascot-card">
      <img src="${mascotBase64}" alt="BajiHears Listening Mascot" />
    </div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  await page.screenshot({ path: "public/og-image.png" });
  console.log("Official branded OG image generated successfully at public/og-image.png (1200x630)");
} finally {
  await browser.close();
}
