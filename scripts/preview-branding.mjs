import { chromium } from "@playwright/test";
import { readFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1850 },
    deviceScaleFactor: 2,
  });

  const getBase64 = (relPath) => {
    const full = resolve(relPath);
    const buf = readFileSync(full);
    const ext = relPath.endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `data:${ext};base64,${buf.toString("base64")}`;
  };

  const headerBadge = getBase64("public/assets/brand/header-badge.png");
  const headerBadge64 = getBase64("public/assets/brand/header-badge-64.png");
  const fav16 = getBase64("public/favicon-16x16.png");
  const fav32 = getBase64("public/favicon-32x32.png");
  const fav48 = getBase64("public/favicon.ico"); // Browser handles ICO or we use fav32/48
  const pwa192 = getBase64("public/icon-192.png");
  const pwa512 = getBase64("public/icon-512.png");
  const maskable512 = getBase64("public/icon-maskable-512.png");
  const apple180 = getBase64("public/apple-touch-icon.png");
  const brandSvg = getBase64("public/brand.svg");
  const ogImage = getBase64("public/og-image.png");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>BajiHears Brand Assets Preview Sheet</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      background: #FAF7F3;
      color: #342D2A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    h1 { font-family: Georgia, serif; font-size: 28px; margin: 0 0 8px 0; color: #A34F46; }
    p.sub { font-size: 14px; color: #746B66; margin: 0 0 32px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }
    .card {
      background: #FFFFFF;
      border: 1px solid #EBE5DF;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .card h2 { font-size: 16px; margin: 0 0 16px 0; color: #342D2A; border-bottom: 1px solid #F0EAE3; padding-bottom: 8px; }
    .header-mockup {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: rgba(250, 247, 243, 0.95);
      border-bottom: 1px solid #EAE3DC;
      border-radius: 12px;
      margin-top: 12px;
    }
    .brand-title { font-family: "Fraunces", Georgia, serif; font-size: 18px; font-weight: 700; color: #A34F46; }
    .tab-bar { display: flex; gap: 8px; padding: 8px; border-radius: 8px; margin-bottom: 12px; }
    .tab-bar.light { background: #E7EAED; }
    .tab-bar.dark { background: #202124; color: #FFFFFF; }
    .tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px 8px 0 0;
      font-size: 12px;
      font-family: system-ui;
    }
    .tab.active-light { background: #FFFFFF; color: #1F1F1F; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .tab.active-dark { background: #35363A; color: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .phone-mockup {
      display: flex;
      gap: 20px;
      align-items: center;
      padding: 16px;
      background: #F4EFEB;
      border-radius: 14px;
    }
    .app-icon-ios {
      width: 60px;
      height: 60px;
      border-radius: 13.5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .app-icon-android-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .app-icon-android-squircle {
      width: 60px;
      height: 60px;
      border-radius: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .label { font-size: 11px; text-align: center; margin-top: 6px; font-weight: 500; color: #555; }
    .pixel-zoom {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
      padding: 8px 14px;
      background: #FDFBF8;
      border-radius: 8px;
      border: 1px solid #EBE5DF;
    }
    .og-preview {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      border: 1px solid #EAE3DC;
      display: block;
    }
  </style>
</head>
<body>
  <h1>BajiHears Brand Icon Suite & Identity Preview</h1>
  <p class="sub">Production-ready asset mapping adapted from the three original Manus source images.</p>

  <div class="grid">
    <!-- Card 1: Site Header Badge -->
    <div class="card">
      <h2>1. Site Header & Navigation Badge (Soft Cream Medallion)</h2>
      <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">
        Source: <em>Cheerful Hijab Avatar Badge</em>. Anti-aliased circular alpha edge, warm cream background (#FAF7F3), zero fragile noise.
      </p>
      <div class="header-mockup">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${headerBadge64}" width="28" height="28" style="display:block; border-radius:50%;" alt="BajiHears"/>
          <span class="brand-title">BajiHears</span>
          <span style="display:inline-flex; align-items:center; gap:2px; color:#A34F46; vertical-align:middle;">
            <span style="display:inline-block; width:4px; height:9px; border-right:1.75px solid currentColor; border-radius:0 999px 999px 0;"></span>
            <span style="display:inline-block; width:5px; height:14px; border-right:1.75px solid currentColor; border-radius:0 999px 999px 0; opacity:0.65;"></span>
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; padding:4px 10px; background:#FFF; border:1px solid #E3DCD5; border-radius:12px; font-weight:600; color:#342D2A;">The Wall</span>
          <span style="font-size:12px; padding:4px 10px; background:transparent; border-radius:12px; color:#777;">Originals</span>
        </div>
      </div>
      <div style="margin-top:16px; display:flex; gap:16px; align-items:center;">
        <div>
          <img src="${headerBadge}" width="64" height="64" style="border-radius:50%; box-shadow: 0 2px 6px rgba(0,0,0,0.06);" />
          <div class="label">64x64 Retina</div>
        </div>
        <div>
          <img src="${headerBadge64}" width="34" height="34" style="border-radius:50%; box-shadow: 0 1px 4px rgba(0,0,0,0.06);" />
          <div class="label">34x34 Standard</div>
        </div>
        <div>
          <img src="${headerBadge64}" width="28" height="28" style="border-radius:50%; box-shadow: 0 1px 3px rgba(0,0,0,0.06);" />
          <div class="label">28x28 Header</div>
        </div>
      </div>
    </div>

    <!-- Card 2: Browser Tabs & Favicon -->
    <div class="card">
      <h2>2. Browser Favicon & Small Size Visibility (16x16 / 32x32)</h2>
      <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">
        Source: <em>Smiling Hijab Icon with Wave</em>. Bold mustard curve + clean sound wave for high legibility at micro sizes.
      </p>

      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px;">Chrome / Safari Light Tab</div>
      <div class="tab-bar light">
        <div class="tab active-light">
          <img src="${fav16}" width="16" height="16" alt="favicon"/>
          <span>BajiHears | Say the Unsaid</span>
        </div>
      </div>

      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px;">Chrome / Safari Dark Tab</div>
      <div class="tab-bar dark">
        <div class="tab active-dark">
          <img src="${fav16}" width="16" height="16" alt="favicon"/>
          <span>BajiHears | Say the Unsaid</span>
        </div>
      </div>

      <div class="pixel-zoom">
        <div>
          <img src="${fav16}" width="16" height="16" style="image-rendering: pixelated; border-radius: 3px;" />
          <div class="label">16x16 1x</div>
        </div>
        <div>
          <img src="${fav16}" width="32" height="32" style="image-rendering: pixelated; border-radius: 4px;" />
          <div class="label">16x16 @2x</div>
        </div>
        <div>
          <img src="${fav32}" width="32" height="32" style="border-radius: 6px;" />
          <div class="label">32x32 Native</div>
        </div>
        <div>
          <img src="${brandSvg}" width="40" height="40" style="border-radius: 8px;" />
          <div class="label">Vector SVG</div>
        </div>
      </div>
    </div>

    <!-- Card 3: Mobile Home Screen Launchers (iOS / Android) -->
    <div class="card">
      <h2>3. Mobile Home Screen & Adaptive Icons</h2>
      <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">
        Source: <em>Listening Hijab Girl Icon</em> (Candidate MAIN BajiHears Mark).
      </p>
      <div class="phone-mockup">
        <div>
          <img class="app-icon-ios" src="${apple180}" />
          <div class="label">iOS 180x180</div>
        </div>
        <div>
          <img class="app-icon-android-circle" src="${maskable512}" />
          <div class="label">Android Circle</div>
        </div>
        <div>
          <img class="app-icon-android-squircle" src="${maskable512}" />
          <div class="label">Android Squircle</div>
        </div>
        <div>
          <img style="width:60px; height:60px; border-radius:12px;" src="${pwa192}" />
          <div class="label">PWA 192x192</div>
        </div>
      </div>
      <p style="font-size: 11px; color: #777; margin-top: 10px;">
        *Android Maskable icon respects the 80% inner circle safe-zone with brick red (#A84237) background bleed.
      </p>
    </div>

    <!-- Card 4: PWA Full Scale & Specifications -->
    <div class="card">
      <h2>4. Asset Specifications & Size Matrix</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
        <thead>
          <tr style="border-bottom: 2px solid #EAE3DC; text-align: left;">
            <th style="padding: 6px 0;">Role</th>
            <th>File Path</th>
            <th>Dimensions</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">Header Badge</td>
            <td><code>public/assets/brand/header-badge.png</code></td>
            <td>128x128 / 64x64</td>
            <td>21.4 KB / 6.5 KB (.webp)</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">Favicon ICO</td>
            <td><code>public/favicon.ico</code></td>
            <td>16 / 32 / 48 multi-size</td>
            <td>5.9 KB</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">Favicon PNG</td>
            <td><code>public/favicon-32x32.png</code></td>
            <td>32x32 / 16x16</td>
            <td>1.8 KB / 0.7 KB</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">Vector SVG</td>
            <td><code>public/brand.svg</code></td>
            <td>192x192 (vector)</td>
            <td>1.4 KB</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">Apple Touch</td>
            <td><code>public/apple-touch-icon.png</code></td>
            <td>180x180</td>
            <td>30.9 KB</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE3;">
            <td style="padding: 8px 0; font-weight: 600;">PWA Launcher</td>
            <td><code>public/icon-192.png</code>, <code>icon-512.png</code></td>
            <td>192x192 / 512x512</td>
            <td>34.6 KB / 211.8 KB</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">PWA Maskable</td>
            <td><code>public/icon-maskable-512.png</code></td>
            <td>512x512 (80% safe)</td>
            <td>145.1 KB</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Full width: OpenGraph Share Artwork -->
  <div class="card">
    <h2>5. Social OpenGraph / Twitter Share Card (1200x630)</h2>
    <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">
      File: <code>public/og-image.png</code>. Features the Cheerful Avatar Badge header, Fraunces serif typography, and the high-resolution Listening Mascot portrait.
    </p>
    <img src="${ogImage}" class="og-preview" alt="OpenGraph Preview" />
  </div>
</body>
</html>`;

  await page.setContent(html);
  const outPath = "supabase/.temp/brand_preview_sheet.png";
  await page.screenshot({ path: outPath, fullPage: true });
  console.log("Updated brand preview sheet generated successfully at", outPath);

  // Copy to brain artifacts directory for embedding in report
  const artifactDest = "C:/Users/mughe/.gemini/antigravity-ide/brain/c79aace0-5964-4add-83e6-78fbbf82d940/brand_preview_sheet.png";
  copyFileSync(outPath, artifactDest);
  console.log("Copied to artifacts directory:", artifactDest);
} finally {
  await browser.close();
}
