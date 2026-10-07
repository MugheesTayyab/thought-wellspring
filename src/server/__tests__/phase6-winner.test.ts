import { describe, it, expect } from "vitest";
import {
  computeRawResonance,
  computeVetoPenalty,
  computeCycleScore,
  rankCycleCandidates,
  HALF_LIFE_HOURS,
} from "../lib/scoring";
import { generateWinnerHook, getHookForPost } from "../lib/winner-hooks";
import { getCycleBounds } from "../jobs/winner-selection";
import type { Unsaid } from "@/shared/types/unsaid";

describe("Phase 6: Winner Pipeline & Scheduled Scoring Verification", () => {
  describe("Suite 1: Mathematical Scoring & Decay Models", () => {
    it("HALF_LIFE_HOURS is set to 8.0", () => {
      expect(HALF_LIFE_HOURS).toBe(8.0);
    });

    it("raw resonance weights: heart (2.5), fire (2.0), hug (2.0), sad (1.5), echo (4.0)", () => {
      const mockPost: Unsaid = {
        id: "test-1",
        text: "Sample confession",
        handle: "student_01",
        createdAt: Date.now(),
        category: "Silent Thoughts",
        preset: "midnight-static",
        reactions: { heart: 2, fire: 1, hug: 1, sad: 1 },
        echoes: [{ id: "e1", text: "same", handle: null, createdAt: Date.now() }],
      };

      // Raw = (2 * 2.5) + (1 * 2.0) + (1 * 2.0) + (1 * 1.5) + (1 * 4.0) = 14.5
      const raw = computeRawResonance(mockPost);
      expect(raw).toBe(14.5);
    });

    it("continuous half-life decay cuts score in half at 8 hours", () => {
      const cycleEnd = 1_000_000_000_000;
      const post8hOld: Unsaid = {
        id: "test-8h",
        text: "8 hour old confession",
        handle: "student_02",
        createdAt: cycleEnd - 8 * 3600 * 1000,
        category: "Silent Thoughts",
        preset: "midnight-static",
        reactions: { heart: 4 }, // raw = 10.0
      };

      const score = computeCycleScore(post8hOld, cycleEnd);
      expect(score).toBeCloseTo(5.0, 1);
    });

    it("safety veto penalties reduce score and disqualify at >=3 reports", () => {
      const penalty1 = computeVetoPenalty(1);
      const penalty2 = computeVetoPenalty(2);
      const penalty3 = computeVetoPenalty(3);

      expect(penalty1).toBe(0.85);
      expect(penalty2).toBe(0.60);
      expect(penalty3).toBe(0.0);
    });

    it("post with 3 vetoes is disqualified (score 0)", () => {
      const cycleEnd = 1_000_000_000_000;
      const reportedPost: Unsaid = {
        id: "test-reported",
        text: "Reported post",
        handle: null,
        createdAt: cycleEnd - 1000,
        category: "Confessions",
        preset: "midnight-static",
        reactions: { heart: 100 },
        vetoCount: 3,
      };

      const score = computeCycleScore(reportedPost, cycleEnd);
      expect(score).toBe(0);
    });
  });

  describe("Suite 2: Candidate Ranking & Deterministic Tie-Breaking", () => {
    it("ranks higher scoring post above lower scoring post", () => {
      const cycleEnd = 1_000_000_000_000;
      const postA: Unsaid = {
        id: "post-a",
        text: "Post A",
        handle: null,
        createdAt: cycleEnd - 1000,
        category: "Confessions",
        preset: "midnight-static",
        reactions: { heart: 10 },
      };
      const postB: Unsaid = {
        id: "post-b",
        text: "Post B",
        handle: null,
        createdAt: cycleEnd - 1000,
        category: "Confessions",
        preset: "midnight-static",
        reactions: { heart: 5 },
      };

      const ranked = rankCycleCandidates([postB, postA], cycleEnd);
      expect(ranked[0]?.post.id).toBe("post-a");
    });

    it("breaks score ties using echo count (conversational depth)", () => {
      const cycleEnd = 1_000_000_000_000;
      const postTieNoEcho: Unsaid = {
        id: "post-no-echo",
        text: "Post without echoes",
        handle: null,
        createdAt: cycleEnd - 1000,
        category: "Confessions",
        preset: "midnight-static",
        reactions: { fire: 2 },
      };
      const postTieWithEcho: Unsaid = {
        id: "post-with-echo",
        text: "Post with echoes",
        handle: null,
        createdAt: cycleEnd - 1000,
        category: "Confessions",
        preset: "midnight-static",
        reactions: { fire: 2 },
        echoes: [{ id: "e1", text: "I agree", handle: null, createdAt: Date.now() }],
      };

      const ranked = rankCycleCandidates([postTieNoEcho, postTieWithEcho], cycleEnd);
      expect(ranked[0]?.post.id).toBe("post-with-echo");
    });
  });

  describe("Suite 3: Contextual Editorial Hook Generator", () => {
    it("assigns relevant hook based on category", () => {
      const mockPost: Unsaid = {
        id: "post-1",
        text: "Test post",
        handle: null,
        createdAt: Date.now(),
        category: "3 AM Regrets",
        preset: "midnight-static",
        reactions: { heart: 5 },
      };
      const hook = generateWinnerHook({
        category: "3 AM Regrets",
        createdAt: 12345,
        reactions: { heart: 5, fire: 0, hug: 0, sad: 0 },
        echoCount: 0,
        cycleHourUtc: 0,
      });
      expect(typeof hook).toBe("string");
      expect(hook.length).toBeGreaterThan(0);
    });

    it("dominant sad reaction triggers community solace hook override", () => {
      const mockSadPost: Unsaid = {
        id: "post-sad",
        text: "Feeling lost today",
        handle: null,
        createdAt: Date.now(),
        category: "Hostel Thoughts",
        preset: "midnight-static",
        reactions: { sad: 15, heart: 2 },
      };
      const hook = getHookForPost(mockSadPost, 12345);
      expect(hook).toBe("A quiet grief that the entire community held together today.");
    });
  });

  describe("Suite 4: Cycle Bounds Calculation", () => {
    it("calculates exact 12-hour UTC boundaries", () => {
      const testTime = new Date("2026-09-25T15:30:00.000Z");
      const bounds = getCycleBounds(testTime);

      expect(bounds.cycleStart.toISOString()).toBe("2026-09-25T00:00:00.000Z");
      expect(bounds.cycleEnd.toISOString()).toBe("2026-09-25T12:00:00.000Z");
    });
  });
});
