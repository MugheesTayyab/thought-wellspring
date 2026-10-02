/**
 * BajiHears Psychological Intrigue & Voyeuristic Likeability Algorithm
 *
 * Evaluates confessions based on human psychological drivers:
 * 1. Privacy Invasion & Eavesdropping Factor (snooping, forbidden secrets, overheard drama)
 * 2. Emotional Magnetic Voltage (reactions heat, echoes count, community hype)
 * 3. Narrative Tension & Readability (sweet-spot character count for 5-second addiction)
 * 4. Category Voyeurism Multiplier (Spill The Tea & Silent Thoughts carry maximum intrigue)
 */

import type { Category, Unsaid } from "@/shared/types/unsaid";

// 1. Voyeuristic & Privacy-Invasion Keyword Clusters
const SNOOPING_KEYWORDS = [
  "phone",
  "passcode",
  "unlocked",
  "gallery",
  "screenshots",
  "archived",
  "deleted",
  "chats",
  "dms",
  "whatsapp",
  "active status",
  "location",
  "burner",
  "stalking",
  "searched",
  "notes app",
  "lock screen",
  "notification",
  "lockscreen",
];

const EAVESDROPPING_KEYWORDS = [
  "overheard",
  "behind their back",
  "whispered",
  "door",
  "caught",
  "listening",
  "saw him",
  "saw her",
  "read his",
  "read her",
  "found out",
  "secretly",
  "spied",
  "under the table",
  "other room",
];

const TABOO_DRAMA_KEYWORDS = [
  "fiance",
  "fiancé",
  "wedding",
  "engaged",
  "in-laws",
  "mother-in-law",
  "cousin",
  "best friend's",
  "two-faced",
  "double life",
  "nobody knows",
  "never told anyone",
  "real story",
  "real reason",
  "fake smile",
  "pretending",
  "affair",
  "cheating",
  "lie",
  "lied",
  "truth is",
  "secret",
  "confession",
];

const VULNERABILITY_KEYWORDS = [
  "2am",
  "3am",
  "2 am",
  "3 am",
  "midnight",
  "crying",
  "heartbreak",
  "block list",
  "unsaid",
  "replaying",
  "ghosted",
  "voicenote",
  "playlist",
  "regret",
  "miss",
];

// Category multipliers based on psychological appetite
const CATEGORY_MULTIPLIER: Record<Category, number> = {
  "Spill The Tea": 1.35,
  "Silent Thoughts": 1.25,
  "Hard Truth": 1.2,
  "Plot Twist": 1.2,
  "Vibe Check": 1.05,
};

/**
 * Calculates a 0-100+ Psychological Intrigue Score for any confession.
 */
export function calculatePsychologicalIntrigueScore(unsaid: Unsaid): number {
  const text = (unsaid.text || "").toLowerCase();
  let score = 0;

  // 1. Privacy & Snooping Factor (Max 35 pts)
  let snoopingMatches = 0;
  for (const kw of SNOOPING_KEYWORDS) {
    if (text.includes(kw)) snoopingMatches++;
  }
  score += Math.min(35, snoopingMatches * 14);

  // 2. Eavesdropping & Forbidden Secrets (Max 30 pts)
  let eavesdropMatches = 0;
  for (const kw of EAVESDROPPING_KEYWORDS) {
    if (text.includes(kw)) eavesdropMatches++;
  }
  score += Math.min(30, eavesdropMatches * 12);

  // 3. Taboo Drama & Real Story (Max 25 pts)
  let dramaMatches = 0;
  for (const kw of TABOO_DRAMA_KEYWORDS) {
    if (text.includes(kw)) dramaMatches++;
  }
  score += Math.min(25, dramaMatches * 10);

  // 4. Raw Late-Night Vulnerability (Max 15 pts)
  let vulnMatches = 0;
  for (const kw of VULNERABILITY_KEYWORDS) {
    if (text.includes(kw)) vulnMatches++;
  }
  score += Math.min(15, vulnMatches * 8);

  // 5. Engagement Heat (Likeability & Echo Discussion)
  const rx = unsaid.reactions || { heart: 0, sad: 0, fire: 0, hug: 0 };
  const reactionWeight =
    (rx.fire || 0) * 3.0 + (rx.heart || 0) * 2.2 + (rx.hug || 0) * 1.5 + (rx.sad || 0) * 1.5;
  const echoWeight = (unsaid.echoes?.length || 0) * 4.0;
  score += Math.min(40, reactionWeight + echoWeight);

  // 6. Optimal Narrative Length (70 - 220 chars = maximum cliffhanger tension)
  const len = unsaid.text ? unsaid.text.length : 0;
  if (len >= 70 && len <= 220) {
    score += 12;
  } else if (len >= 40 && len < 70) {
    score += 6;
  }

  // 7. Punctuation Tension
  if (text.includes("...") || text.includes("?")) {
    score += 4;
  }

  // 8. Apply Category Multiplier
  const multiplier = CATEGORY_MULTIPLIER[unsaid.category] || 1.1;
  const finalScore = Math.round(score * multiplier);

  return finalScore;
}

/**
 * Sorts recent posts by Psychological Intrigue.
 * The top post returned is guaranteed to be the most likeable, voyeuristically irresistible confession!
 */
export function sortPostsByPsychologicalIntrigue(posts: Unsaid[]): Unsaid[] {
  if (!posts || posts.length <= 1) return posts;

  // We score all posts and sort descending by intrigue score
  return [...posts].sort((a, b) => {
    const scoreA = calculatePsychologicalIntrigueScore(a);
    const scoreB = calculatePsychologicalIntrigueScore(b);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    // Secondary tie-breaker: recency
    return b.createdAt - a.createdAt;
  });
}
