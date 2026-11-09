import type { Category } from "@/shared/types/unsaid";

// Below this a collection page is thin: it stays reachable but is kept out of
// search results and the sitemap until enough thoughts have been published.
export const COLLECTION_MIN_POSTS = 10;

export interface Collection {
  slug: string;
  category: Category;
  title: string;
  description: string;
  intro: string[];
}

export const COLLECTIONS: readonly Collection[] = [
  {
    slug: "spill-the-tea",
    category: "Spill The Tea",
    title: "Spill The Tea: small secrets and family stories",
    description:
      "Anonymous, lighthearted secrets about family, friends and everyday drama, written by BajiHears readers.",
    intro: [
      "Every family has a story that only gets told in the kitchen, and every friend group has one thing nobody has said out loud yet. Spill The Tea is where those stories land. Think of the aunt who keeps a list, the wedding plan nobody agreed to, or the group chat that knows far too much.",
      "These thoughts are meant to be funny or a little scandalous, never cruel. Names and identifying details stay out of them, because the point is the story and not the person. If something here reminds you of your own family, you are in good company.",
    ],
  },
  {
    slug: "silent-thoughts",
    category: "Silent Thoughts",
    title: "Silent Thoughts: the things people keep to themselves",
    description:
      "Quiet, anonymous reflections on love, distance, family and growing up, written by BajiHears readers.",
    intro: [
      "Some thoughts are not secrets exactly. They just never found the right moment. Silent Thoughts collects those: the call you make to hear a familiar voice, the habit you only noticed once someone was gone, the sentence you rehearsed and never said.",
      "Nothing here is asking to be solved. If a thought stays with you, you can leave a kind reply or simply read on. Reading along without writing anything is completely welcome.",
    ],
  },
  {
    slug: "plot-twist",
    category: "Plot Twist",
    title: "Plot Twist: when the story turned out differently",
    description:
      "Short, anonymous stories about misunderstandings and surprises that changed how someone saw things.",
    intro: [
      "You were sure you knew what was going on, and then you found out you didn't. Plot Twist is for those moments: the complaint that was really a goodbye, the stranger who turned out to be family, the assumption that fell apart in one sentence.",
      "These stories are short by design, usually just a few lines with a turn at the end. They are a useful reminder of how much of other people's lives we are guessing at.",
    ],
  },
  {
    slug: "hard-truth",
    category: "Hard Truth",
    title: "Hard Truth: honest admissions people rarely say out loud",
    description:
      "Anonymous admissions about work, friendship and family, including the uncomfortable parts, from BajiHears readers.",
    intro: [
      "A hard truth is usually about yourself. It might be the credit you accepted that belonged to someone else, the help you pretended not to notice, or the kindness you can't quite tell apart from cowardice.",
      "Writing these down anonymously lets people be honest without having to defend themselves. Replies here should stay gentle. If a thought touches on something heavier and you need support, our help page lists places to turn.",
    ],
  },
  {
    slug: "vibe-check",
    category: "Vibe Check",
    title: "Vibe Check: everyday moments that made someone laugh",
    description:
      "Funny, relatable, anonymous moments from daily life, shared by BajiHears readers.",
    intro: [
      "Not everything left unsaid is heavy. Vibe Check is for the ordinary and slightly ridiculous: wishing your dentist a good meal, getting asked to settle a family argument over biryani, or discovering your parents have a spreadsheet for everything.",
      "If one of these sounds exactly like something you would do, press Relate and move on with your day. Sometimes the best reaction to being human is a small laugh.",
    ],
  },
] as const;

export function collectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}
