import type { ReactionKey } from "../types/unsaid";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "heart", emoji: "❤️", label: "Heart this" },
  { key: "sad", emoji: "😢", label: "This is sad" },
  { key: "fire", emoji: "🔥", label: "Too real" },
  { key: "hug", emoji: "🫂", label: "Sending a hug" },
];
