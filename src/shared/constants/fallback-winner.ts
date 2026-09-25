import type { Unsaid } from "@/shared/types/unsaid";

const HOUR = 3600_000;
const now = Date.now();

const r = (heart: number, sad: number, fire: number, hug: number) => ({
  heart,
  sad,
  fire,
  hug,
});

export const FALLBACK_WINNER: { unsaid: Unsaid; hook: string } = {
  hook: "This one left everyone speechless.",
  unsaid: {
    id: "w1",
    text: "I still check if you've watched my story. Three years later.",
    handle: "@alfaaz_e_dil",
    createdAt: now - 13 * HOUR,
    category: "Spill The Tea",
    preset: "3am",
    reactions: r(4820, 1310, 2210, 990),
    echoes: [
      { id: "we1", text: "this one broke me", handle: null, createdAt: now - 11 * HOUR },
      {
        id: "we2",
        text: "delete this, I'm in public",
        handle: "@quietnoise",
        createdAt: now - 9 * HOUR,
      },
    ],
  },
};

export const WINNER = FALLBACK_WINNER;
