// MOCKED STATE: every Unsaid, Echo, reaction count, report, winner pick and the
// 12h cycle/lockout lives in memory + localStorage. Swap each for backend calls
// later — the UI already treats returned permission state as authoritative.

export type ReactionKey = "heart" | "sad" | "fire" | "hug";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "heart", emoji: "❤️", label: "Heart this" },
  { key: "sad", emoji: "😢", label: "This is sad" },
  { key: "fire", emoji: "🔥", label: "Too real" },
  { key: "hug", emoji: "🫂", label: "Sending a hug" },
];

export const CATEGORIES = [
  "Confession",
  "Random Thought",
  "Made-Up Story",
  "A Quote",
  "Advice Needed",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Preset = {
  key: string;
  name: string;
  from: string;
  to: string;
  ink: string;
};

export const PRESETS: Preset[] = [
  { key: "midnight-static", name: "Midnight Static", from: "#1b1f3b", to: "#3d2b56", ink: "#f4f0ff" },
  { key: "3am", name: "3AM Thoughts", from: "#101820", to: "#25424f", ink: "#eaf6ff" },
  { key: "golden-hour", name: "Golden Hour Confession", from: "#ff9a2b", to: "#e0192b", ink: "#fff8f2" },
  { key: "quiet-storm", name: "Quiet Storm", from: "#243b4a", to: "#6b7f8c", ink: "#f5fbff" },
  { key: "neon-ache", name: "Neon Ache", from: "#ff2e88", to: "#5b16d6", ink: "#fff0f8" },
];

export function presetByKey(key: string): Preset {
  return PRESETS.find((p) => p.key === key) ?? PRESETS[0]!;
}

export type Echo = {
  id: string;
  text: string;
  handle: string | null;
  createdAt: number;
};

export type Unsaid = {
  id: string;
  text: string;
  handle: string | null;
  createdAt: number;
  category: Category;
  preset: string;
  reactions: Record<ReactionKey, number>;
  echoes: Echo[];
};

const HOUR = 3600_000;
const now = Date.now();

const r = (heart: number, sad: number, fire: number, hug: number) => ({
  heart,
  sad,
  fire,
  hug,
});

// MOCK: last cycle's winning Unsaid + the hand-written hook line.
export const WINNER: { unsaid: Unsaid; hook: string } = {
  hook: "This one left everyone speechless.",
  unsaid: {
    id: "w1",
    text: "I still check if you've watched my story. Three years later.",
    handle: null,
    createdAt: now - 13 * HOUR,
    category: "Confession",
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

// MOCK: The Wall
export const MOCK_UNSAIDS: Unsaid[] = [
  {
    id: "u1",
    text: "Mom, I got into the program. I just didn't know how to tell you I'm scared.",
    handle: "@aashir.writes",
    createdAt: now - 2 * HOUR,
    category: "Confession",
    preset: "golden-hour",
    reactions: r(511, 402, 208, 377),
    echoes: [
      { id: "e1", text: "tell her. she'll be proud.", handle: null, createdAt: now - 1 * HOUR },
    ],
  },
  {
    id: "u2",
    text: "We were best friends for nine years and now I know you only through screenshots other people send me.",
    handle: null,
    createdAt: now - 4 * HOUR,
    category: "Confession",
    preset: "quiet-storm",
    reactions: r(398, 350, 190, 221),
    echoes: [],
  },
  {
    id: "u3",
    text: "Nobody warns you that healing is mostly boring.",
    handle: null,
    createdAt: now - 6 * HOUR,
    category: "Random Thought",
    preset: "midnight-static",
    reactions: r(430, 90, 300, 140),
    echoes: [],
  },
  {
    id: "u4",
    text: "\"You can be a whole person and still be someone's unfinished sentence.\"",
    handle: "@lateshiftpoet",
    createdAt: now - 8 * HOUR,
    category: "A Quote",
    preset: "neon-ache",
    reactions: r(280, 160, 210, 96),
    echoes: [],
  },
  {
    id: "u5",
    text: "My cousin is getting married to someone she met twice. Do I say something or is that not my place?",
    handle: null,
    createdAt: now - 10 * HOUR,
    category: "Advice Needed",
    preset: "3am",
    reactions: r(120, 44, 60, 88),
    echoes: [
      { id: "e2", text: "say it once, kindly, then let it go.", handle: null, createdAt: now - 9 * HOUR },
    ],
  },
  {
    id: "u6",
    text: "There is a girl in Lahore who writes letters to a boy who moved to a city that no longer exists on her map.",
    handle: null,
    createdAt: now - 14 * HOUR,
    category: "Made-Up Story",
    preset: "midnight-static",
    reactions: r(300, 240, 130, 150),
    echoes: [],
  },
  {
    id: "u7",
    text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
    handle: null,
    createdAt: now - 18 * HOUR,
    category: "Confession",
    preset: "quiet-storm",
    reactions: r(255, 120, 240, 88),
    echoes: [],
  },
  {
    id: "u8",
    text: "I forgave you out loud and I'm still working on the quiet part.",
    handle: null,
    createdAt: now - 26 * HOUR,
    category: "Confession",
    preset: "golden-hour",
    reactions: r(210, 130, 150, 175),
    echoes: [],
  },
];

export const MAX_LEN = 280;
export const MIN_LEN = 3;

/* ---------- cycle (12h, mocked) ---------- */

export const CYCLE_MS = 12 * HOUR;
export const LOCKOUT_MS = CYCLE_MS;

export function nextRevealAt(from = Date.now()): number {
  return Math.ceil(from / CYCLE_MS) * CYCLE_MS;
}

/* ---------- local (mocked) device rules ---------- */

const SUBMIT_KEY = "bh:lastSubmitAt";
const REACT_KEY = "bh:reactions";
const ECHO_KEY = "bh:echoed";
const REPORT_KEY = "bh:reported";
const AVATAR_KEY = "bh:avatarSeed";
const HANDLE_KEY = "bh:handle";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const readLastSubmit = () => read<number | null>(SUBMIT_KEY, null);
export const writeLastSubmit = (ts: number) => write(SUBMIT_KEY, ts);
export const clearLastSubmit = () => {
  if (typeof window !== "undefined") window.localStorage.removeItem(SUBMIT_KEY);
};

export type MyReactions = Record<string, ReactionKey[]>;
export const readMyReactions = () => read<MyReactions>(REACT_KEY, {});
export const writeMyReactions = (v: MyReactions) => write(REACT_KEY, v);

export const readMyEchoes = () => read<string[]>(ECHO_KEY, []);
export const writeMyEchoes = (v: string[]) => write(ECHO_KEY, v);

export const readMyReports = () => read<string[]>(REPORT_KEY, []);
export const writeMyReports = (v: string[]) => write(REPORT_KEY, v);

// MOCK: the real threshold-based auto-hide lives in the backend queue.
export const REPORT_THRESHOLD = 3;

export const readAvatarSeed = () => read<string | null>(AVATAR_KEY, null);
export const writeAvatarSeed = (v: string) => write(AVATAR_KEY, v);

export const readHandle = () => read<string | null>(HANDLE_KEY, null);
export const writeHandle = (v: string | null) => write(HANDLE_KEY, v);

export function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- formatting ---------- */

export function relativeTime(ts: number, from = Date.now()): string {
  const diff = Math.max(0, from - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function formatShortCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

export function stripHandle(value: string): string {
  return value.replace(/^@+/, "").replace(/\s+/g, "");
}
