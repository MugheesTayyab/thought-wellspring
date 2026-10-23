import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { contentSecurityPolicy } from "../lib/request-security";

describe("Legal pages, transparency & AdSense readiness", () => {
  it("provides ads.txt in public/ conforming to authorized seller format", () => {
    const adsTxtPath = resolve(process.cwd(), "public/ads.txt");
    expect(existsSync(adsTxtPath)).toBe(true);
    const content = readFileSync(adsTxtPath, "utf8");
    expect(content).toContain("bajihears.app");
    expect(content).toContain("google.com");
    expect(content).toContain("f08c47fec0942fa0");
    // Ensure example pub-ID is NOT published as active uncommented seller
    const activeLines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    expect(activeLines.length).toBe(0);
  });

  it("provides sitemap.xml listing all canonical public routes", () => {
    const sitemapPath = resolve(process.cwd(), "public/sitemap.xml");
    expect(existsSync(sitemapPath)).toBe(true);
    const xml = readFileSync(sitemapPath, "utf8");
    expect(xml).toContain("https://bajihears.app/");
    expect(xml).toContain("https://bajihears.app/about");
    expect(xml).toContain("https://bajihears.app/privacy");
    expect(xml).toContain("https://bajihears.app/terms");
    expect(xml).toContain("https://bajihears.app/duel");
    expect(xml).toContain("https://bajihears.app/corner");
  });

  it("declares sitemap in robots.txt", () => {
    const robotsPath = resolve(process.cwd(), "public/robots.txt");
    expect(existsSync(robotsPath)).toBe(true);
    const robots = readFileSync(robotsPath, "utf8");
    expect(robots).toContain("Sitemap: https://bajihears.app/sitemap.xml");
  });

  it("preserves strict Content Security Policy with nonces", () => {
    const cspWithNonce = contentSecurityPolicy("test-nonce-12345");
    expect(cspWithNonce).toContain("script-src 'self' 'nonce-test-nonce-12345' 'strict-dynamic'");
    expect(cspWithNonce).toContain("frame-ancestors 'none'");
    expect(cspWithNonce).toContain("object-src 'none'");
  });

  it("verifies public headers include ads.txt and sitemap.xml cache rules", () => {
    const headersPath = resolve(process.cwd(), "public/_headers");
    const headers = readFileSync(headersPath, "utf8");
    expect(headers).toContain("/ads.txt");
    expect(headers).toContain("/sitemap.xml");
    expect(headers).toContain("Strict-Transport-Security");
  });
});
