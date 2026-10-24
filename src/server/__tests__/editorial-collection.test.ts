import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error - standalone CLI script without declaration file
import { parseCSV } from "../../../scripts/validate-editorial-csv.mjs";
import { mapRowToUnsaid } from "../db/unsaids";
import { CATEGORIES } from "../../shared/constants/categories";

describe("Phase A: Editorial Launch Collection Specification", () => {
  const csvContent = readFileSync("BAJIHEARS_FINAL_30_SEED_POSTS.csv", "utf8");
  const [headers, ...rows] = parseCSV(csvContent);

  it("contains exactly 30 unique seed records from BAJIHEARS_FINAL_30_SEED_POSTS.csv", () => {
    expect(rows.length).toBe(30);
  });

  it("validates immutable seed_id sequence from BH-001 through BH-030", () => {
    const seedIndex = headers.findIndex((h: string) => h.trim() === "seed_id");
    expect(seedIndex).toBeGreaterThanOrEqual(0);

    const seedIds = rows.map((r: string[]) => r[seedIndex]);
    const uniqueIds = new Set(seedIds);
    expect(uniqueIds.size).toBe(30);

    rows.forEach((r: string[], idx: number) => {
      const expected = `BH-${String(idx + 1).padStart(3, "0")}`;
      expect(r[seedIndex]).toBe(expected);
    });
  });

  it("validates contiguous display_order sequence from 1 through 30", () => {
    const orderIndex = headers.findIndex((h: string) => h.trim() === "display_order");
    expect(orderIndex).toBeGreaterThanOrEqual(0);

    const orders = rows.map((r: string[]) => parseInt(r[orderIndex]!, 10));
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(30);

    orders.forEach((ord: number, idx: number) => {
      expect(ord).toBe(idx + 1);
    });
  });

  it("enforces strict 280-character limit and non-blank content across all 30 posts", () => {
    const contentIndex = headers.findIndex((h: string) => h.trim() === "content");
    expect(contentIndex).toBeGreaterThanOrEqual(0);

    rows.forEach((r: string[], idx: number) => {
      const text = r[contentIndex]!;
      expect(text.trim().length).toBeGreaterThanOrEqual(3);
      expect(text.length).toBeLessThanOrEqual(280);
      expect(text.length).toBeGreaterThan(150); // Quality validation: rich narrative length
    });
  });

  it("enforces valid five categories with balanced distribution", () => {
    const catIndex = headers.findIndex((h: string) => h.trim() === "category");
    expect(catIndex).toBeGreaterThanOrEqual(0);

    const counts: Record<string, number> = {};
    for (const c of CATEGORIES) counts[c] = 0;

    rows.forEach((r: string[]) => {
      const cat = r[catIndex]!;
      expect(CATEGORIES).toContain(cat);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Verify all 5 categories have multiple representations
    for (const c of CATEGORIES) {
      expect(counts[c]).toBeGreaterThanOrEqual(5);
    }
  });

  it("ensures review_status is 'Pending Editorial Approval' and label is 'BajiHears Original / Fictional Scenario'", () => {
    const statusIndex = headers.findIndex((h: string) => h.trim() === "review_status");
    const labelIndex = headers.findIndex((h: string) => h.trim() === "editorial_label");

    rows.forEach((r: string[]) => {
      expect(r[statusIndex]).toBe("Pending Editorial Approval");
      expect(r[labelIndex]).toBe("BajiHears Original / Fictional Scenario");
    });
  });

  it("maps database rows into Unsaid models with explicit editorial provenance", () => {
    const mockEditorialRow = {
      id: "33333333-3333-4333-8333-333333333333",
      text: "I told my family I had an early lecture so I could escape the mehndi.",
      handle: null,
      category: "Spill The Tea",
      preset: "midnight-static",
      reactions: { heart: 0, sad: 0, fire: 0, hug: 0 },
      veto_count: 0,
      created_at: new Date().toISOString(),
      pinned_until: null,
      status: "published",
      source_type: "editorial",
      editorial_seed_id: "BH-001",
      editorial_label: "BajiHears Original / Fictional Scenario",
      display_order: 1,
      editorial_metadata: {
        language: "Roman Urdu",
        country_context: "Pakistan",
        quality_score: 92,
      },
    };

    const unsaid = mapRowToUnsaid(mockEditorialRow);
    expect(unsaid.sourceType).toBe("editorial");
    expect(unsaid.editorialSeedId).toBe("BH-001");
    expect(unsaid.displayOrder).toBe(1);
    expect(unsaid.editorialLabel).toBe("BajiHears Original / Fictional Scenario");
    expect(unsaid.editorialMetadata?.["quality_score"]).toBe(92);
    expect(unsaid.handle).toBe(null);
  });

  it("defaults unsaid model to 'community' for organic submissions", () => {
    const mockCommunityRow = {
      id: "44444444-4444-4444-8444-444444444444",
      text: "Genuine confession from community member",
      handle: "star_gazer",
      category: "Silent Thoughts",
      preset: "midnight-static",
      reactions: { heart: 5, sad: 0, fire: 1, hug: 2 },
      veto_count: 0,
      created_at: new Date().toISOString(),
      pinned_until: null,
      status: "published",
    };

    const unsaid = mapRowToUnsaid(mockCommunityRow);
    expect(unsaid.sourceType).toBe("community");
    expect(unsaid.editorialSeedId).toBe(null);
    expect(unsaid.displayOrder).toBe(null);
  });
});
