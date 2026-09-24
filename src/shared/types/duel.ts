import type { Category } from "./unsaid";

export type DuelFormat = "self-relate" | "head-to-head";

export type DuelOption = {
  id: string;
  text: string;
  category?: Category;
  handle?: string | null;
};

export type Duel = {
  id: string;
  format: DuelFormat;
  prompt?: string;
  optionA: DuelOption;
  optionB: DuelOption;
  votesA?: number;
  votesB?: number;
  active?: boolean;
};

export type AnsweredDuelRecord = Record<
  string,
  { choiceIndex: 0 | 1; pctA: number; pctB: number; answeredAt: number }
>;
