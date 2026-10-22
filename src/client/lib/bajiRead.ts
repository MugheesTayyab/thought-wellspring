import type { Category, ReactionKey } from "@/shared/types/unsaid";
import type { AnsweredDuelRecord } from "@/shared/types/duel";

export type ArchetypeKey =
  "overthinker" | "softie" | "chaos-main" | "quiet-storm" | "healer" | "nostalgic" | "truth-teller";

export interface ArchetypeDefinition {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  hookLine: string;
  opening: string;
  pattern: string;
  contrast: string;
  closing: string;
  color: string;
  emoji: string;
  presetKey: string;
  reflectionPrompt: string;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    key: "overthinker",
    name: "The Afterthought Editor",
    tagline: "Noticing the footnotes",
    hookLine: "You often stay with a thought after everyone else has scrolled on.",
    opening: "Your activity leans toward the quieter, more reflective parts of the Wall.",
    pattern:
      "You seem drawn to unfinished sentences, late-night honesty, and reactions that say ‘I felt that too.’",
    contrast:
      "Careful can look like distant from the outside, even when it is simply your way of paying attention.",
    closing: "Keep the nuance. Let a few thoughts stay uncomplicated, too.",
    color: "#7c3aed",
    emoji: "🌙",
    presetKey: "midnight-static",
    reflectionPrompt: "What is one thought you can let rest tonight without resolving it completely?",
  },
  {
    key: "softie",
    name: "The Gentle Defender",
    tagline: "Softness with a backbone",
    hookLine: "You tend to notice the person inside the story before the drama around it.",
    opening:
      "Your reactions gather around tenderness, loyalty, and moments that need a little care.",
    pattern: "You often meet a vulnerable thought with warmth instead of trying to fix it.",
    contrast: "Being generous with understanding does not mean every situation needs your energy.",
    closing: "Keep the tenderness. Save some of it for yourself.",
    color: "#e76f36",
    emoji: "🫶",
    presetKey: "golden-hour",
    reflectionPrompt: "Where in your own life could you offer yourself the same grace you give so easily to others?",
  },
  {
    key: "chaos-main",
    name: "The Plot-Twist Friend",
    tagline: "A little spark in the scroll",
    hookLine: "You seem to enjoy the thought that changes the room’s temperature.",
    opening: "Your choices tilt toward bold lines, surprise turns, and honest comic relief.",
    pattern:
      "You notice when a story needs a laugh, a raised eyebrow, or permission to be less polished.",
    contrast: "Playful can still be thoughtful; the two do not cancel each other out.",
    closing: "Keep the spark. Leave room for the quiet beat after it.",
    color: "#c84e78",
    emoji: "✨",
    presetKey: "neon-ache",
    reflectionPrompt: "What is an unexpected turn that ended up teaching you something good?",
  },
  {
    key: "quiet-storm",
    name: "The Quiet Observer",
    tagline: "Reading the room gently",
    hookLine: "Not every thought needs to be spoken to matter.",
    opening: "Your activity suggests a preference for observation before response.",
    pattern:
      "You seem at home with subtle shifts, layered feelings, and thoughts that do not announce themselves.",
    contrast: "Silence can be attentive, but your own voice deserves space when you want it.",
    closing: "Keep noticing. Speak when the thought feels worth carrying outward.",
    color: "#3e7f91",
    emoji: "🌊",
    presetKey: "quiet-storm",
    reflectionPrompt: "What is something you observed recently that gave you quiet reassurance?",
  },
  {
    key: "healer",
    name: "The Kind Reply",
    tagline: "Making the thread feel human",
    hookLine: "You often answer a vulnerable moment with presence.",
    opening: "Echoes and supportive reactions play a noticeable part in your activity.",
    pattern:
      "You seem to value responses that make a person feel heard without turning their story into advice.",
    contrast: "Showing up for someone can be small; it does not have to mean carrying everything.",
    closing: "Keep the kindness practical, honest, and within your own boundaries.",
    color: "#43876d",
    emoji: "💬",
    presetKey: "3am",
    reflectionPrompt: "Who in your circle might appreciate a simple, unprompted 'thinking of you' today?",
  },
  {
    key: "nostalgic",
    name: "The Memory Keeper",
    tagline: "A soft spot for the before",
    hookLine: "You tend to pause on thoughts that carry a sense of time and place.",
    opening:
      "Your activity leans toward memory, friendship, and the emotional details that linger.",
    pattern:
      "Songs, old versions of people, and tiny remembered scenes seem to catch your attention.",
    contrast: "Remembering can be warm without asking the past to become the present again.",
    closing: "Keep the souvenirs that help. Let the rest become a story.",
    color: "#6870a8",
    emoji: "📼",
    presetKey: "midnight-static",
    reflectionPrompt: "What is a happy memory that has stayed surprisingly vivid for you?",
  },
  {
    key: "truth-teller",
    name: "The Clear-Eyed Friend",
    tagline: "Warm, but not vague",
    hookLine: "You often choose the line that says the useful thing plainly.",
    opening:
      "Your choices gather around directness, boundaries, and thoughts that cut through noise.",
    pattern: "You seem to appreciate honesty most when it stays grounded in care.",
    contrast:
      "Clarity lands differently depending on timing; direct does not have to mean immediate.",
    closing: "Keep the honesty. Give it enough room to be heard.",
    color: "#a86634",
    emoji: "⚖️",
    presetKey: "quiet-storm",
    reflectionPrompt: "What is a boundary you set that made your life lighter once in place?",
  },
];

export const ARCHETYPE_PRESET: Record<ArchetypeKey, string> = Object.fromEntries(
  ARCHETYPES.map((item) => [item.key, item.presetKey]),
) as Record<ArchetypeKey, string>;

export function getArchetype(key: ArchetypeKey): ArchetypeDefinition {
  return ARCHETYPES.find((item) => item.key === key) ?? ARCHETYPES[3]!;
}

export function getSampleArchetype(): ArchetypeDefinition {
  return ARCHETYPES[3]!; // The Quiet Observer as a welcoming sample
}

export type BajiReadResult =
  | { unlocked: false; totalActions: number; actionsNeeded: number }
  | { unlocked: true; archetype: ArchetypeKey; evidenceSummary: string; computedAt: number };

export interface BajiReadState {
  computedAt: number;
  result: BajiReadResult;
}

export const BAJI_READ_KEY = "bh:bajRead";
export const BAJI_READ_SAVED_KEY = "bh:bajRead:saved";
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function computeBajiRead(
  myReactions: Record<string, ReactionKey[]>,
  myEchoes: string[],
  answeredDuels: AnsweredDuelRecord,
  myPostCategories: Category[],
  _totalEmber: number,
  _handle: string | null,
  postsCatalog: Array<{ id: string; text: string; category: Category }> = [],
): BajiReadResult {
  const reactionCount = Object.keys(myReactions).length;
  const echoCount = myEchoes.length;
  const duelCount = Object.keys(answeredDuels).length;
  const postCount = myPostCategories.length;
  const totalActions = reactionCount + echoCount + duelCount + postCount;

  if (totalActions < 5) return { unlocked: false, totalActions, actionsNeeded: 5 - totalActions };

  const scores: Record<ArchetypeKey, number> = {
    overthinker: 0,
    softie: 0,
    "chaos-main": 0,
    "quiet-storm": 0,
    healer: 0,
    nostalgic: 0,
    "truth-teller": 0,
  };
  const themes = new Set<string>();
  for (const [postId, reactions] of Object.entries(myReactions)) {
    const post = postsCatalog.find((item) => item.id === postId);
    if (reactions.includes("hug")) {
      scores.softie += 2;
      scores.healer += 1;
    }
    if (reactions.includes("heart")) {
      scores.nostalgic += 1;
      scores["quiet-storm"] += 1;
    }
    if (reactions.includes("fire")) {
      scores["chaos-main"] += 2;
      scores["truth-teller"] += 1;
    }
    if (reactions.includes("sad")) scores.overthinker += 2;
    if (post?.category) themes.add(post.category);
  }
  scores.healer += echoCount * 2;
  scores["truth-teller"] += duelCount;
  scores["quiet-storm"] += reactionCount;
  for (const category of myPostCategories) {
    if (category === "Hard Truth") scores["truth-teller"] += 2;
    else if (category === "Plot Twist") scores["chaos-main"] += 2;
    else if (category === "Vibe Check") scores.nostalgic += 2;
    else if (category === "Silent Thoughts") scores.overthinker += 2;
    else scores.softie += 1;
  }
  const archetype = (Object.entries(scores) as Array<[ArchetypeKey, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]![0];
  const activityParts = [
    reactionCount && `${reactionCount} reacted ${reactionCount === 1 ? "thought" : "thoughts"}`,
    echoCount && `${echoCount} ${echoCount === 1 ? "Echo" : "Echoes"}`,
    duelCount && `${duelCount} Duel ${duelCount === 1 ? "choice" : "choices"}`,
    postCount && `${postCount} shared ${postCount === 1 ? "thought" : "thoughts"}`,
  ].filter(Boolean);
  const themeNote = themes.size
    ? ` Themes you paused on included ${Array.from(themes).slice(0, 2).join(" and ")}.`
    : "";
  return {
    unlocked: true,
    archetype,
    evidenceSummary: `A playful reflection from ${activityParts.join(", ")}.${themeNote}`,
    computedAt: Date.now(),
  };
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeWrite<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}
export const readBajiReadCache = () => safeRead<BajiReadState | null>(BAJI_READ_KEY, null);
export const writeBajiReadCache = (state: BajiReadState) => safeWrite(BAJI_READ_KEY, state);
export const clearBajiReadCache = () => {
  try {
    localStorage.removeItem(BAJI_READ_KEY);
  } catch {
    /* noop */
  }
};
export const readBajiReadSaved = () => safeRead<boolean>(BAJI_READ_SAVED_KEY, false);
export const writeBajiReadSaved = (saved: boolean) => safeWrite(BAJI_READ_SAVED_KEY, saved);
