import type { Duel } from "../types/duel";

export const MOCK_DUELS: Duel[] = [
  {
    id: "d1",
    format: "self-relate",
    prompt: "Which one is more you at 2 AM?",
    optionA: {
      id: "d1a",
      text: "I re-read old texts just to feel that spark again, even though I know how it ends.",
      category: "Spill The Tea",
    },
    optionB: {
      id: "d1b",
      text: "I act completely unbothered while calculating their exact active status online.",
      category: "Silent Thoughts",
    },
  },
  {
    id: "d2",
    format: "head-to-head",
    prompt: "Which confession hits harder?",
    optionA: {
      id: "d2a",
      text: "We were best friends for nine years and now I know you only through screenshots other people send me.",
      handle: "@lateshiftpoet",
      category: "Spill The Tea",
    },
    optionB: {
      id: "d2b",
      text: "I forgave you out loud and I'm still working on the quiet part.",
      category: "Hard Truth",
    },
  },
  {
    id: "d3",
    format: "self-relate",
    prompt: "How do you handle unsaid feelings?",
    optionA: {
      id: "d3a",
      text: "Write paragraphs in notes app, select all, and delete forever.",
      category: "Plot Twist",
    },
    optionB: {
      id: "d3b",
      text: "Post a very specific song on story and hope only one person understands.",
      category: "Vibe Check",
    },
  },
  {
    id: "d4",
    format: "head-to-head",
    prompt: "Which thought makes you feel less alone?",
    optionA: {
      id: "d4a",
      text: "Nobody warns you that healing is mostly boring.",
      category: "Silent Thoughts",
    },
    optionB: {
      id: "d4b",
      text: "You can be a whole person and still be someone's unfinished sentence.",
      handle: "@aashir.writes",
      category: "Hard Truth",
    },
  },
  {
    id: "d5",
    format: "self-relate",
    prompt: "Which type of ghosting hurts worse?",
    optionA: {
      id: "d5a",
      text: "The sudden cut-off out of nowhere after talking every day.",
      category: "Spill The Tea",
    },
    optionB: {
      id: "d5b",
      text: "The slow fade where reply times go from 5 mins to 3 days.",
      category: "Vibe Check",
    },
  },
  {
    id: "d6",
    format: "head-to-head",
    prompt: "Which truth needs to be said louder?",
    optionA: {
      id: "d6a",
      text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
      category: "Spill The Tea",
    },
    optionB: {
      id: "d6b",
      text: "There is a girl in Lahore who writes letters to a boy who moved to a city that no longer exists on her map.",
      category: "Plot Twist",
    },
  },
];

export function generateSplit(chosenOptionIndex: 0 | 1): { pctA: number; pctB: number } {
  const chosenPct = Math.floor(Math.random() * 18) + 55; // 55 to 72%
  const otherPct = 100 - chosenPct;
  return chosenOptionIndex === 0
    ? { pctA: chosenPct, pctB: otherPct }
    : { pctA: otherPct, pctB: chosenPct };
}
