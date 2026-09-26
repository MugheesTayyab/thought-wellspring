import type { Unsaid } from "@/shared/types/unsaid";

const HOUR = 3600_000;
const now = Date.now();

const r = (heart: number, sad: number, fire: number, hug: number) => ({
  heart,
  sad,
  fire,
  hug,
});

export function getFallbackWinner(): { unsaid: Unsaid; hook: string } {
  const currentNow = typeof Date !== "undefined" && Date.now() > 1_000_000 ? Date.now() : 1790268707000;
  return {
    hook: "This one left everyone speechless.",
    unsaid: {
      id: "w1",
      text: "I still check if you've watched my story. Three years later.",
      handle: "@alfaaz_e_dil",
      createdAt: currentNow - 13 * HOUR,
      category: "Spill The Tea",
      preset: "3am",
      reactions: r(4820, 1310, 2210, 990),
      echoes: [
        { id: "we1", text: "this one broke me", handle: null, createdAt: currentNow - 11 * HOUR },
        {
          id: "we2",
          text: "delete this, I'm in public",
          handle: "@quietnoise",
          createdAt: currentNow - 9 * HOUR,
        },
      ],
    },
  };
}

export const FALLBACK_WINNER: { unsaid: Unsaid; hook: string } = {
  hook: "This one left everyone speechless.",
  get unsaid(): Unsaid {
    return getFallbackWinner().unsaid;
  },
};

export const WINNER = FALLBACK_WINNER;
