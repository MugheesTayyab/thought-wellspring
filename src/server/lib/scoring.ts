import type { Unsaid } from "@/shared/types/unsaid";

export const HALF_LIFE_HOURS = 8.0;

/**
 * Computes raw reaction resonance score.
 * Multipliers: Heart (2.5), Fire (2.0), Hug (2.0), Sad (1.5), Echo (4.0)
 */
export function computeRawResonance(post: Unsaid): number {
  const heart = post.reactions.heart || 0;
  const fire = post.reactions.fire || 0;
  const hug = post.reactions.hug || 0;
  const sad = post.reactions.sad || 0;
  const echoCount = post.echoes?.length || 0;

  return heart * 2.5 + fire * 2.0 + hug * 2.0 + sad * 1.5 + echoCount * 4.0;
}

/**
 * Computes safety veto penalty multiplier.
 * - 0 vetoes: 1.0 (no penalty)
 * - 1 veto: 0.85 (-15%)
 * - 2 vetoes: 0.60 (-40%)
 * - 3+ vetoes: 0.0 (disqualified from winner contention)
 */
export function computeVetoPenalty(vetoCount: number = 0): number {
  if (vetoCount >= 3) return 0;
  if (vetoCount === 2) return 0.6;
  if (vetoCount === 1) return 0.85;
  return 1.0;
}

/**
 * Computes mathematical score of a post within a specific 12-hour cycle window.
 * Incorporates continuous 8-hour exponential half-life decay and safety veto penalties.
 */
export function computeCycleScore(post: Unsaid, cycleEndMs: number): number {
  // If post has 3+ vetoes or is not published, disqualified
  if ((post.vetoCount || 0) >= 3 || post.status === "rejected" || post.status === "review") {
    return 0;
  }

  const ageHours = Math.max(0, (cycleEndMs - post.createdAt) / 3_600_000);
  const rawScore = computeRawResonance(post);
  const decayFactor = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
  const vetoPenalty = computeVetoPenalty(post.vetoCount || 0);

  const finalScore = rawScore * decayFactor * vetoPenalty;
  return Math.round(finalScore * 100) / 100;
}

/**
 * Legacy feed sorting function for home wall feed.
 */
export function scorePost(post: Unsaid): number {
  const ageHours = (Date.now() - post.createdAt) / 3_600_000;
  // Posts over 36 hours old go to "From Earlier"
  if (ageHours > 36) return -1;

  const rawScore = computeRawResonance(post);
  const decay = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
  return rawScore * decay;
}

/**
 * Ranks candidate confessions for 12-hour winner selection using deterministic tie-breaking.
 * Tie-breaker:
 * 1. Final Score DESC
 * 2. Echo count DESC
 * 3. Heart count DESC
 * 4. Earliest createdAt ASC
 */
export function rankCycleCandidates(
  posts: Unsaid[],
  cycleEndMs: number
): { post: Unsaid; score: number }[] {
  return posts
    .map((p) => ({ post: p, score: computeCycleScore(p, cycleEndMs) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      // 1. Score
      if (Math.abs(b.score - a.score) >= 0.01) {
        return b.score - a.score;
      }
      // 2. Echoes
      const echoesA = a.post.echoes?.length || 0;
      const echoesB = b.post.echoes?.length || 0;
      if (echoesB !== echoesA) {
        return echoesB - echoesA;
      }
      // 3. Hearts
      const heartsA = a.post.reactions.heart || 0;
      const heartsB = b.post.reactions.heart || 0;
      if (heartsB !== heartsA) {
        return heartsB - heartsA;
      }
      // 4. Earliest submission (seniority)
      return a.post.createdAt - b.post.createdAt;
    });
}

/**
 * Sorts wall feed into Hero feed (recent active) and Earlier feed.
 */
export function getSortedFeed(posts: Unsaid[]): { heroFeed: Unsaid[]; earlierFeed: Unsaid[] } {
  const scored = posts
    .map((p) => ({ post: p, score: scorePost(p) }))
    .sort((a, b) => b.score - a.score);

  const heroFeed = scored.filter((p) => p.score >= 0).map((p) => p.post);
  const earlierFeed = scored
    .filter((p) => p.score < 0)
    .map((p) => p.post)
    .sort((a, b) => b.createdAt - a.createdAt);

  return { heroFeed, earlierFeed };
}
