// MOCKED STATE: every Unsaid, Echo, reaction count, report, winner pick and the
// 12h cycle/lockout lives in memory + localStorage. Swap each for backend calls
// later — the UI already treats returned permission state as authoritative.

import { SEED_DATA } from "./seedData";

export type ReactionKey = "heart" | "sad" | "fire" | "hug";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "heart", emoji: "❤️", label: "Heart this" },
  { key: "sad", emoji: "😢", label: "This is sad" },
  { key: "fire", emoji: "🔥", label: "Too real" },
  { key: "hug", emoji: "🫂", label: "Sending a hug" },
];

export const CATEGORIES = [
  "Spill The Tea",
  "Silent Thoughts",
  "Plot Twist",
  "Hard Truth",
  "Vibe Check",
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
  {
    key: "midnight-static",
    name: "Midnight Static",
    from: "#1b1f3b",
    to: "#3d2b56",
    ink: "#f4f0ff",
  },
  { key: "3am", name: "3AM Thoughts", from: "#101820", to: "#25424f", ink: "#eaf6ff" },
  {
    key: "golden-hour",
    name: "Golden Hour Confession",
    from: "#ff9a2b",
    to: "#e0192b",
    ink: "#fff8f2",
  },
  { key: "quiet-storm", name: "Quiet Storm", from: "#243b4a", to: "#6b7f8c", ink: "#f5fbff" },
  { key: "neon-ache", name: "Neon Ache", from: "#ff2e88", to: "#5b16d6", ink: "#fff0f8" },
];

export const EXCLUSIVE_PRESETS: (Preset & {
  isExclusive: true;
  totalSupply: number;
  remaining: number;
})[] = [
  {
    key: "aurora-borealis",
    name: "Aurora",
    from: "#0f2027",
    to: "#203a43",
    ink: "#a8edea",
    isExclusive: true,
    totalSupply: 100,
    remaining: 100, // // LATER: backend — track globally
  },
  {
    key: "rose-dust",
    name: "Rose Dust",
    from: "#4b1248",
    to: "#f10711",
    ink: "#ffe8e8",
    isExclusive: true,
    totalSupply: 50,
    remaining: 50,
  },
];

export function presetByKey(key: string): Preset {
  return (
    PRESETS.find((p) => p.key === key) ??
    EXCLUSIVE_PRESETS.find((p) => p.key === key) ??
    PRESETS[0]!
  );
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
  status?: "published" | "pending" | "review" | "rejected";
  pendingUntil?: number;
  deviceToken?: string;
  vetoCount?: number;
  vetoedBy?: string[];
  type?: "confession" | "which_one";
  whichOne?: {
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
  };
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
    handle: "@alfaaz_e_dil",
    createdAt: now - 13 * HOUR,
    category: "Spill The Tea",
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
    category: "Spill The Tea",
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
    category: "Spill The Tea",
    preset: "quiet-storm",
    reactions: r(398, 350, 190, 221),
    echoes: [],
  },
  {
    id: "u3",
    text: "Nobody warns you that healing is mostly boring.",
    handle: null,
    createdAt: now - 6 * HOUR,
    category: "Silent Thoughts",
    preset: "midnight-static",
    reactions: r(430, 90, 300, 140),
    echoes: [],
  },
  {
    id: "u4",
    text: '"You can be a whole person and still be someone\'s unfinished sentence."',
    handle: "@lateshiftpoet",
    createdAt: now - 8 * HOUR,
    category: "Hard Truth",
    preset: "neon-ache",
    reactions: r(280, 160, 210, 96),
    echoes: [],
  },
  {
    id: "u5",
    text: "My cousin is getting married to someone she met twice. Do I say something or is that not my place?",
    handle: null,
    createdAt: now - 10 * HOUR,
    category: "Vibe Check",
    preset: "3am",
    reactions: r(120, 44, 60, 88),
    echoes: [
      {
        id: "e2",
        text: "say it once, kindly, then let it go.",
        handle: null,
        createdAt: now - 9 * HOUR,
      },
    ],
  },
  {
    id: "u6",
    text: "There is a girl in Lahore who writes letters to a boy who moved to a city that no longer exists on her map.",
    handle: null,
    createdAt: now - 14 * HOUR,
    category: "Plot Twist",
    preset: "midnight-static",
    reactions: r(300, 240, 130, 150),
    echoes: [],
  },
  {
    id: "u7",
    text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
    handle: null,
    createdAt: now - 18 * HOUR,
    category: "Spill The Tea",
    preset: "quiet-storm",
    reactions: r(255, 120, 240, 88),
    echoes: [],
  },
  {
    id: "u8",
    text: "I forgave you out loud and I'm still working on the quiet part.",
    handle: null,
    createdAt: now - 26 * HOUR,
    category: "Spill The Tea",
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

/* ---------- Unsaids storage & Hero Feed Algorithm ---------- */

const UNSAIDS_KEY = "bh:unsaids";

export const readUnsaids = (): Unsaid[] => read<Unsaid[]>(UNSAIDS_KEY, MOCK_UNSAIDS);
export const writeUnsaids = (v: Unsaid[]) => write(UNSAIDS_KEY, v);

export function initializeWall(): void {
  if (typeof window === "undefined") return;
  const key = "bh:wallInitialized_v1";
  if (localStorage.getItem(key)) return;
  const existing = readUnsaids();
  if (!existing || existing.length === 0 || existing.length <= MOCK_UNSAIDS.length) {
    const seeded: Unsaid[] = SEED_DATA.map((post) => ({
      ...post,
      status: "published",
      vetoCount: 0,
      vetoedBy: [],
      type: "confession",
    }));
    writeUnsaids(seeded);
  }
  localStorage.setItem(key, "true");
}

export function scorePost(post: Unsaid): number {
  const ageHours = (Date.now() - post.createdAt) / 3_600_000;
  const reactionScore =
    post.reactions.heart * 2.5 +
    post.reactions.fire * 2.0 +
    post.reactions.hug * 2.0 +
    post.reactions.sad * 1.5;
  const echoScore = post.echoes.length * 4;
  const decay = Math.pow(0.5, ageHours / 8);

  // Posts over 36 hours old go to "From Earlier"
  if (ageHours > 36) return -1;
  return (reactionScore + echoScore) * decay;
}

export function getSortedFeed(posts: Unsaid[]): { heroFeed: Unsaid[]; earlierFeed: Unsaid[] } {
  const scored = posts
    .map((p) => ({ post: p, score: scorePost(p) }))
    .sort((a, b) => b.score - a.score);

  const heroFeed = scored.filter((p) => p.score >= 0).map((p) => p.post);
  const earlierFeed = scored
    .filter((p) => p.score < 0)
    .map((p) => p.post)
    .sort((a, b) => b.createdAt - a.createdAt);

  return { heroFeed, earlierFeed };
}

export function getWinner(posts: Unsaid[]): Unsaid | null {
  if (typeof window !== "undefined") {
    try {
      const cachedRaw = localStorage.getItem("bh:currentWinner");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { winner: Unsaid; cachedAt: number };
        if (Date.now() - cached.cachedAt < 3_600_000) {
          return cached.winner;
        }
      }
    } catch {
      // ignore
    }
  }

  const recentPosts = posts.filter(
    (p) =>
      Date.now() - p.createdAt <= 24 * 3_600_000 &&
      p.status !== "review" &&
      p.status !== "rejected",
  );
  if (recentPosts.length === 0) return null;

  const sorted = [...recentPosts].sort((a, b) => scorePost(b) - scorePost(a));
  const winner = sorted[0] ?? null;

  if (winner && typeof window !== "undefined") {
    try {
      localStorage.setItem("bh:currentWinner", JSON.stringify({ winner, cachedAt: Date.now() }));
    } catch {
      // ignore
    }
  }
  return winner;
}

export function generateShareCode(postId: string): string {
  return postId
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 8)
    .toUpperCase();
}

export function buildShareUrl(postId: string): string {
  return `https://bajihears.com/c/${generateShareCode(postId)}`;
}

export function vetoPost(
  postId: string,
  deviceToken: string,
): { success: boolean; underReview: boolean; reason?: string } {
  const unsaids = readUnsaids();
  const post = unsaids.find((u) => u.id === postId);
  if (!post) return { success: false, underReview: false, reason: "Post not found" };

  if (post.deviceToken && post.deviceToken === deviceToken) {
    return { success: false, underReview: false, reason: "Cannot veto your own post" };
  }

  const vetoedBy = post.vetoedBy ?? [];
  if (vetoedBy.includes(deviceToken)) {
    return { success: false, underReview: false, reason: "Already flagged" };
  }

  const newVetoCount = (post.vetoCount ?? 0) + 1;
  const newVetoedBy = [...vetoedBy, deviceToken];
  const underReview = newVetoCount >= 5 && (post.echoes?.length ?? 0) < 3;

  const updated = unsaids.map((u) =>
    u.id === postId
      ? {
          ...u,
          vetoCount: newVetoCount,
          vetoedBy: newVetoedBy,
          status: underReview ? ("review" as const) : (u.status ?? "published"),
        }
      : u,
  );

  writeUnsaids(updated);
  return { success: true, underReview };
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

export function getInstagramUrl(handle: string | null): string | null {
  if (!handle) return null;
  const clean = stripHandle(handle);
  if (!clean || clean.toLowerCase() === "anonymous") return null;
  return `https://instagram.com/${clean}`;
}

/* ---------- Warmth & Duel Extensions ---------- */

export type ActionType =
  "react" | "echo" | "post" | "share" | "duel" | "visit" | "spend" | "daily_bonus";

export interface WarmthLogEntry {
  id: string;
  action: ActionType;
  amount: number;
  label: string;
  timestamp: number;
}

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
};

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

/* ---------- Warmth & Duel Local Storage Keys ---------- */

const WARMTH_KEY = "bh:warmth";
const WARMTH_LOG_KEY = "bh:warmthLog";
const DAILY_CAP_KEY = "bh:dailyCap";
const STREAK_KEY = "bh:streak";
const MILESTONES_KEY = "bh:milestonesClaimed";
const CALLSIGN_KEY = "bh:callSign";
const DUELS_ANSWERED_KEY = "bh:duelAnswered";

export const readWarmth = () => read<number>(WARMTH_KEY, 0);
export const writeWarmth = (v: number) => write(WARMTH_KEY, v);

export const readWarmthLog = () => read<WarmthLogEntry[]>(WARMTH_LOG_KEY, []);
export const writeWarmthLog = (v: WarmthLogEntry[]) => write(WARMTH_LOG_KEY, v);

export interface DailyCapState {
  dateKey: string;
  amountEarned: number;
}
export const readDailyCap = () =>
  read<DailyCapState>(DAILY_CAP_KEY, { dateKey: "", amountEarned: 0 });
export const writeDailyCap = (v: DailyCapState) => write(DAILY_CAP_KEY, v);

export interface StreakState {
  count: number;
  lastVisitDate: string;
}
export const readStreak = () => read<StreakState>(STREAK_KEY, { count: 0, lastVisitDate: "" });
export const writeStreak = (v: StreakState) => write(STREAK_KEY, v);

export const readMilestonesClaimed = () => read<number[]>(MILESTONES_KEY, []);
export const writeMilestonesClaimed = (v: number[]) => write(MILESTONES_KEY, v);

export const readCallSign = () => read<string | null>(CALLSIGN_KEY, null);
export const writeCallSign = (v: string | null) => write(CALLSIGN_KEY, v);

export type AnsweredDuelRecord = Record<
  string,
  { choiceIndex: 0 | 1; pctA: number; pctB: number; answeredAt: number }
>;
export const readAnsweredDuels = () => read<AnsweredDuelRecord>(DUELS_ANSWERED_KEY, {});
export const writeAnsweredDuels = (v: AnsweredDuelRecord) => write(DUELS_ANSWERED_KEY, v);

const MY_POST_CATEGORIES_KEY = "bh:myPostCategories";
export const readMyPostCategories = (): Category[] => read<Category[]>(MY_POST_CATEGORIES_KEY, []);
export const appendMyPostCategory = (cat: Category): void => {
  const existing = readMyPostCategories();
  write(MY_POST_CATEGORIES_KEY, [...existing, cat]);
};
