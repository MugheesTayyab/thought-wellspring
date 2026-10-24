#!/usr/bin/env python3
"""
BajiHears Brand Asset Generator
Generates production-ready, accessible brand icons from the 3 original Manus assets.
Preserves facial features, distinctive brand identity, and color harmony:
Warm brick red (#A84237), mustard gold (#FCB731), soft cream (#FAF7F3).
"""

import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image, ImageDraw

RAW_DIR = "resources/brand"
PUBLIC_DIR = "public"
BRAND_ASSETS_DIR = os.path.join(PUBLIC_DIR, "assets", "brand")

os.makedirs(BRAND_ASSETS_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# 1. SITE HEADER & NAVIGATION BADGE (from Cheerful Hijab Avatar Badge)
print("[1/5] Processing Site Header Badge from Cheerful Hijab Avatar Badge...")
src_cheerful = Image.open(os.path.join(RAW_DIR, "Cheerful_Hijab_Avatar_Badge_Original.png")).convert("RGBA")
# Center of the cream circle medallion is (624, 627), radius 594
cx, cy, r = 624, 627, 594
badge_crop = src_cheerful.crop((cx - r, cy - r, cx + r, cy + r))
cw, ch = badge_crop.size

# High-resolution supersampled anti-aliased circular alpha mask
scale = 4
big_mask = Image.new("L", (cw * scale, ch * scale), 0)
draw = ImageDraw.Draw(big_mask)
draw.ellipse([0, 0, cw * scale, ch * scale], fill=255)
smooth_mask = big_mask.resize((cw, ch), Image.Resampling.LANCZOS)
badge_crop.putalpha(smooth_mask)

# Save 128x128 (Retina) and 64x64
header_badge_128 = badge_crop.resize((128, 128), Image.Resampling.LANCZOS)
header_badge_64 = badge_crop.resize((64, 64), Image.Resampling.LANCZOS)

header_badge_128.save(os.path.join(BRAND_ASSETS_DIR, "header-badge.png"), optimize=True)
header_badge_64.save(os.path.join(BRAND_ASSETS_DIR, "header-badge-64.png"), optimize=True)
header_badge_128.save(os.path.join(BRAND_ASSETS_DIR, "header-badge.webp"), quality=95)
print("  ✓ Saved header-badge.png (128x128 retina, 64x64 standard, .webp)")

# 2. FAVICONS & MICRO-SIZE MARKS (from Smiling Hijab Icon with Wave)
print("[2/5] Processing Favicons from Smiling Hijab Icon with Wave...")
src_wave = Image.open(os.path.join(RAW_DIR, "Smiling_Hijab_Icon_Wave_Original.png")).convert("RGB")
bg_wave = (168, 48, 43) # Brick red background

# Balanced crop around the character & sound wave
sq_wave = Image.new("RGB", (1200, 1200), bg_wave)
crop_wave = src_wave.crop((150, 30, 1254, 1134))
sq_wave.paste(crop_wave, (48, 48))

fav16 = sq_wave.resize((16, 16), Image.Resampling.LANCZOS)
fav32 = sq_wave.resize((32, 32), Image.Resampling.LANCZOS)
fav48 = sq_wave.resize((48, 48), Image.Resampling.LANCZOS)
fav192 = sq_wave.resize((192, 192), Image.Resampling.LANCZOS)

fav16.save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"), optimize=True)
fav32.save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"), optimize=True)
fav192.save(os.path.join(PUBLIC_DIR, "favicon.png"), optimize=True)

# Generate multi-size favicon.ico containing 16x16, 32x32, 48x48
sq_wave.save(os.path.join(PUBLIC_DIR, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("  ✓ Saved favicon-16x16.png, favicon-32x32.png, favicon.png, and favicon.ico")

# 3. PWA & APPLE TOUCH LAUNCHER ICONS (from Listening Hijab Girl Icon)
print("[3/5] Processing PWA Launchers from Listening Hijab Girl Icon...")
src_main = Image.open(os.path.join(RAW_DIR, "Listening_Hijab_Girl_Icon_Original.png")).convert("RGB")
bg_main = (168, 66, 55) # Brick red background

# Apple Touch Icon: 180x180 solid background
apple_touch = src_main.resize((180, 180), Image.Resampling.LANCZOS)
apple_touch.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), optimize=True)

# Standard PWA Icons: 192x192 & 512x512
pwa_192 = src_main.resize((192, 192), Image.Resampling.LANCZOS)
pwa_512 = src_main.resize((512, 512), Image.Resampling.LANCZOS)
pwa_192.save(os.path.join(PUBLIC_DIR, "icon-192.png"), optimize=True)
pwa_512.save(os.path.join(PUBLIC_DIR, "icon-512.png"), optimize=True)

# Maskable 512x512 with safe-zone compliance (W3C standard: content within 80% circle, diameter 409.6)
maskable_512 = Image.new("RGB", (512, 512), bg_main)
mascot_crop = src_main.crop((120, 90, 1254, 1224))
mascot_fitted = mascot_crop.resize((400, 396), Image.Resampling.LANCZOS)
maskable_512.paste(mascot_fitted, (56, 58))
maskable_512.save(os.path.join(PUBLIC_DIR, "icon-maskable-512.png"), optimize=True)
print("  ✓ Saved apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png")

# 4. NOTIFICATION BADGE (72x72)
print("[4/5] Processing Push Notification Badge...")
badge_72 = sq_wave.resize((72, 72), Image.Resampling.LANCZOS)
badge_72.save(os.path.join(PUBLIC_DIR, "badge-72.png"), optimize=True)
print("  ✓ Saved badge-72.png")

# 5. Summary of generated file sizes
print("\n[5/5] File Weight & Asset Summary:")
for fname in [
    "assets/brand/header-badge.png",
    "assets/brand/header-badge.webp",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon.ico",
    "favicon.png",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "badge-72.png"
]:
    p = os.path.join(PUBLIC_DIR, fname)
    if os.path.exists(p):
        kb = os.path.getsize(p) / 1024
        print(f"  - {fname:32s} : {kb:6.1f} KB")

print("\nAll brand assets generated successfully.")
