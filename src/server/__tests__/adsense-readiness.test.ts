import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentSecurityPolicy, httpsRedirect } from "../lib/request-security";
import { renderSitemap, sitemapEntries } from "../lib/sitemap";
import { CAPTCHA_FAILED_MESSAGE, verifyCaptcha } from "../lib/turnstile";
import { mapErrorToResponse } from "../lib/wrap-server-fn";
import { COLLECTIONS, COLLECTION_MIN_POSTS } from "@/shared/constants/collections";
import { CATEGORIES } from "@/shared/constants/categories";
import { ADSENSE } from "@/shared/constants/site";
import { GUIDES, parseGuide } from "@/shared/content/guides";
import { parseFrontmatter, parseInline, parseMarkdown } from "@/shared/lib/markdown";

describe("content security policy", () => {
  const off = contentSecurityPolicy("n", { adsEnabled: false });
  const on = contentSecurityPolicy("n", { adsEnabled: true });

  it("permits the Turnstile frame but no ad hosts while ads are off", () => {
    expect(off).toContain("frame-src https://challenges.cloudflare.com");
    expect(off).not.toContain("googlesyndication");
    expect(off).not.toContain("doubleclick");
  });

  it("keeps the nonce-based script policy and allows ad frames once ads are on", () => {
    expect(on).toContain("script-src 'self' 'nonce-n' 'strict-dynamic'");
    expect(on).toContain("https://pagead2.googlesyndication.com");
    expect(on).toMatch(/frame-src [^;]*https:\/\/googleads\.g\.doubleclick\.net/);
    expect(on).toMatch(/frame-src [^;]*https:\/\/tpc\.googlesyndication\.com/);
    expect(on).toContain("frame-ancestors 'none'");
    expect(on).not.toContain("'unsafe-inline' https://pagead2");
  });

  it("ships with ads off until the site is approved", () => {
    expect(ADSENSE.adsEnabled).toBe(false);
    expect(ADSENSE.client).toBe("ca-pub-3506843405786818");
    const adsTxt = readFileSync(resolve(process.cwd(), "public/ads.txt"), "utf8");
    expect(adsTxt).toContain(ADSENSE.client.replace("ca-", ""));
  });
});

describe("https redirect", () => {
  it("redirects plain HTTP on the production host and keeps the path", () => {
    const response = httpsRedirect(new Request("http://bajihears.app/about?x=1"));
    expect(response?.status).toBe(301);
    expect(response?.headers.get("Location")).toBe("https://bajihears.app/about?x=1");
  });

  it("leaves HTTPS and other hosts alone", () => {
    expect(httpsRedirect(new Request("https://bajihears.app/"))).toBeNull();
    expect(httpsRedirect(new Request("http://localhost:3000/"))).toBeNull();
  });
});

describe("captcha verification", () => {
  const replying = (body: unknown) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body))) as unknown as typeof fetch;

  it("is off when no secret is configured", async () => {
    const fetcher = replying({ success: false });
    await expect(verifyCaptcha(undefined, undefined, fetcher)).resolves.toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetcher = replying({ success: true });
    await expect(verifyCaptcha("secret", undefined, fetcher)).rejects.toThrow(
      CAPTCHA_FAILED_MESSAGE,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts only an explicit success", async () => {
    await expect(verifyCaptcha("s", "t", replying({ success: true }))).resolves.toBeUndefined();
    await expect(verifyCaptcha("s", "t", replying({ success: false }))).rejects.toThrow();
    await expect(verifyCaptcha("s", "t", replying({ success: "true" }))).rejects.toThrow();
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = vi.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;
    await expect(verifyCaptcha("s", "t", down)).rejects.toThrow(CAPTCHA_FAILED_MESSAGE);
  });

  it("reports a failed check as a user error rather than a server alert", () => {
    expect(mapErrorToResponse(new Error(CAPTCHA_FAILED_MESSAGE)).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });
});

describe("collections and sitemap", () => {
  it("has exactly one collection for every category, with a unique slug", () => {
    expect(COLLECTIONS.map((c) => c.category).sort()).toEqual([...CATEGORIES].sort());
    expect(new Set(COLLECTIONS.map((c) => c.slug)).size).toBe(COLLECTIONS.length);
  });

  it("lists a collection only once it has enough thoughts", () => {
    const thin = renderSitemap(sitemapEntries({ "hard-truth": COLLECTION_MIN_POSTS - 1 }));
    expect(thin).not.toContain("/wall/hard-truth");
    const full = renderSitemap(sitemapEntries({ "hard-truth": COLLECTION_MIN_POSTS }));
    expect(full).toContain("<loc>https://bajihears.app/wall/hard-truth</loc>");
    expect(full).not.toContain("/wall/vibe-check");
  });

  it("escapes XML in sitemap values", () => {
    expect(renderSitemap([{ path: "/a&b" }])).toContain("/a&amp;b");
  });
});

describe("guide content", () => {
  const valid = `---\ntitle: A title\ndescription: A description\nauthor: A Person\npublished: 2026-11-09\n---\n\n## Heading\n\nBody text here.`;

  it("parses a valid guide and takes the slug from the file name", () => {
    const guide = parseGuide("/src/content/guides/my-guide.md", valid);
    expect(guide?.slug).toBe("my-guide");
    expect(guide?.updated).toBe("2026-11-09");
    expect(guide?.blocks[0]).toEqual({ type: "h2", text: "Heading" });
  });

  it("never publishes drafts or underscore files", () => {
    expect(parseGuide("/x/_template.md", valid)).toBeNull();
    expect(parseGuide("/x/post.md", valid.replace("---\n\n", "draft: true\n---\n\n"))).toBeNull();
  });

  it("refuses a published guide with missing details", () => {
    expect(() => parseGuide("/x/post.md", "---\ntitle: Only a title\n---\nBody")).toThrow(/needs/);
  });

  it("does not publish the template", () => {
    expect(GUIDES.some((guide) => guide.slug.startsWith("_"))).toBe(false);
  });

  it("does not publish articles too short to count as real content", () => {
    for (const guide of GUIDES) expect(guide.wordCount).toBeGreaterThanOrEqual(600);
  });
});

describe("markdown subset", () => {
  it("parses inline formatting", () => {
    expect(parseInline("a **b** *c* [d](https://e.com) f")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "c" },
      { type: "text", text: " " },
      { type: "link", text: "d", href: "https://e.com" },
      { type: "text", text: " f" },
    ]);
  });

  it("drops unsafe link targets and keeps the text", () => {
    expect(parseInline("[x](javascript:alert(1))")[0]).toEqual({ type: "text", text: "x" });
    expect(parseInline("[x](//evil.com)")[0]).toEqual({ type: "text", text: "x" });
    expect(parseInline("[x](/help)")[0]).toEqual({ type: "link", text: "x", href: "/help" });
  });

  it("parses block types", () => {
    const blocks = parseMarkdown("### H\n\n- a\n- b\n\n1. c\n2. d\n\n> q\n\nplain\nwrapped");
    expect(blocks.map((block) => block.type)).toEqual(["h3", "ul", "ol", "quote", "p"]);
    expect(blocks[4]).toEqual({ type: "p", inline: [{ type: "text", text: "plain wrapped" }] });
  });

  it("treats HTML as literal text", () => {
    expect(parseMarkdown("<script>alert(1)</script>")[0]).toEqual({
      type: "p",
      inline: [{ type: "text", text: "<script>alert(1)</script>" }],
    });
  });

  it("reads frontmatter and handles files without it", () => {
    expect(parseFrontmatter('---\ntitle: "T: x"\n---\nBody').fields["title"]).toBe("T: x");
    expect(parseFrontmatter("No frontmatter").body).toBe("No frontmatter");
  });
});
