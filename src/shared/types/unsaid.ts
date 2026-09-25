export type ReactionKey = "heart" | "sad" | "fire" | "hug";

export type Category =
  | "Spill The Tea"
  | "Silent Thoughts"
  | "Plot Twist"
  | "Hard Truth"
  | "Vibe Check";

export type Preset = {
  key: string;
  name: string;
  from: string;
  to: string;
  ink: string;
};

export type ExclusivePreset = Preset & {
  isExclusive: true;
  totalSupply: number;
  remaining: number;
};

export type Echo = {
  id: string;
  text: string;
  handle: string | null;
  createdAt: number;
  profileId?: string | null | undefined;
  deviceToken?: string | undefined;
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
  status?: "published" | "pending" | "review" | "rejected" | undefined;
  pendingUntil?: number | undefined;
  deviceToken?: string | undefined;
  profileId?: string | null | undefined;
  vetoCount?: number | undefined;
  vetoedBy?: string[] | undefined;
  isWinner?: boolean | undefined;
  winnerCycle?: number | undefined;
  winnerHook?: string | null | undefined;
  pinnedUntil?: number | null | undefined;
  type?: "confession" | "which_one" | undefined;
  whichOne?: {
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
  } | undefined;
};

export type MyReactions = Record<string, ReactionKey[]>;
