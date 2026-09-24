import type { Category, ReactionKey } from "@/shared/types/unsaid";
import type { AnsweredDuelRecord } from "@/shared/types/duel";

export type ArchetypeKey =
  "overthinker" | "softie" | "chaos-main" | "quiet-storm" | "healer" | "nostalgic";

export interface ArchetypeDefinition {
  key: ArchetypeKey;
  name: string;
  hookLine: string;
  fullParagraph: string;
  bonusLine: string;
  color: string;
  emoji: string;
  presetKey: string;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    key: "overthinker",
    name: "The Overthinker",
    hookLine: "3am, phone brightness on max, brain louder than the group chat.",
    fullParagraph:
      "You're the one replaying a five-second conversation from 2019. It's not that deep, except it's always that deep. You feel things in slow motion and they echo for weeks. Certified overthinker era — and honestly, your playlists are unmatched.",
    bonusLine:
      "You've probably drafted an apology for something that wasn't even your fault. Multiple drafts. Multiple edits. Never sent.",
    color: "#5b16d6",
    emoji: "🌙",
    presetKey: "midnight-static",
  },
  {
    key: "softie",
    name: "The Softie",
    hookLine: "You read something sad and immediately go 'sending hugs fr.'",
    fullParagraph:
      "You're the friend everyone texts first when something's wrong. Your whole vibe is comfort and steady presence. You feel other people's things almost more than your own. That's not a weakness — it's a superpower that most people spend their whole lives trying to find. Protect this energy.",
    bonusLine:
      "You check in on people during the hardest parts of their life and then disappear before they can thank you. That's not people-pleasing. That's just love.",
    color: "#ff9a2b",
    emoji: "🫂",
    presetKey: "golden-hour",
  },
  {
    key: "chaos-main",
    name: "The Chaos Main Character",
    hookLine: "It's giving unhinged 3pm thought and we are so here for it.",
    fullParagraph:
      "You don't overthink, you just post. Bold, a little chaotic, extremely quotable. Everyone else is playing it safe while you're already three plot twists ahead. Main character behavior, honestly. The group chat exists because of you.",
    bonusLine:
      "You have a type. It's: chaotic, funny, slightly unavailable, and absolutely terrible for you. And you know this. And you don't care.",
    color: "#ff2e88",
    emoji: "🔥",
    presetKey: "neon-ache",
  },
  {
    key: "quiet-storm",
    name: "The Quiet Storm",
    hookLine: "Says little, feels everything, gives nothing away.",
    fullParagraph:
      "You're not shy, you're just selective about who gets the real you. You read everything, react to things that actually hit, and then close the app and carry the feeling alone. Deep waters, calm surface. That's the whole aesthetic.",
    bonusLine:
      "You've sat with something heavy for weeks just to figure out the exact right words — and then never said them. The unsaid ones are always the loudest.",
    color: "#243b4a",
    emoji: "🌊",
    presetKey: "quiet-storm",
  },
  {
    key: "healer",
    name: "The Healer",
    hookLine: "Shows up in the comments before anyone even asks.",
    fullParagraph:
      "You give better advice than most therapists and you don't even charge. You're chronically checking on everyone else first. Your echoes hit different because people can tell they come from a real place. You are the reason anonymous strangers feel less alone at 2am.",
    bonusLine:
      "At least one person on your contact list has said 'I don't know what I'd do without you.' You smiled. Then you went home and dealt with your own stuff alone.",
    color: "#25424f",
    emoji: "💙",
    presetKey: "3am",
  },
  {
    key: "nostalgic",
    name: "The Nostalgic One",
    hookLine: "Still thinks about that one group chat that died in 2022.",
    fullParagraph:
      "You romanticize the past a little too much and honestly, good for you. The songs, the places, the conversations — you keep all of it. Sentimental to the core, and that's not a flaw. People who feel deeply enough to remember that much are the ones worth knowing.",
    bonusLine:
      "You still have screenshots of conversations from 2018. Not because you need them. Just because you can't bring yourself to delete them.",
    color: "#1b1f3b",
    emoji: "📼",
    presetKey: "midnight-static",
  },
];

export const ARCHETYPE_PRESET: Record<ArchetypeKey, string> = {
  overthinker: "midnight-static",
  softie: "golden-hour",
  "chaos-main": "neon-ache",
  "quiet-storm": "quiet-storm",
  healer: "3am",
  nostalgic: "midnight-static",
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
      score: number;
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

  // Signal A: Dominant reaction
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

  let dominantReaction: ReactionKey | null = null;
  let maxReactionCount = 0;
  (Object.keys(reactionCounts) as ReactionKey[]).forEach((key) => {
    if (reactionCounts[key] > maxReactionCount) {
      maxReactionCount = reactionCounts[key];
      dominantReaction = key;
    }
  });

  // Signal B: Dominant Post Category
  const categoryCounts: Record<string, number> = {};
  myPostCategories.forEach((c) => {
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  });

  let dominantCategory: Category | null = null;
  let maxCatCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      dominantCategory = cat as Category;
    }
  });

  // Signal E: Anonymity
  const isAnonymous = !handle || handle.toLowerCase() === "anonymous";

  // Signal F: Activity ratio (giver vs poster)
  const postCount = myPostCategories.length;
  const activityRatio = echoCount / Math.max(1, postCount);

  // Scores
  const scores: Record<ArchetypeKey, number> = {
    overthinker: 0,
    softie: 0,
    "chaos-main": 0,
    "quiet-storm": 0,
    healer: 0,
    nostalgic: 0,
  };

  // 1. The Overthinker (Max: 1.20)
  let rawOverthinker = 0;
  if (dominantReaction === "sad") rawOverthinker += 0.45;
  if (dominantCategory === "Silent Thoughts") rawOverthinker += 0.4;
  if (dominantCategory === "Hard Truth") rawOverthinker += 0.2;
  if (echoCount >= 2) rawOverthinker += 0.1;
  if (totalActions >= 10) rawOverthinker += 0.05;
  scores.overthinker = rawOverthinker / 1.2;

  // 2. The Softie (Max: 1.25)
  let rawSoftie = 0;
  if (dominantReaction === "hug") rawSoftie += 0.5;
  if (dominantCategory === "Spill The Tea") rawSoftie += 0.3;
  if (dominantReaction === "heart" || (dominantReaction === "hug" && reactionCounts.heart > 0))
    rawSoftie += 0.15;
  if (echoCount >= 3) rawSoftie += 0.2;
  if (totalWarmth >= 100) rawSoftie += 0.1;
  scores.softie = rawSoftie / 1.25;

  // 3. The Chaos Main Character (Max: 1.30)
  let rawChaos = 0;
  if (dominantReaction === "fire") rawChaos += 0.5;
  if (dominantCategory === "Plot Twist") rawChaos += 0.4;
  if (dominantCategory === "Vibe Check") rawChaos += 0.25;
  if (duelCount >= 5) rawChaos += 0.15;
  scores["chaos-main"] = rawChaos / 1.3;

  // 4. The Quiet Storm (Max: 1.10)
  let rawQuiet = 0;
  if (dominantReaction === "heart") rawQuiet += 0.4;
  if (isAnonymous) rawQuiet += 0.4;
  if (dominantCategory === "Hard Truth") rawQuiet += 0.2;
  if (echoCount === 0) rawQuiet += 0.1;
  scores["quiet-storm"] = rawQuiet / 1.1;

  // 5. The Healer (Max: 1.25)
  let rawHealer = 0;
  if (echoCount >= 4) rawHealer += 0.5;
  if (activityRatio >= 3) rawHealer += 0.4;
  if (dominantReaction === "hug") rawHealer += 0.2;
  if (totalWarmth >= 200) rawHealer += 0.15;
  scores.healer = rawHealer / 1.25;

  // 6. The Nostalgic One (Max: 1.05)
  let rawNostalgic = 0;
  if (dominantCategory === "Spill The Tea" && dominantReaction === "heart") rawNostalgic += 0.55;
  if (reactionCounts.sad > 0 && dominantReaction !== "sad") rawNostalgic += 0.25;
  if (duelCount >= 3) rawNostalgic += 0.15;
  if (echoCount >= 1) rawNostalgic += 0.1;
  scores.nostalgic = rawNostalgic / 1.05;

  // Winner selection (first archetype in ARCHETYPES wins ties)
  let winningKey: ArchetypeKey = ARCHETYPES[0]!.key;
  let highestScore = -1;

  ARCHETYPES.forEach((archetype) => {
    const score = scores[archetype.key];
    if (score > highestScore) {
      highestScore = score;
      winningKey = archetype.key;
    }
  });

  return {
    unlocked: true,
    archetype: winningKey,
    score: Math.min(1, Math.max(0, highestScore)),
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
