import type {
  Category,
  MyReactions,
  ReactionKey,
  Unsaid,
} from "@/shared/types/unsaid";
import type {
  AnsweredDuelRecord,
} from "@/shared/types/duel";
import type {
  DailyCapState,
  StreakState,
  WarmthLogEntry,
} from "@/shared/types/warmth";
import { getTodayKey } from "@/shared/utils";
import { SEED_DATA } from "./seedData";
import { getOrCreateIdentity } from "./identity";

/* ---------- local storage keys ---------- */

const SUBMIT_KEY = "bh:lastSubmitAt";
const REACT_KEY = "bh:reactions";
const ECHO_KEY = "bh:echoed";
const REPORT_KEY = "bh:reported";
const AVATAR_KEY = "bh:avatarSeed";
const HANDLE_KEY = "bh:handle";
const UNSAIDS_KEY = "bh:unsaids";
const WARMTH_KEY = "bh:warmth";
const WARMTH_LOG_KEY = "bh:warmthLog";
const DAILY_CAP_KEY = "bh:dailyCap";
const STREAK_KEY = "bh:streak";
const MILESTONES_KEY = "bh:milestonesClaimed";
const CALLSIGN_KEY = "bh:callSign";
const DUELS_ANSWERED_KEY = "bh:duelAnswered";
const MY_POST_CATEGORIES_KEY = "bh:myPostCategories";
const PURCHASED_ITEMS_KEY = "bh:purchasedItems";

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
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

/* ---------- submit & identity storage ---------- */

export const readLastSubmit = () => read<number | null>(SUBMIT_KEY, null);
export const writeLastSubmit = (ts: number) => write(SUBMIT_KEY, ts);
export const clearLastSubmit = () => {
  if (typeof window !== "undefined") window.localStorage.removeItem(SUBMIT_KEY);
};

export const readMyReactions = () => read<MyReactions>(REACT_KEY, {});
export const writeMyReactions = (v: MyReactions) => write(REACT_KEY, v);

export const readMyEchoes = () => read<string[]>(ECHO_KEY, []);
export const writeMyEchoes = (v: string[]) => write(ECHO_KEY, v);

export const readMyReports = () => read<string[]>(REPORT_KEY, []);
export const writeMyReports = (v: string[]) => write(REPORT_KEY, v);

export const readAvatarSeed = () => read<string | null>(AVATAR_KEY, null);
export const writeAvatarSeed = (v: string) => write(AVATAR_KEY, v);

export const readHandle = () => read<string | null>(HANDLE_KEY, null);
export const writeHandle = (v: string | null) => write(HANDLE_KEY, v);

/* ---------- unsaids & wall ---------- */

const HOUR = 3600_000;
const now = Date.now();
const r = (heart: number, sad: number, fire: number, hug: number) => ({
  heart,
  sad,
  fire,
  hug,
});

export const FALLBACK_MOCK_UNSAIDS: Unsaid[] = [
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
];

export const readUnsaids = (): Unsaid[] => read<Unsaid[]>(UNSAIDS_KEY, FALLBACK_MOCK_UNSAIDS);
export const writeUnsaids = (v: Unsaid[]) => write(UNSAIDS_KEY, v);
export { WINNER, FALLBACK_WINNER } from "@/shared/constants/fallback-winner";

export function initializeWall(): void {
  if (typeof window === "undefined") return;
  const key = "bh:wallInitialized_v1";
  if (localStorage.getItem(key)) return;
  const existing = readUnsaids();
  if (!existing || existing.length === 0 || existing.length <= FALLBACK_MOCK_UNSAIDS.length) {
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

/* ---------- warmth & duels storage ---------- */

export const readWarmth = () => read<number>(WARMTH_KEY, 0);
export const writeWarmth = (v: number) => write(WARMTH_KEY, v);

export const readWarmthLog = () => read<WarmthLogEntry[]>(WARMTH_LOG_KEY, []);
export const writeWarmthLog = (v: WarmthLogEntry[]) => write(WARMTH_LOG_KEY, v);

export const readDailyCap = () =>
  read<DailyCapState>(DAILY_CAP_KEY, { dateKey: "", amountEarned: 0 });
export const writeDailyCap = (v: DailyCapState) => write(DAILY_CAP_KEY, v);

export const readStreak = () => read<StreakState>(STREAK_KEY, { count: 0, lastVisitDate: "" });
export const writeStreak = (v: StreakState) => write(STREAK_KEY, v);

export const readMilestonesClaimed = () => read<number[]>(MILESTONES_KEY, []);
export const writeMilestonesClaimed = (v: number[]) => write(MILESTONES_KEY, v);

export const readCallSign = () => read<string | null>(CALLSIGN_KEY, null);
export const writeCallSign = (v: string | null) => write(CALLSIGN_KEY, v);

export const readAnsweredDuels = () => read<AnsweredDuelRecord>(DUELS_ANSWERED_KEY, {});
export const writeAnsweredDuels = (v: AnsweredDuelRecord) => write(DUELS_ANSWERED_KEY, v);

export const readMyPostCategories = (): Category[] => read<Category[]>(MY_POST_CATEGORIES_KEY, []);
export const appendMyPostCategory = (cat: Category): void => {
  const existing = readMyPostCategories();
  write(MY_POST_CATEGORIES_KEY, [...existing, cat]);
};

export function getPurchasedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PURCHASED_ITEMS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hasPurchasedItem(itemId: string): boolean {
  return getPurchasedItems().includes(itemId);
}

export function recordPurchase(itemId: string): void {
  if (typeof window === "undefined") return;
  try {
    const items = getPurchasedItems();
    if (!items.includes(itemId)) {
      items.push(itemId);
      localStorage.setItem(PURCHASED_ITEMS_KEY, JSON.stringify(items));
    }
  } catch {
    // quota
  }
}

export function claimDailyBonus(): { claimed: boolean; amount: number } {
  if (typeof window === "undefined") return { claimed: false, amount: 0 };
  const today = getTodayKey();
  const lastClaim = localStorage.getItem("bh:lastDailyBonus");
  if (lastClaim === today) return { claimed: false, amount: 0 };

  const streak = getOrCreateIdentity().visitStreak;
  let amount = 5;
  if (streak >= 7) amount = 15;
  if (streak >= 14) amount = 25;
  if (streak >= 30) amount = 50;

  try {
    localStorage.setItem("bh:lastDailyBonus", today);
  } catch {
    // quota
  }
  return { claimed: true, amount };
}
