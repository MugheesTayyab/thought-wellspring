/**
 * Sentence starters a reel can point to, such as bajihears.app/baji?p=ammi.
 * Links carry only a key, never text, so nobody can craft a link that fills the
 * composer with words of their choosing.
 */
export type ReelPrompt = { key: string; starter: string };

export const REEL_PROMPTS: readonly ReelPrompt[] = [
  { key: "ammi", starter: "Ammi, I never told you that" },
  { key: "abbu", starter: "Abbu, I wish you knew that" },
  { key: "friend", starter: "To the friend I stopped talking to:" },
  { key: "ex", starter: "To the person I never got over:" },
  { key: "sorry", starter: "I never got to say sorry for" },
  { key: "younger", starter: "To my younger self:" },
];

export function reelPromptByKey(key: string | null | undefined): ReelPrompt | undefined {
  return REEL_PROMPTS.find((prompt) => prompt.key === key);
}

/** How a starter reads as a button: an open sentence trails off, one ending in a colon doesn't. */
export function promptLabel(prompt: ReelPrompt): string {
  return prompt.starter.endsWith(":") ? prompt.starter : `${prompt.starter}…`;
}

/** True when someone is about to post a starter without adding anything of their own. */
export function isUnfinishedStarter(text: string): boolean {
  const trimmed = text.trim();
  return REEL_PROMPTS.some((prompt) => prompt.starter === trimmed);
}
