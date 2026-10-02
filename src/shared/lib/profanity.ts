/**
 * BajiHears Profanity & Inappropriate Language Guard
 * Prevents bad words, vulgarity, f-words, s-words, slurs, and abusive language in English & Roman Urdu.
 * Designed to prevent false positives on clean words (e.g. "pass", "class", "assistant", "compassion").
 */

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  matchedWord?: string;
  category?: "vulgar" | "f_word" | "s_word" | "slur" | "abusive";
  message?: string;
}

// 1. Core English Vulgar Roots (Whole-word or boundary matching)
const ENGLISH_BAD_WORDS: Array<{
  regex: RegExp;
  category: NonNullable<ProfanityCheckResult["category"]>;
}> = [
  // F-Words
  {
    regex: /\b(?:f+u+c*k+|f+u+k+|f+c+k+|f+v+c+k+|f+a+k+|f\*+ck|f\*+k|motherf+u+c*k+|stfu)\w*\b/i,
    category: "f_word",
  },
  { regex: /\bf\s+u\s+c\s+k\b/i, category: "f_word" },

  // S-Words
  { regex: /\b(?:sh+i+t+|sh+y+t+|sh+e+e+t+|bullsh+i+t+|sh\*+t|sh!+t)\w*\b/i, category: "s_word" },
  { regex: /\bs\s+h\s+i\s+t\b/i, category: "s_word" },

  // B-Words & Bastard
  { regex: /\b(?:b+i+t+c+h+|b\*+tch|b!+tch|b+a+s+t+a+r+d+)\w*\b/i, category: "vulgar" },

  // A-Words (asshole, dumbass, jackass - careful not to match 'pass', 'glass', 'compass')
  {
    regex:
      /\b(?:a+s+s+h+o+l+e+|d+u+m+b+a+s+s+|j+a+c+k+a+s+s+|b+a+d+a+s+s+|a\$\$+hole|a\*\*+hole)\w*\b/i,
    category: "vulgar",
  },
  { regex: /\b(?:a+s+s|a\$\$)\b/i, category: "vulgar" },

  // C-words, D-words, P-words, Slurs & Sexual explicit
  {
    regex: /\b(?:c+u+n+t+|d+i+c+k+|p+u+s+s+y+|c+o+c+k+|s+l+u+t+|w+h+o+r+e+|b+l+o+w+j+o+b+)\w*\b/i,
    category: "vulgar",
  },
  { regex: /\b(?:n+i+g+g+[ae]r*|f+a+g+g*o+t*|r+e+t+a+r+d+)\w*\b/i, category: "slur" },
  { regex: /\b(?:p+o+r+n+|p+o+r+n+o+|x+x+x+|n+u+d+e+s+)\b/i, category: "vulgar" },
];

// 2. Roman Urdu & Regional Vulgarities / Abusive terms
const ROMAN_URDU_BAD_WORDS: Array<{
  regex: RegExp;
  category: NonNullable<ProfanityCheckResult["category"]>;
}> = [
  // Bhenchod, Madarchod & abbreviations
  { regex: /\b(?:b+h*e+h*e*n+c+h+o+d+|b+e+h+n+c+h+o+d+|b+c)\b/i, category: "abusive" },
  { regex: /\b(?:m+a+d+a+r+c+h+o+d+|m+c)\b/i, category: "abusive" },

  // Chutiya & variations
  {
    regex: /\b(?:c+h+u+t+i+y+a+|c+h+o+o+t+i+y+a+|c+h+o+o+t+y+a+|c+h+u+t+i+y+e+)\w*\b/i,
    category: "abusive",
  },

  // Gaandu, Randi, Harami, Kanjar, Kutta, Bharwa
  { regex: /\b(?:g+a+a*n+d+u+|g+a+n+d+u+)\b/i, category: "abusive" },
  { regex: /\b(?:r+a+n+d+i+|r+n+d+i+)\b/i, category: "abusive" },
  { regex: /\b(?:h+a+r+a+m+i+|h+a+r+a+a+m+i+|h+r+a+m+k+h+o+r+)\b/i, category: "abusive" },
  { regex: /\b(?:k+a+n+j+a+r+|k+a+n+j+r+)\b/i, category: "abusive" },
  { regex: /\b(?:k+u+t+t+a+|k+u+t+t+a+y+|k+u+t+t+e+)\b/i, category: "abusive" },
  { regex: /\b(?:b+h+a+r+w+a+|b+h+r+w+a+)\b/i, category: "abusive" },

  // Bhosdike, Loda/Lund, Gaand, Chod
  { regex: /\b(?:b+h+o+s+d+i+k+e+|b+h+o+s+d+i+|b+s+d+k)\b/i, category: "abusive" },
  { regex: /\b(?:l+a+u+d+a+|l+o+d+a+|l+u+n+d+|t+a+t+t+e+)\b/i, category: "abusive" },
  { regex: /\b(?:g+a+a*n+d+|c+h+u+d+a+i+|c+h+u+d+o+|c+h+u+d+w+a+)\b/i, category: "abusive" },
];

/**
 * Standardize text before checking: replaces common leetspeak substitutions.
 */
function standardizeLeetspeak(input: string): string {
  return input
    .replace(/[@]/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[!|1]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/[5]/g, "s")
    .replace(/[*]/g, "");
}

/**
 * Check if the text contains any bad words, f-words, s-words, or abusive terms.
 */
export function detectProfanity(rawText: string): ProfanityCheckResult {
  if (!rawText || typeof rawText !== "string") {
    return { hasProfanity: false };
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();
  const leetClean = standardizeLeetspeak(lower);

  // 1. Check English Bad Words (Original & Leetspeak)
  for (const { regex, category } of ENGLISH_BAD_WORDS) {
    const match = lower.match(regex) || leetClean.match(regex);
    if (match) {
      return {
        hasProfanity: true,
        matchedWord: match[0],
        category,
        message:
          "Baji keeps it warm & honest, not dirty. Inappropriate words (like f-words, s-words, etc.) are strictly forbidden.",
      };
    }
  }

  // 2. Check Roman Urdu Bad Words
  for (const { regex, category } of ROMAN_URDU_BAD_WORDS) {
    const match = lower.match(regex) || leetClean.match(regex);
    if (match) {
      return {
        hasProfanity: true,
        matchedWord: match[0],
        category,
        message:
          "Baji keeps it warm & honest, not dirty. Abusive language or slurs are strictly forbidden.",
      };
    }
  }

  // 3. Compact string check for spaced-out words (e.g. "f u c k", "s h i t")
  const compact = lower.replace(/[^a-z]/g, "");
  const compactForbidden = [
    "fuck",
    "shit",
    "bitch",
    "cunt",
    "nigger",
    "bhenchod",
    "chutiya",
    "madarchod",
  ];
  for (const word of compactForbidden) {
    if (compact.includes(word)) {
      return {
        hasProfanity: true,
        matchedWord: word,
        category: "vulgar",
        message: "Baji keeps it warm & honest, not dirty. Please remove inappropriate language.",
      };
    }
  }

  return { hasProfanity: false };
}
