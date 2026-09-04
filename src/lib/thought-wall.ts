// MOCKED STATE (see handoff notes): all thoughts, reaction counts, sponsored
// content, and the 24h lockout live in memory + localStorage for now. Swap each
// of these for backend calls later — the UI already treats the returned
// `canSubmit` / reaction state as authoritative.

export type ReactionKey = "love" | "cry" | "fire" | "hug";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "love", emoji: "❤️", label: "I relate" },
  { key: "cry", emoji: "😢", label: "Hits deep" },
  { key: "fire", emoji: "🔥", label: "Too real" },
  { key: "hug", emoji: "🫂", label: "Sending love" },
];

export type Thought = {
  id: string;
  text: string;
  handle: string | null;
  createdAt: number;
  upvotes: number;
  reactions: Record<ReactionKey, number>;
  featuredReel?: boolean;
  mood?: string;
  replies?: { id: string; text: string; handle: string | null }[];
};

export type SponsoredCard = {
  id: string;
  brand: string;
  text: string;
  cta: string;
  url: string;
};

// MOCK: sponsored placement content
export const SPONSORED: SponsoredCard = {
  id: "sponsored-1",
  brand: "Midnight Journal Co.",
  text: "For the words you're still not ready to say out loud. Undated journals, made for 2am.",
  cta: "Take a look",
  url: "#",
};

const HOUR = 3600_000;
const now = Date.now();

const r = (love: number, cry: number, fire: number, hug: number) => ({
  love,
  cry,
  fire,
  hug,
});

// MOCK: seed feed
export const MOCK_THOUGHTS: Thought[] = [
  {
    id: "t1",
    text: "I still check if you've watched my story. Three years later.",
    handle: null,
    createdAt: now - 4 * HOUR,
    upvotes: 1284,
    reactions: r(842, 311, 520, 190),
    featuredReel: true,
    mood: "Heartbreak",
    replies: [
      { id: "r1", text: "this one broke me", handle: null },
      { id: "r2", text: "delete this I'm in public", handle: "@quietnoise" },
    ],
  },
  {
    id: "t2",
    text: "Mom, I got into the program. I just didn't know how to tell you I'm scared.",
    handle: "@aashir.writes",
    createdAt: now - 7 * HOUR,
    upvotes: 903,
    reactions: r(511, 402, 208, 377),
    mood: "Family",
  },
  {
    id: "t3",
    text: "We were best friends for nine years and now I know you only through screenshots other people send me.",
    handle: null,
    createdAt: now - 11 * HOUR,
    upvotes: 774,
    reactions: r(398, 350, 190, 221),
    mood: "Friendship",
  },
  {
    id: "t4",
    text: "I'm not sad. I'm just tired of being the one who texts first.",
    handle: null,
    createdAt: now - 16 * HOUR,
    upvotes: 651,
    reactions: r(430, 180, 300, 140),
    featuredReel: true,
    mood: "Late Night",
  },
  {
    id: "t5",
    text: "College taught me how to survive alone. I wish it had taught me how to stop.",
    handle: "@lateshiftpoet",
    createdAt: now - 21 * HOUR,
    upvotes: 512,
    reactions: r(280, 160, 210, 96),
    mood: "College",
  },
  {
    id: "t6",
    text: "You said take care. I wanted you to say stay.",
    handle: null,
    createdAt: now - 26 * HOUR,
    upvotes: 488,
    reactions: r(300, 240, 130, 150),
    mood: "Heartbreak",
  },
  {
    id: "t7",
    text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
    handle: null,
    createdAt: now - 31 * HOUR,
    upvotes: 402,
    reactions: r(255, 120, 240, 88),
    mood: "Late Night",
  },
  {
    id: "t8",
    text: "I forgave you out loud and I'm still working on the quiet part.",
    handle: null,
    createdAt: now - 40 * HOUR,
    upvotes: 361,
    reactions: r(210, 130, 150, 175),
    mood: "Family",
  },
  {
    id: "t9",
    text: "Turns out the person I miss most is who I was before all of it.",
    handle: "@softstatic",
    createdAt: now - 52 * HOUR,
    upvotes: 344,
    reactions: r(230, 110, 190, 120),
    mood: "Late Night",
  },
];

export const MOODS = [
  "All",
  "Heartbreak",
  "College",
  "Friendship",
  "Late Night",
  "Family",
];

export const MAX_LEN = 280;
export const MIN_LEN = 3;

/* ---------- local (mocked) device rules ---------- */

const SUBMIT_KEY = "tw:lastSubmitAt";
const REACT_KEY = "tw:reactions";

export const LOCKOUT_MS = 24 * HOUR;

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

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

export function stripHandle(value: string): string {
  return value.replace(/^@+/, "").replace(/\s+/g, "");
}

export type SortKey = "top" | "new" | "loved";

export function sortThoughts(list: Thought[], sort: SortKey, from = Date.now()): Thought[] {
  const copy = [...list];
  if (sort === "new") return copy.sort((a, b) => b.createdAt - a.createdAt);
  if (sort === "loved") return copy.sort((a, b) => b.reactions.love - a.reactions.love);
  const recent = copy.filter((t) => from - t.createdAt <= 24 * HOUR);
  const rest = copy.filter((t) => from - t.createdAt > 24 * HOUR);
  return [
    ...recent.sort((a, b) => b.upvotes - a.upvotes),
    ...rest.sort((a, b) => b.upvotes - a.upvotes),
  ];
}
