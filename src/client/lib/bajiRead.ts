import type { Category, ReactionKey } from "@/shared/types/unsaid";
import type { AnsweredDuelRecord } from "@/shared/types/duel";

export type ArchetypeKey =
  | "overthinker"
  | "softie"
  | "chaos-main"
  | "quiet-storm"
  | "healer"
  | "nostalgic"
  | "truth-teller";

export interface TraitBreakdown {
  empathy: number;   // 0 - 100
  intuition: number; // 0 - 100
  chaos: number;     // 0 - 100
  depth: number;     // 0 - 100
}

export interface ArchetypeDefinition {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  hookLine: string;
  fullParagraph: string;
  howOthersSeeYou: string;
  secretVulnerability: string;
  bonusLine: string;
  color: string;
  emoji: string;
  presetKey: string;
  defaultTraits: TraitBreakdown;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    key: "overthinker",
    name: "The 3AM Overthinker",
    tagline: "Brain louder than the group chat",
    hookLine: "3am, phone brightness on lowest, replaying a 5-second conversation from 2021.",
    fullParagraph:
      "You don't just feel things — you analyze them in 4K resolution with director's commentary. You notice when someone's reply time drops by 3 minutes, you read between lines that aren't even there, and your emotional antenna is tuned to frequencies nobody else can hear. Your Spotify playlists are unmatched because they carry memories you haven't even made yet.",
    howOthersSeeYou:
      "What people secretly think of your personality: People find you mysteriously put-together and observant. They assume you have an icy filter because you don't talk constantly, but secretly they wonder why you never let people all the way in — while your closest friends know you care 10x more than anyone else in the room.",
    secretVulnerability:
      "You drafted an apology four times for something that wasn't your fault, decided sending it was 'too dramatic', and ended up crying in the shower instead.",
    bonusLine:
      "You've deleted paragraphs that would have saved friendships just because you were terrified of looking like you cared too much.",
    color: "#7c3aed",
    emoji: "🌙",
    presetKey: "midnight-static",
    defaultTraits: { empathy: 84, intuition: 96, chaos: 26, depth: 95 },
  },
  {
    key: "softie",
    name: "The Fierce Softie",
    tagline: "Tough exterior, crying at voice notes",
    hookLine: "Acts like a bodyguard for her friends, but secretly needs a forehead kiss and 12 hours of sleep.",
    fullParagraph:
      "You are the ultimate paradox: protective older sister energy on the outside, fragile marshmallow on the inside. You'll publicly fight someone who disrespects your best friend, but you'll silently replay a harsh tone from your family for three consecutive days. You feel other people's pain before they even finish articulating it. That's not a weakness — it's rare gold.",
    howOthersSeeYou:
      "What people secretly think of your personality: Everyone views you as their safe sanctuary. You're the one friend they call when their life falls apart at midnight because you never judge, you never make it about yourself, and your hugs feel like home. But people sometimes take your gentleness for granted because you forgive before they even apologize.",
    secretVulnerability:
      "You spend so much energy being the emotional cushion for everyone else that when your own heart breaks, you don't even know whose shoulder to borrow.",
    bonusLine:
      "You forgive people way faster than they deserve, not because you're foolish, but because holding anger hurts your soft heart more than their betrayal did.",
    color: "#f97316",
    emoji: "🫂",
    presetKey: "golden-hour",
    defaultTraits: { empathy: 98, intuition: 86, chaos: 32, depth: 92 },
  },
  {
    key: "chaos-main",
    name: "The Unfiltered Main Character",
    tagline: "Says what everyone else was whispering",
    hookLine: "It's giving unhinged 3pm impulsive thought and zero regrets fr.",
    fullParagraph:
      "You don't play chess with life; you kick the board over and make everyone laugh while doing it. You have zero patience for fake politeness, you spill the freshest tea with surgical precision, and you make every mundane gathering feel like an HBO drama finale. People talk about being authentic — you literally don't know how to be anything else.",
    howOthersSeeYou:
      "What people secretly think of your personality: Magnetic, hilarious, and slightly intimidating. People admire that you say the quiet part out loud without flinching. When you walk into a room, the energy shifts immediately to your frequency. They secretly envy your confidence, but wonder if you ever let your guard down.",
    secretVulnerability:
      "Your loud sarcasm is your armor. If you turn everything into a joke first, nobody can weaponize the real hurt you keep locked behind your ribs.",
    bonusLine:
      "Your taste in people is clinically chaotic: emotionally unavailable, effortlessly charming, and guaranteed to give you six months of playlist inspiration.",
    color: "#ec4899",
    emoji: "🔥",
    presetKey: "neon-ache",
    defaultTraits: { empathy: 68, intuition: 89, chaos: 96, depth: 76 },
  },
  {
    key: "quiet-storm",
    name: "The Quiet Observer",
    tagline: "Reads the room in 2 seconds, speaks in poetry",
    hookLine: "Noticed the shift in someone's voice before they even finished the greeting.",
    fullParagraph:
      "You are the master of silent observation. You don't need to be the center of attention because you're too busy cataloging everyone's micro-expressions and unsaid intentions. When people talk, you listen to what they're leaving out. You're fiercely selective about your inner circle, and if someone loses your trust, you don't yell — you just evaporate from their life.",
    howOthersSeeYou:
      "What people secretly think of your personality: Deeply enigmatic, calm, and composed. People feel like you see right through their facades (which you do), and your rare compliments carry the weight of a gold medal. They secretly want your approval more than anyone else's.",
    secretVulnerability:
      "You carry heavy things alone because explaining them to people who won't understand feels more exhausting than holding the weight yourself.",
    bonusLine:
      "There are entire essays saved in your notes app about people who honestly believe you barely even think about them.",
    color: "#0284c7",
    emoji: "🌊",
    presetKey: "quiet-storm",
    defaultTraits: { empathy: 80, intuition: 98, chaos: 22, depth: 97 },
  },
  {
    key: "healer",
    name: "The Designated Healer",
    tagline: "World-class therapist, forgets to drink water",
    hookLine: "Can diagnose a stranger's childhood trauma in 3 comments on the internet.",
    fullParagraph:
      "You are the soul-tender. Your echoes on this wall hit people right where they were breaking. You have an uncanny ability to find the exact words that make someone feel less invisible at 2am. You absorb collective grief and transform it into gentle kindness. The world is significantly less cruel simply because you exist in it.",
    howOthersSeeYou:
      "What people secretly think of your personality: The wise older sister or steadfast guardian. People feel an immediate, almost spiritual urge to confess their deepest secrets within 10 minutes of meeting you. But they rarely ask if you need healing too.",
    secretVulnerability:
      "You are chronically burnt out from carrying emotional burdens that don't belong to you, but setting boundaries feels like you're committing a crime.",
    bonusLine:
      "At least three people in your life have said 'I don't know what I'd do without you.' You smiled, nodded, and went home to fight your demons in total silence.",
    color: "#10b981",
    emoji: "💙",
    presetKey: "3am",
    defaultTraits: { empathy: 98, intuition: 92, chaos: 16, depth: 96 },
  },
  {
    key: "nostalgic",
    name: "The Hopeless Nostalgic",
    tagline: "Lives in today, romanticizes 2019",
    hookLine: "Still gets goosebumps hearing that one song from that one rainy evening car ride.",
    fullParagraph:
      "You are a collector of emotional souvenirs. You don't just recall an event; you remember the exact smell of the rain, the golden tint of the sunlight, and the way your chest felt when you heard a specific sentence. You romanticize the past because it has a soundtrack, whereas the present is messy and unedited. A hopelessly poetic soul in a rushed world.",
    howOthersSeeYou:
      "What people secretly think of your personality: Soulful, sentimental, and deeply loyal. In a fast-moving world of situationships and ghosting, people secretly admire how deeply and purely you still feel things, even if they wonder why you keep holding onto chapters that already ended.",
    secretVulnerability:
      "You hold on to people who have already walked away because your heart struggles to accept that a chapter can end while the book is still open.",
    bonusLine:
      "You still keep screenshots and voice memos from years ago. Not because you want them back, but because deleting them feels like erasing a version of yourself.",
    color: "#6366f1",
    emoji: "📼",
    presetKey: "midnight-static",
    defaultTraits: { empathy: 90, intuition: 84, chaos: 28, depth: 94 },
  },
  {
    key: "truth-teller",
    name: "The Reality Anchor",
    tagline: "Allergic to drama, fiercely genuine",
    hookLine: "Will hold your hand while telling you that you are entirely the problem.",
    fullParagraph:
      "You have an allergy to fake sweet-talk and performative tears. If a friend asks for your opinion, they brace themselves because they know they're getting raw, unvarnished truth wrapped in genuine care. You're grounded, razor-sharp, and refuse to let anyone you love live in a comfortable delusion. You don't play mind games and you cut through manipulation like butter.",
    howOthersSeeYou:
      "What people secretly think of your personality: Invaluable, respected, and trustworthy. People know that if you praise them, it is 100% earned and real. You are the rock everyone leans on, but they mistakenly assume your armor is impenetrable.",
    secretVulnerability:
      "People mistake your honesty for invulnerability. Nobody asks if you're okay because they assume your armor is permanent.",
    bonusLine:
      "You learned to be tough early because the first time you were completely vulnerable, someone used it as a blueprint to hurt you.",
    color: "#d97706",
    emoji: "⚖️",
    presetKey: "quiet-storm",
    defaultTraits: { empathy: 74, intuition: 95, chaos: 40, depth: 90 },
  },
];

export const ARCHETYPE_PRESET: Record<ArchetypeKey, string> = {
  overthinker: "midnight-static",
  softie: "golden-hour",
  "chaos-main": "neon-ache",
  "quiet-storm": "quiet-storm",
  healer: "3am",
  nostalgic: "midnight-static",
  "truth-teller": "quiet-storm",
};

export const BAJI_READ_COST = 30;

export function getArchetype(key: ArchetypeKey): ArchetypeDefinition {
  return ARCHETYPES.find((a) => a.key === key) ?? ARCHETYPES[0]!;
}

export type BajiReadResult =
  | {
      unlocked: false;
      totalActions: number;
      actionsNeeded: number;
    }
  | {
      unlocked: true;
      archetype: ArchetypeKey;
      matchAccuracy: number; // e.g. 96 (%)
      traits: TraitBreakdown;
      vibeSignature: string;
      evidenceSummary: string;
      computedAt: number;
    };

export interface BajiReadState {
  computedAt: number;
  result: BajiReadResult;
  bonusUnlocked?: boolean;
}

export const BAJI_READ_KEY = "bh:bajRead";
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function computeBajiRead(
  myReactions: Record<string, ReactionKey[]>,
  myEchoes: string[],
  answeredDuels: AnsweredDuelRecord,
  myPostCategories: Category[],
  totalWarmth: number,
  handle: string | null,
  postsCatalog?: Array<{ id: string; text: string; category: Category }>,
): BajiReadResult {
  const reactionCount = Object.keys(myReactions).length;
  const echoCount = myEchoes.length;
  const duelCount = Object.keys(answeredDuels).length;
  const totalActions = reactionCount + echoCount + duelCount;

  // Unlock condition: 5 total actions OR 3 duels + 1 reaction
  const isUnlocked = totalActions >= 5 || (duelCount >= 3 && reactionCount >= 1);

  if (!isUnlocked) {
    return {
      unlocked: false,
      totalActions,
      actionsNeeded: Math.max(1, 5 - totalActions),
    };
  }

  // Count reaction distribution
  const allReactions = Object.values(myReactions).flat();
  const reactionCounts: Record<ReactionKey, number> = {
    heart: 0,
    sad: 0,
    fire: 0,
    hug: 0,
  };
  allReactions.forEach((r) => {
    if (reactionCounts[r] !== undefined) reactionCounts[r]++;
  });

  const totalRx = Math.max(1, allReactions.length);
  const heartRatio = reactionCounts.heart / totalRx;
  const sadRatio = reactionCounts.sad / totalRx;
  const fireRatio = reactionCounts.fire / totalRx;
  const hugRatio = reactionCounts.hug / totalRx;

  // Multi-dimensional scores for archetypes
  const scores: Record<ArchetypeKey, number> = {
    overthinker: 0,
    softie: 0,
    "chaos-main": 0,
    "quiet-storm": 0,
    healer: 0,
    nostalgic: 0,
    "truth-teller": 0,
  };

  const detectedThemes = new Set<string>();

  // Deep Telemetry Inspection: Inspect the actual posts reacted to
  if (postsCatalog && postsCatalog.length > 0) {
    Object.entries(myReactions).forEach(([postId, rxKeys]) => {
      const post = postsCatalog.find((p) => p.id === postId);
      if (!post) return;

      const lowerText = post.text.toLowerCase();
      const cat = post.category;

      // Category Weighting
      if (cat === "Silent Thoughts") {
        scores.overthinker += 0.45;
        scores["quiet-storm"] += 0.35;
        detectedThemes.add("Silent Thoughts");
      } else if (cat === "Spill The Tea") {
        scores.softie += 0.3;
        scores.nostalgic += 0.3;
        detectedThemes.add("Friendship Tea");
      } else if (cat === "Hard Truth") {
        scores["truth-teller"] += 0.5;
        scores["quiet-storm"] += 0.25;
        detectedThemes.add("Hard Truths");
      } else if (cat === "Plot Twist") {
        scores["chaos-main"] += 0.5;
        detectedThemes.add("Spicy Plot Twists");
      } else if (cat === "Vibe Check") {
        scores.nostalgic += 0.35;
        scores.overthinker += 0.2;
        detectedThemes.add("Vibe Checks");
      }

      // Keyword Semantics
      if (
        lowerText.includes("3am") ||
        lowerText.includes("2am") ||
        lowerText.includes("night") ||
        lowerText.includes("text") ||
        lowerText.includes("reply") ||
        lowerText.includes("overthink")
      ) {
        scores.overthinker += 0.35;
        detectedThemes.add("Late-Night Introspection");
      }
      if (
        lowerText.includes("cry") ||
        lowerText.includes("mom") ||
        lowerText.includes("scared") ||
        lowerText.includes("forgive") ||
        lowerText.includes("alone") ||
        lowerText.includes("heal")
      ) {
        scores.softie += 0.4;
        scores.healer += 0.4;
        detectedThemes.add("Emotional Healing");
      }
      if (
        lowerText.includes("screenshots") ||
        lowerText.includes("best friend") ||
        lowerText.includes("years") ||
        lowerText.includes("past") ||
        lowerText.includes("song") ||
        lowerText.includes("remember")
      ) {
        scores.nostalgic += 0.45;
        detectedThemes.add("Nostalgic Memories");
      }
      if (
        lowerText.includes("fake") ||
        lowerText.includes("truth") ||
        lowerText.includes("delusion") ||
        lowerText.includes("boundaries") ||
        lowerText.includes("drama")
      ) {
        scores["truth-teller"] += 0.4;
        scores["chaos-main"] += 0.3;
      }

      // Specific Reaction Nuance
      if (rxKeys.includes("hug")) {
        scores.softie += 0.25;
        scores.healer += 0.3;
      }
      if (rxKeys.includes("fire")) {
        scores["chaos-main"] += 0.35;
      }
      if (rxKeys.includes("sad")) {
        scores.overthinker += 0.25;
      }
    });
  }

  // Answered Duels Telemetry
  Object.entries(answeredDuels).forEach(([duelId, choice]) => {
    if (duelId === "d1") {
      if (choice === "A") scores.nostalgic += 0.4;
      if (choice === "B") scores.overthinker += 0.4;
    } else if (duelId === "d2") {
      if (choice === "A") scores.nostalgic += 0.35;
      if (choice === "B") {
        scores.healer += 0.35;
        scores["truth-teller"] += 0.25;
      }
    } else if (duelId === "d3") {
      if (choice === "A") scores.overthinker += 0.4;
      if (choice === "B") scores.nostalgic += 0.35;
    } else if (duelId === "d4") {
      if (choice === "A") scores["truth-teller"] += 0.35;
      if (choice === "B") scores.softie += 0.35;
    }
  });

  // Echo Volume
  if (echoCount > 0) {
    scores.healer += Math.min(1.2, echoCount * 0.4);
    scores.softie += Math.min(0.6, echoCount * 0.2);
  }

  // Baseline Fallbacks if sparse telemetry
  scores.overthinker += sadRatio * 0.5 + (totalActions >= 8 ? 0.2 : 0.05);
  scores.softie += hugRatio * 0.5 + heartRatio * 0.2 + (totalWarmth >= 50 ? 0.15 : 0);
  scores["chaos-main"] += fireRatio * 0.6 + (duelCount >= 3 ? 0.2 : 0);
  scores["quiet-storm"] += (handle ? 0.1 : 0.35) + heartRatio * 0.35;
  scores.healer += (echoCount >= 2 ? 0.5 : 0) + hugRatio * 0.35;
  scores.nostalgic += heartRatio * 0.3 + sadRatio * 0.3;
  scores["truth-teller"] += fireRatio * 0.3 + (duelCount >= 3 ? 0.3 : 0);

  // Find Winner Archetype
  let winningKey: ArchetypeKey = "overthinker";
  let maxScore = -1;

  (Object.keys(scores) as ArchetypeKey[]).forEach((key) => {
    if (scores[key] > maxScore) {
      maxScore = scores[key];
      winningKey = key;
    }
  });

  const chosen = getArchetype(winningKey);

  // Dynamic Trait Breakdown
  const traits: TraitBreakdown = {
    empathy: Math.min(
      99,
      Math.max(
        48,
        Math.round(chosen.defaultTraits.empathy * 0.65 + (hugRatio + heartRatio) * 30 + echoCount * 4),
      ),
    ),
    intuition: Math.min(
      99,
      Math.max(
        52,
        Math.round(chosen.defaultTraits.intuition * 0.7 + sadRatio * 25 + (duelCount >= 2 ? 6 : 0)),
      ),
    ),
    chaos: Math.min(
      99,
      Math.max(
        18,
        Math.round(chosen.defaultTraits.chaos * 0.6 + fireRatio * 45 + duelCount * 4),
      ),
    ),
    depth: Math.min(
      99,
      Math.max(
        55,
        Math.round(chosen.defaultTraits.depth * 0.65 + totalActions * 2 + heartRatio * 20),
      ),
    ),
  };

  // High Match Accuracy calculation: 92% to 98%
  const matchAccuracy = Math.min(98, 92 + Math.min(6, Math.floor(totalActions / 2)));

  // Generate Vibe Signature
  const vibeSignatures: Record<ArchetypeKey, string> = {
    overthinker: "96% Intuition • 3 AM Screen Time • Covertly Cares 10x",
    softie: "98% Empathy • Safe Sanctuary • Forgives Too Easily",
    "chaos-main": "Unfiltered Honesty • Allergic to Fake Politeness • Chaotic Good",
    "quiet-storm": "Observant Radar • High Intuition • Silent Boundaries",
    healer: "Soulful Listener • World-Class Therapist • Emotional Anchor",
    nostalgic: "Romanticizes the Past • Handwritten Soul • Memory Vault",
    "truth-teller": "Raw Honesty • Delusion-Proof • Grounded Realist",
  };

  const themesArray = Array.from(detectedThemes);
  const evidenceSummary =
    themesArray.length > 0
      ? `Derived from your secret likes on ${themesArray.slice(0, 3).join(", ")}, your Dilemma Arena choices, and your reaction empathy distribution.`
      : `Derived from your ${reactionCount} wall reactions, your Dilemma Arena votes, and your interaction frequency.`;

  return {
    unlocked: true,
    archetype: winningKey,
    matchAccuracy,
    traits,
    vibeSignature: vibeSignatures[winningKey],
    evidenceSummary,
    computedAt: Date.now(),
  };
}

// Storage helpers
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage quota/sandbox errors */
  }
}

export function readBajiReadCache(): BajiReadState | null {
  return safeRead<BajiReadState | null>(BAJI_READ_KEY, null);
}

export function writeBajiReadCache(state: BajiReadState): void {
  safeWrite(BAJI_READ_KEY, state);
}

export function clearBajiReadCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BAJI_READ_KEY);
  } catch {
    /* ignore */
  }
}
