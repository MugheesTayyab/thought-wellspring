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
  profileId?: string | null;
  deviceToken?: string;
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
  profileId?: string | null;
  vetoCount?: number;
  vetoedBy?: string[];
  isWinner?: boolean;
  winnerCycle?: number;
  winnerHook?: string | null;
  pinnedUntil?: number | null;
  type?: "confession" | "which_one";
  whichOne?: {
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
  };
};

export type MyReactions = Record<string, ReactionKey[]>;
