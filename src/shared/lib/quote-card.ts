/** Layout for the shareable quote image. Kept free of the DOM so it can be tested. */

export type CardFormatKey = "reel" | "post";

export type CardFormat = {
  label: string;
  fileName: string;
  width: number;
  height: number;
  /** Area the quote must stay inside, clear of Instagram's own buttons and captions. */
  quote: { top: number; width: number; height: number };
  attributionY: number;
  brandY: number;
};

export const CARD_FORMATS: Record<CardFormatKey, CardFormat> = {
  reel: {
    label: "Story or reel (9:16)",
    fileName: "bajihears-reel.png",
    width: 1080,
    height: 1920,
    quote: { top: 280, width: 800, height: 1000 },
    attributionY: 1370,
    brandY: 1440,
  },
  post: {
    label: "Post (4:5)",
    fileName: "bajihears-post.png",
    width: 1080,
    height: 1350,
    quote: { top: 130, width: 880, height: 900 },
    attributionY: 1130,
    brandY: 1215,
  },
};

const FONT_SIZES = [92, 80, 70, 62, 54, 48, 42, 36] as const;
const LINE_HEIGHT = 1.3;

export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    // A single word wider than the card has to break, or it would run off the edge.
    let rest = Array.from(word);
    while (rest.length > 1 && measure(rest.join("")) > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut).join("")) > maxWidth) cut--;
      lines.push(rest.slice(0, cut).join(""));
      rest = rest.slice(cut);
    }
    line = rest.join("");
  }
  if (line) lines.push(line);
  return lines;
}

/** Picks the largest font size at which the whole quote fits its area. */
export function fitQuote(
  text: string,
  format: CardFormat,
  measureAt: (value: string, fontSize: number) => number,
): { fontSize: number; lineHeight: number; lines: string[]; firstBaseline: number } {
  const { top, width, height } = format.quote;
  const smallest = FONT_SIZES[FONT_SIZES.length - 1]!;
  let fontSize: number = smallest;
  let lines: string[] = [];
  for (const size of FONT_SIZES) {
    lines = wrapLines(text, width, (value) => measureAt(value, size));
    fontSize = size;
    if (lines.length * size * LINE_HEIGHT <= height) break;
  }
  const lineHeight = fontSize * LINE_HEIGHT;
  const firstBaseline = top + (height - lines.length * lineHeight) / 2 + fontSize;
  return { fontSize, lineHeight, lines, firstBaseline };
}
