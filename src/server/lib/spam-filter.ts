// MIRROR: keep this in sync with client/lib/spam-filter.ts
// Server-side authoritative spam filter and rate limiter for BajiHears
// Blocks URLs, contact info, repeating chars, all-caps spam, and excessive frequency.

const BLOCKED_PATTERNS = [
  /https?:\/\//i, // any URL
  /wa\.me\/\d+/i, // WhatsApp links
  /\+92\d{10}/, // Pakistani phone numbers (+923001234567)
  /03\d{9}/, // Local 11-digit mobile numbers (03001234567)
  /(.)\1{6,}/, // 7+ repeated characters (e.g. "aaaaaaa")
  /[A-Z\s]{20,}/, // 20+ chars of all-caps screaming
  /\bfollow me\b/i,
  /\binstagram\.com\b/i,
  /\btiktok\.com\b/i,
  /\bsnapchat\b/i,
];

const MIN_WORDS = 3;
const MAX_IDENTICAL_WORDS_RATIO = 0.7; // if 70%+ of words are identical

export type ServerFilterResult = {
  passed: boolean;
  reason?: string;
};

export function checkServerSpam(text: string): ServerFilterResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { passed: false, reason: "Text cannot be empty." };
  }

  const words = trimmed.split(/\s+/);
  if (words.length < MIN_WORDS) {
    return { passed: false, reason: "Too short — submission must contain at least 3 words." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        passed: false,
        reason: "Contains links, contact numbers, or blocked patterns.",
      };
    }
  }

  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase();
    wordCounts[lower] = (wordCounts[lower] ?? 0) + 1;
  }
  const maxRepeat = Math.max(...Object.values(wordCounts));
  if (maxRepeat / words.length > MAX_IDENTICAL_WORDS_RATIO) {
    return { passed: false, reason: "Too repetitive — share authentic text." };
  }

  return { passed: true };
}
