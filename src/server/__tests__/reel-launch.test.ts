import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseAdminClient } from "../db/client";
import { fetchReelReadyPosts } from "../db/moderation";
import { handleSubmitPost } from "../handlers/wall";
import { handleFetchReelReadyPosts, handleRevokeReelConsent } from "../handlers/admin-moderation";
import { renderSitemap, sitemapEntries } from "../lib/sitemap";
import { CARD_FORMATS, fitQuote, wrapLines } from "@/shared/lib/quote-card";
import {
  isUnfinishedStarter,
  REEL_PROMPTS,
  reelPromptByKey,
} from "@/shared/constants/reel-prompts";

vi.mock("../db/client", () => ({
  getSupabaseAdminClient: vi.fn(),
  getSupabaseAnonClient: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getSupabaseAdminClient).mockReset();
});

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reel consent on a new post", () => {
  const submit = async (extra: { reelConsent?: boolean }) => {
    const rpc = vi.fn().mockImplementation(async (name: string) =>
      name === "record_and_check_rate_limit"
        ? { data: { allowed: true, remaining: 2 }, error: null }
        : {
            data: {
              id: "33333333-3333-4333-8333-333333333333",
              created_at: new Date().toISOString(),
              status: "published",
            },
            error: null,
          },
    );
    vi.mocked(getSupabaseAdminClient).mockReturnValue({ rpc } as never);
    const result = await handleSubmitPost({
      text: "A quiet afternoon in the garden.",
      category: "Silent Thoughts",
      deviceToken: "1234567890abcdef",
      ...extra,
    });
    expect(result.ok).toBe(true);
    return rpc.mock.calls.find((call) => call[0] === "insert_post_atomic")?.[1];
  };

  it("is not recorded unless the writer ticks the box", async () => {
    expect(await submit({})).not.toHaveProperty("p_reel_consent");
    expect(await submit({ reelConsent: false })).not.toHaveProperty("p_reel_consent");
  });

  it("is recorded when the writer ticks the box", async () => {
    expect((await submit({ reelConsent: true })).p_reel_consent).toBe(true);
  });

  it("defaults to off in the composer and is never kept in a draft", () => {
    const composer = source("src/client/components/bajihears/WritingBox.tsx");
    expect(composer).toContain("useState(false);");
    const draftType = composer.slice(composer.indexOf("type Draft"), composer.indexOf("type Props"));
    expect(draftType).not.toContain("reelConsent");
  });
});

describe("the owner's reel list", () => {
  const chain = (rows: unknown[]) => {
    const calls: unknown[][] = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder["limit"] = async () => ({ data: rows, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: () => builder,
    } as never);
    return calls;
  };

  it("only asks for opted-in, live, unreported reader posts, and never for a handle", async () => {
    const calls = chain([]);
    await fetchReelReadyPosts(undefined);
    expect(calls).toContainEqual(["eq", "reel_consent", true]);
    expect(calls).toContainEqual(["eq", "status", "published"]);
    expect(calls).toContainEqual(["eq", "source_type", "community"]);
    expect(calls).toContainEqual(["eq", "veto_count", 0]);
    const select = calls.find((call) => call[0] === "select")?.[1] as string;
    expect(select).not.toMatch(/handle|profile_id|device_token/);
  });

  it("adds up reactions and carries no identifying fields", async () => {
    chain([
      {
        id: "a",
        text: "Hello",
        category: "Hard Truth",
        preset: "midnight-static",
        reactions: { heart: 2, sad: 1, fire: 0, hug: 4 },
        created_at: "2026-11-09T00:00:00Z",
        handle: "@should_not_pass_through",
      },
    ]);
    const { data } = await fetchReelReadyPosts(undefined);
    expect(data[0]?.reactionCount).toBe(7);
    expect(data[0]).not.toHaveProperty("handle");
  });

  it("is closed to anyone who isn't a moderator", async () => {
    const list = await handleFetchReelReadyPosts();
    const revoke = await handleRevokeReelConsent({
      postId: "33333333-3333-4333-8333-333333333333",
    });
    expect(list.ok).toBe(false);
    expect(revoke.ok).toBe(false);
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

describe("quote card layout", () => {
  // Roughly how wide a serif font sets text.
  const measureAt = (value: string, size: number) => value.length * size * 0.55;

  it("wraps on spaces and collapses line breaks", () => {
    const lines = wrapLines("one two\n\nthree", 7, (value) => value.length);
    expect(lines).toEqual(["one two", "three"]);
  });

  it("breaks a word too long for the card instead of letting it overflow", () => {
    const lines = wrapLines("a".repeat(25), 10, (value) => value.length);
    expect(lines.every((line) => line.length <= 10)).toBe(true);
    expect(lines.join("")).toBe("a".repeat(25));
  });

  it("doesn't split an emoji in half when breaking a word", () => {
    const lines = wrapLines("😀".repeat(5), 2, (value) => Array.from(value).length);
    expect(lines.join("")).toBe("😀".repeat(5));
    expect(lines.every((line) => !line.includes("�"))).toBe(true);
  });

  for (const key of ["reel", "post"] as const) {
    const format = CARD_FORMATS[key];

    it(`keeps a full 280-character post inside the ${key} safe area`, () => {
      const fitted = fitQuote("I never told you this. ".repeat(13).slice(0, 280), format, measureAt);
      const bottom = fitted.firstBaseline + (fitted.lines.length - 1) * fitted.lineHeight;
      expect(fitted.firstBaseline).toBeGreaterThanOrEqual(format.quote.top);
      expect(bottom).toBeLessThanOrEqual(format.quote.top + format.quote.height);
      for (const line of fitted.lines) {
        expect(measureAt(line, fitted.fontSize)).toBeLessThanOrEqual(format.quote.width);
      }
    });

    it(`sets a short ${key} post large`, () => {
      expect(fitQuote("I miss you.", format, measureAt).fontSize).toBe(92);
    });
  }

  it("leaves the reel's bottom clear of Instagram's own captions and buttons", () => {
    const { height, brandY } = CARD_FORMATS.reel;
    expect(height).toBe(1920);
    expect(height - brandY).toBeGreaterThanOrEqual(400);
  });
});

describe("reel prompts and landing page", () => {
  it("has unique URL-safe keys, and a blank write link isn't one of them", () => {
    const keys = REEL_PROMPTS.map((prompt) => prompt.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z]+$/);
    expect(reelPromptByKey("blank")).toBeUndefined();
  });

  it("fills the composer only from known keys, never from text in a link", () => {
    expect(reelPromptByKey("ammi")?.starter).toBeTruthy();
    expect(reelPromptByKey("<script>alert(1)</script>")).toBeUndefined();
    expect(reelPromptByKey(null)).toBeUndefined();
  });

  it("won't accept a starter with nothing added", () => {
    const starter = REEL_PROMPTS[0]!.starter;
    expect(isUnfinishedStarter(starter)).toBe(true);
    expect(isUnfinishedStarter(`  ${starter} `)).toBe(true);
    expect(isUnfinishedStarter(`${starter} I was scared.`)).toBe(false);
  });

  it("stays out of search, so it can't count as a thin page", () => {
    expect(source("src/routes/baji.tsx")).toContain('content: "noindex, follow"');
    expect(renderSitemap(sitemapEntries({}))).not.toContain("bajihears.app/baji");
  });
});

describe("what the site says about Instagram", () => {
  it("Terms describe the reel option and how to withdraw", () => {
    const terms = source("src/routes/terms.tsx");
    expect(terms).toContain("Instagram reels, only if you opt in");
    expect(terms).toContain("To withdraw, email");
    expect(terms).toContain("18 or older");
  });

  it("the winner card no longer promises posts on an Instagram account", () => {
    const card = source("src/client/components/bajihears/UnsaidCard.tsx");
    expect(card).not.toContain("@bajihears");
    expect(card).not.toContain("RevealCountdown");
  });
});
