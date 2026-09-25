import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface GenerateWinnerHookOptions {
  category: Category;
  createdAt: number;
  reactions: Record<ReactionKey, number>;
  echoCount: number;
  cycleHourUtc: number; // 0 for Dawn (00:00 UTC), 12 for Dusk (12:00 UTC)
}

/**
 * Editorial Hook Matrix for BajiHears Winner Selection
 * Grounded in Pakistani youth, campus culture, and emotional resonance.
 */
const CATEGORY_HOOKS: Record<Category, string[]> = {
  "Spill The Tea": [
    "The confession the whole wall was waiting to hear.",
    "Unfiltered truth that left everyone speechless.",
    "Said in secret, echoed across every corner.",
    "The drama everyone knew about but nobody dared to post."
  ],
  "Silent Thoughts": [
    "Said in secret, felt by everyone.",
    "Late-night honesty that struck a chord across the city.",
    "The quietest words that carried the heaviest weight.",
    "A confession kept inside for months, finally free."
  ],
  "Plot Twist": [
    "The plot twist nobody saw coming.",
    "When life writes a script stranger than any campus rumour.",
    "The turn of events that had the entire wall talking.",
    "Proof that everything can change in a single day."
  ],
  "Hard Truth": [
    "Some unsaids leave a silence that never ends.",
    "The heaviest words are always the ones kept quiet.",
    "A raw reality check that everyone needed to read.",
    "The truth nobody wanted to admit, but everyone acknowledged."
  ],
  "Vibe Check": [
    "Pure warmth and truth on the wall today.",
    "A gentle reminder of what truly matters.",
    "The softest light in an otherwise chaotic week.",
    "The wholesome confession that restored everyone's faith."
  ]
};

const DAWN_HOOKS = [
  "From the quiet midnight hours to the dawn light.",
  "2 AM thoughts that echoed across the entire community.",
  "When the rest of the world was asleep, this truth woke us up."
];

const DUSK_HOOKS = [
  "As the day winds down, this is the thought that stays with us.",
  "Campus halls are quiet now, but this confession echoes.",
  "The collective sigh of the day, written into words."
];

/**
 * Generates an evocative, contextual editorial hook line for a winning confession.
 */
export function generateWinnerHook(options: GenerateWinnerHookOptions): string {
  const { category, reactions, cycleHourUtc } = options;

  // 1. Dominant Reaction Check (Special Overrides)
  const totalReactions =
    (reactions.heart || 0) +
    (reactions.fire || 0) +
    (reactions.hug || 0) +
    (reactions.sad || 0);

  if (totalReactions > 0) {
    const hugRatio = (reactions.hug || 0) / totalReactions;
    const sadRatio = (reactions.sad || 0) / totalReactions;

    if (hugRatio >= 0.45) {
      return "A community wrapped in comfort: the confession everyone held gently.";
    }
    if (sadRatio >= 0.50) {
      return "A quiet grief that the entire community held together today.";
    }
  }

  // 2. Category Contextual Selection (Rotated deterministically by post creation time)
  const categoryPool = CATEGORY_HOOKS[category] || CATEGORY_HOOKS["Silent Thoughts"];
  const categoryIndex = Math.abs(Math.floor(options.createdAt / 1000)) % categoryPool.length;
  const primaryHook: string = categoryPool[categoryIndex] ?? categoryPool[0] ?? "The whole wall felt this confession.";

  // 3. Time of Cycle Flavor (1 out of 3 times, apply a Dawn or Dusk nuance)
  if (Math.abs(Math.floor(options.createdAt / 7000)) % 3 === 0) {
    if (cycleHourUtc === 0) {
      const dawnIndex = Math.abs(Math.floor(options.createdAt / 1000)) % DAWN_HOOKS.length;
      return DAWN_HOOKS[dawnIndex] ?? primaryHook;
    } else {
      const duskIndex = Math.abs(Math.floor(options.createdAt / 1000)) % DUSK_HOOKS.length;
      return DUSK_HOOKS[duskIndex] ?? primaryHook;
    }
  }

  return primaryHook;
}

/**
 * Generates a hook line directly from an Unsaid object and cycle timestamp.
 */
export function getHookForPost(post: Unsaid, cycleTimestamp: number = Date.now()): string {
  const cycleDate = new Date(cycleTimestamp);
  const cycleHourUtc = cycleDate.getUTCHours() < 12 ? 0 : 12;

  return generateWinnerHook({
    category: post.category,
    createdAt: post.createdAt,
    reactions: post.reactions,
    echoCount: post.echoes?.length || 0,
    cycleHourUtc
  });
}
