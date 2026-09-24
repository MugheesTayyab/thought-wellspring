// MIRROR: keep this in sync with server/lib/spam-filter.ts
// Client-side spam filter and rate limiter for BajiHears confessions
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

export type FilterResult = {
  passed: boolean;
  reason?: string;
};

export function checkSpam(text: string): FilterResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { passed: false, reason: "Please write something before dropping tea." };
  }

  const words = trimmed.split(/\s+/);
  if (words.length < MIN_WORDS) {
    return { passed: false, reason: "Too short — spill at least a few words." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        passed: false,
        reason: "Contains links, contact numbers, or blocked patterns.",
      };
    }
  }

  // Word repetition check
  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase();
    wordCounts[lower] = (wordCounts[lower] ?? 0) + 1;
  }
  const maxRepeat = Math.max(...Object.values(wordCounts));
  if (maxRepeat / words.length > MAX_IDENTICAL_WORDS_RATIO) {
    return { passed: false, reason: "Too repetitive — share an authentic thought." };
  }

  return { passed: true };
}

const POST_TIMESTAMPS_KEY = "bh:postTimestamps";
const MAX_POSTS_PER_HOUR = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;

export function checkRateLimit(): { allowed: boolean; waitMinutes?: number } {
  if (typeof window === "undefined") return { allowed: true };

  try {
    const raw = localStorage.getItem(POST_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < ONE_HOUR_MS);

    if (recent.length >= MAX_POSTS_PER_HOUR) {
      const oldest = Math.min(...recent);
      const waitMs = ONE_HOUR_MS - (now - oldest);
      const waitMinutes = Math.max(1, Math.ceil(waitMs / 60_000));
      return { allowed: false, waitMinutes };
    }
  } catch {
    // quota/json error
  }

  return { allowed: true };
}

export function recordPostTimestamp(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(POST_TIMESTAMPS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < ONE_HOUR_MS);
    recent.push(now);
    localStorage.setItem(POST_TIMESTAMPS_KEY, JSON.stringify(recent));
  } catch {
    // ignore
  }
}
