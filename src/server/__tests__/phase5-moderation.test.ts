import { describe, it, expect } from "vitest";
import { normalizeText } from "../lib/moderation/normalize";
import { checkHardFilters } from "../lib/moderation/hard-filters";
import { checkSoftFilters } from "../lib/moderation/soft-filters";

describe("Phase 5: Moderation Engine Verification", () => {
  describe("Suite 1: Text Normalization (Stage 1-4)", () => {
    it("strips zero-width characters", () => {
      const input = "p\u200Bo\u200Br\u200Bn";
      const result = normalizeText(input);
      expect(result.compact).toBe("porn");
    });

    it("translates homoglyphs correctly", () => {
      const input = "cаll mе (Cyrillic a and e)";
      const result = normalizeText(input);
      expect(result.normalized).toContain("call me");
    });

    it("folds repetitive characters to maximum of 2", () => {
      const input = "noooooooo whyyyyyyy";
      const result = normalizeText(input);
      expect(result.normalized).toBe("noo whyy");
    });

    it("creates accurate compact text", () => {
      const input = "s e x y";
      const result = normalizeText(input);
      expect(result.compact).toBe("sexy");
    });
  });

  describe("Suite 2: Hard Filters (Tier 3 Auto-Reject)", () => {
    it("blocks standard Pakistani mobile numbers", () => {
      const input = "Contact me on 03001234567 for details";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      expect(hard.blocked).toBe(true);
      expect(hard.violationType).toBe("PHONE_NUMBER");
    });

    it("blocks spaced and hyphenated mobile numbers", () => {
      const input = "call 0 3 2 1 - 9 8 7 6 5 4 3";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      expect(hard.blocked).toBe(true);
      expect(hard.violationType).toBe("PHONE_NUMBER");
    });

    it("blocks phonetically spelled numbers", () => {
      const input = "zero three zero zero one two three four five six seven";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      expect(hard.blocked).toBe(true);
      expect(hard.violationType).toBe("PHONE_NUMBER");
    });

    it("blocks URLs and invite links", () => {
      const input = "Join our group at https://chat.whatsapp.com/invite123";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      expect(hard.blocked).toBe(true);
      expect(hard.violationType).toBe("URL_LINK");
    });

    it("blocks script tags and XSS injection vectors", () => {
      const input = "<script>alert('xss')</script>";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      expect(hard.blocked).toBe(true);
      expect(hard.violationType).toBe("SCRIPT_INJECTION");
    });
  });

  describe("Suite 3: Soft Filters (Tier 2 Auto-Quarantine)", () => {
    it("flags Roman Urdu abusive terms and quarantines", () => {
      const input = "tum bohot harami ho";
      const norm = normalizeText(input);
      const soft = checkSoftFilters(norm);
      expect(soft.flagged).toBe(true);
      expect(soft.category).toBe("CULTURAL_ABUSE");
    });

    it("flags off-platform social media handles", () => {
      const input = "Add me on snapchat: @karachi_boy99";
      const norm = normalizeText(input);
      const soft = checkSoftFilters(norm);
      expect(soft.flagged).toBe(true);
      expect(soft.category).toBe("SOCIAL_SHILL");
    });

    it("flags low entropy repetitive text", () => {
      const input = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const norm = normalizeText(input);
      const soft = checkSoftFilters(norm);
      expect(soft.flagged).toBe(true);
      expect(soft.category).toBe("LOW_ENTROPY");
    });
  });

  describe("Suite 4: Clean Content (Tier 1 Auto-Approve)", () => {
    it("approves genuine, authentic confessions", () => {
      const input = "I still look for you in crowded places, even when I know you moved to London.";
      const norm = normalizeText(input);
      const hard = checkHardFilters(norm);
      const soft = checkSoftFilters(norm);
      expect(hard.blocked).toBe(false);
      expect(soft.flagged).toBe(false);
    });
  });
});
