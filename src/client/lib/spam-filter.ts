// MIRROR: keep this in sync with server/lib/spam-filter.ts
// Client-side spam filter and rate limiter for BajiHears confessions
// Blocks URLs, contact info, repeating chars, all-caps spam, and excessive frequency.

const BLOCKED_PATTERNS = [
  { regex: /https?:\/\//i, message: "Links & social handles are not allowed." },
  { regex: /www\.[a-z0-9-]+/i, message: "Links & social handles are not allowed." },
  { regex: /wa\.me|t\.me|discord\.gg/i, message: "Links & social handles are not allowed." },
  { regex: /0?3[0-4]\d{1}[\s.-]?\d{3}[\s.-]?\d{4}/, message: "Contact numbers are not allowed." },
  { regex: /(?:\+|00)92/i, message: "Contact numbers are not allowed." }
];

const MIN_WORDS = 3;

export type FilterResult = {
  passed: boolean;
  reason?: string;
};

/**
 * Basic client-side pre-flight validation.
 * Provides immediate UX hints for obvious violations (URLs, simple phone formats).
 * Does NOT include comprehensive abuse lexicons to prevent reverse-engineering.
 * Authoritative checks occur on the server.
 */
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
    if (pattern.regex.test(trimmed)) {
      return {
        passed: false,
        reason: pattern.message,
      };
    }
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
