// MOCKED STATE (frontend-first build): unsaids, reaction counts, moderation
// status, the sponsored pin, the 12-hour cycle winner and the 24h submit lock
// all live in memory + localStorage for now. The UI treats whatever this module
// returns as authoritative, so each function can be swapped for a backend call
// later without touching components.

export type ReactionKey = "love" | "cry" | "fire" | "hug";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "love", emoji: "❤️", label: "I relate" },
  { key: "cry", emoji: "😢", label: "Hits deep" },
  { key: "fire", emoji: "🔥", label: "Too real" },
  { key: "hug", emoji: "🫂", label: "Sending love" },
];

export type UnsaidStatus = "public" | "pending";

export type Unsaid = {
  id: string;
  /** Public sequence number, used on cards and reel watermarks. */
  num: number;
  text: string;
  /** Public Corner handle, or null when posted anonymously. */
  handle: string | null;
  createdAt: number;
  reactions: Record<ReactionKey, number>;
  status: UnsaidStatus;
  mood?: string;
  featuredReel?: boolean;
  replies?: { id: string; text: string; handle: string | null }[];
};

export type SponsoredPin = {
  id: string;
  brand: string;
  text: string;
  cta: string;
  url: string;
};

// MOCK: the paid "Thought of the Day" pin.
export const SPONSORED: SponsoredPin = {
  id: "pin-1",
  brand: "Midnight Journal Co.",
  text: "For the words you're still not ready to say out loud. Undated journals, made for 2am.",
  cta: "Take a look",
  url: "#",
};

const HOUR = 3_600_000;
const NOW = Date.now();

const r = (love: number, cry: number, fire: number, hug: number) => ({
  love,
  cry,
  fire,
  hug,
});

// MOCK: seed wall, newest first.
export const MOCK_UNSAIDS: Unsaid[] = [
  {
    id: "u142",
    num: 142,
    text: "I still check if you've watched my story. Three years later.",
    handle: null,
    createdAt: NOW - 2 * HOUR,
    reactions: r(842, 311, 520, 190),
    status: "public",
    featuredReel: true,
    mood: "Heartbreak",
    replies: [
      { id: "r1", text: "this one broke me", handle: null },
      { id: "r2", text: "delete this I'm in public", handle: "@quietnoise" },
    ],
  },
  {
    id: "u141",
    num: 141,
    text: "Mom, I got into the program. I just didn't know how to tell you I'm scared.",
    handle: "@aashir.writes",
    createdAt: NOW - 5 * HOUR,
    reactions: r(511, 402, 208, 377),
    status: "public",
    mood: "Family",
  },
  {
    id: "u140",
    num: 140,
    text: "We were best friends for nine years. Now I know you only through screenshots other people send me.",
    handle: null,
    createdAt: NOW - 8 * HOUR,
    reactions: r(398, 350, 190, 221),
    status: "public",
    mood: "Friendship",
  },
  {
    id: "u139",
    num: 139,
    text: "I'm not sad. I'm just tired of being the one who texts first.",
    handle: null,
    createdAt: NOW - 11 * HOUR,
    reactions: r(430, 180, 300, 140),
    status: "public",
    featuredReel: true,
    mood: "Late night",
  },
  {
    id: "u138",
    num: 138,
    text: "College taught me how to survive alone. I wish it had taught me how to stop.",
    handle: "@lateshiftpoet",
    createdAt: NOW - 15 * HOUR,
    reactions: r(280, 160, 210, 96),
    status: "public",
    mood: "University",
  },
  {
    id: "u137",
    num: 137,
    text: "You said take care. I wanted you to say stay.",
    handle: null,
    createdAt: NOW - 19 * HOUR,
    reactions: r(300, 240, 130, 150),
    status: "public",
    mood: "Heartbreak",
  },
  {
    id: "u136",
    num: 136,
    text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
    handle: null,
    createdAt: NOW - 26 * HOUR,
    reactions: r(255, 120, 240, 88),
    status: "public",
    mood: "Late night",
  },
  {
    id: "u135",
    num: 135,
    text: "I forgave you out loud and I'm still working on the quiet part.",
    handle: null,
    createdAt: NOW - 31 * HOUR,
    reactions: r(210, 130, 150, 175),
    status: "public",
    mood: "Family",
  },
  {
    id: "u134",
    num: 134,
    text: "Turns out the person I miss most is who I was before all of it.",
    handle: "@softstatic",
    createdAt: NOW - 40 * HOUR,
    reactions: r(230, 110, 190, 120),
    status: "public",
    featuredReel: true,
    mood: "Late night",
  },
  {
    id: "u133",
    num: 133,
    text: "My father learned my favourite food from a video I posted, not from me.",
    handle: null,
    createdAt: NOW - 47 * HOUR,
    reactions: r(388, 402, 96, 264),
    status: "public",
    mood: "Family",
  },
];

export const MAX_LEN = 280;
export const MIN_LEN = 3;
export const LOCKOUT_MS = 24 * HOUR;
export const CYCLE_MS = 12 * HOUR;

/* ---------- the 12-hour cycle (the only ranked moment in the product) ---------- */

export function totalReactions(u: Unsaid): number {
  return u.reactions.love + u.reactions.cry + u.reactions.fire + u.reactions.hug;
}

/** Start of the cycle window that `from` falls inside. */
export function cycleStart(from = Date.now()): number {
  return Math.floor(from / CYCLE_MS) * CYCLE_MS;
}

export function nextCycleAt(from = Date.now()): number {
  return cycleStart(from) + CYCLE_MS;
}

/**
 * MOCK: highest-engagement public unsaid from the *previous* window — the one
 * currently revealed. Falls back to the strongest recent unsaid while the seed
 * data is young so the reveal slot is never empty.
 */
export function cycleWinner(list: Unsaid[], from = Date.now()): Unsaid | null {
  const start = cycleStart(from);
  const publicOnly = list.filter((u) => u.status === "public");
  const inPrevWindow = publicOnly.filter(
    (u) => u.createdAt >= start - CYCLE_MS && u.createdAt < start,
  );
  const pool = inPrevWindow.length > 0 ? inPrevWindow : publicOnly.slice(0, 6);
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => totalReactions(b) - totalReactions(a))[0]!;
}

/** The Wall is strictly chronological — never ranked. */
export function chronological(list: Unsaid[]): Unsaid[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- crisis / moderation screening (mock of the server-side filter) ---------- */

const CRISIS_PATTERNS =
  /\b(kill myself|end my life|suicide|suicidal|self harm|self-harm|cut myself|want to die|no reason to live)\b/i;

const BLOCKED_PATTERNS = /(https?:\/\/|www\.)|\b(free followers|promo code|whatsapp \+?\d)/i;

export type ScreenResult =
  | { kind: "ok" }
  | { kind: "crisis" }
  | { kind: "blocked"; reason: string };

export function screenText(text: string): ScreenResult {
  if (CRISIS_PATTERNS.test(text)) return { kind: "crisis" };
  if (BLOCKED_PATTERNS.test(text))
    return { kind: "blocked", reason: "Links and promos don't make it through review." };
  return { kind: "ok" };
}

/* ---------- local (mocked) device rules ---------- */

const SUBMIT_KEY = "bh:lastSubmitAt";
const REACT_KEY = "bh:reactions";
const MINE_KEY = "bh:mine";
const CORNER_KEY = "bh:corner";

export function readLastSubmit(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SUBMIT_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function writeLastSubmit(ts: number) {
  window.localStorage.setItem(SUBMIT_KEY, String(ts));
}

export function clearLastSubmit() {
  window.localStorage.removeItem(SUBMIT_KEY);
}

export type MyReactions = Record<string, ReactionKey[]>;

export function readMyReactions(): MyReactions {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(REACT_KEY) ?? "{}") as MyReactions;
  } catch {
    return {};
  }
}

export function writeMyReactions(value: MyReactions) {
  window.localStorage.setItem(REACT_KEY, JSON.stringify(value));
}

/** Unsaids submitted from this device — powers the private engagement view. */
export function readMine(): Unsaid[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(MINE_KEY) ?? "[]") as Unsaid[];
  } catch {
    return [];
  }
}

export function writeMine(list: Unsaid[]) {
  window.localStorage.setItem(MINE_KEY, JSON.stringify(list));
}

export type Corner = { handle: string } | null;

export function readCorner(): Corner {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(CORNER_KEY) ?? "null") as Corner;
  } catch {
    return null;
  }
}

export function writeCorner(value: Corner) {
  if (!value) window.localStorage.removeItem(CORNER_KEY);
  else window.localStorage.setItem(CORNER_KEY, JSON.stringify(value));
}

/** MOCK: named reactors are only visible when they have a Public Corner. */
export function mockReactors(id: string): { handle: string; key: ReactionKey }[] {
  const pool: { handle: string; key: ReactionKey }[] = [
    { handle: "@quietnoise", key: "love" },
    { handle: "@softstatic", key: "cry" },
    { handle: "@lateshiftpoet", key: "fire" },
    { handle: "@aashir.writes", key: "hug" },
    { handle: "@noorsleeps", key: "love" },
  ];
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool.slice(0, (seed % 4) + 1);
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
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

export function stripHandle(value: string): string {
  return value.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "");
}
