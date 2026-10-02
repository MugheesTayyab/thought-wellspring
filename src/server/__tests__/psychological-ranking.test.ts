import { describe, it, expect } from "vitest";
import {
  calculatePsychologicalIntrigueScore,
  sortPostsByPsychologicalIntrigue,
} from "../../shared/lib/psychological-ranking";
import type { Unsaid } from "../../shared/types/unsaid";

describe("Psychological Intrigue & Voyeurism Ranking Engine", () => {
  const genericPost: Unsaid = {
    id: "g-1",
    text: "Today I drank green tea and worked on my laptop.",
    category: "Vibe Check",
    preset: "golden-hour",
    handle: null,
    createdAt: Date.now() - 3600000,
    reactions: { heart: 1, sad: 0, fire: 0, hug: 0 },
    echoes: [],
    status: "published",
    deviceToken: "dev-1",
  };

  const privacyInvadePost: Unsaid = {
    id: "pi-1",
    text: "I accidentally saw his unlocked phone on the table. He has deleted messages from his ex from last night. He has no idea I know.",
    category: "Spill The Tea",
    preset: "midnight-static",
    handle: null,
    createdAt: Date.now() - 7200000,
    reactions: { heart: 45, sad: 12, fire: 68, hug: 18 },
    echoes: [
      {
        id: "e-1",
        text: "Girl run",
        createdAt: Date.now(),
        handle: null,
        profileId: null,
        deviceToken: "d",
      },
    ],
    status: "published",
    deviceToken: "dev-2",
  };

  const familySecretPost: Unsaid = {
    id: "fs-1",
    text: "I overheard my aunt telling my mom the real reason the wedding got canceled. Nobody in our family knows I was standing behind the door.",
    category: "Silent Thoughts",
    preset: "3am",
    handle: "@secret_keeper",
    createdAt: Date.now() - 5400000,
    reactions: { heart: 32, sad: 4, fire: 50, hug: 22 },
    echoes: [],
    status: "published",
    deviceToken: "dev-3",
  };

  it("calculates a high intrigue score for privacy invading & eavesdropping confessions", () => {
    const genericScore = calculatePsychologicalIntrigueScore(genericPost);
    const privacyScore = calculatePsychologicalIntrigueScore(privacyInvadePost);
    const familyScore = calculatePsychologicalIntrigueScore(familySecretPost);

    expect(privacyScore).toBeGreaterThan(genericScore);
    expect(familyScore).toBeGreaterThan(genericScore);
    expect(privacyScore).toBeGreaterThan(80);
  });

  it("ranks the most psychologically captivating privacy confession to the top of feed", () => {
    const feed = [genericPost, privacyInvadePost, familySecretPost];
    const sorted = sortPostsByPsychologicalIntrigue(feed);

    expect(["pi-1", "fs-1"]).toContain(sorted[0]!.id);
    expect(sorted[sorted.length - 1]!.id).toBe("g-1");
  });
});
