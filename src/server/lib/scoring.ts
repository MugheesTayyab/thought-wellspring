import type { Unsaid } from "@/shared/types/unsaid";

export function scorePost(post: Unsaid): number {
  const ageHours = (Date.now() - post.createdAt) / 3_600_000;
  const reactionScore =
    post.reactions.heart * 2.5 +
    post.reactions.fire * 2.0 +
    post.reactions.hug * 2.0 +
    post.reactions.sad * 1.5;
  const echoScore = post.echoes.length * 4;
  const decay = Math.pow(0.5, ageHours / 8);

  // Posts over 36 hours old go to "From Earlier"
  if (ageHours > 36) return -1;
  return (reactionScore + echoScore) * decay;
}

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
