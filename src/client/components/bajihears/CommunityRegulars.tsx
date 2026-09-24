import React from "react";
import { Sparkles, Flame, Crown } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";
import { triggerHaptic } from "@/client/lib/haptics";

export interface RegularMember {
  handle: string;
  seed: string;
  streakDays: number;
  badge: string;
  bio: string;
  isOnline?: boolean;
}

const REGULARS: RegularMember[] = [
  {
    handle: "alfaaz_e_dil",
    seed: "alfaaz42",
    streakDays: 34,
    badge: "Baji Regular 👑",
    bio: "spilling silent 2am thoughts",
    isOnline: true,
  },
  {
    handle: "chaiwala_99",
    seed: "chai99",
    streakDays: 21,
    badge: "Fortnight 🔥",
    bio: "doodh patti & hard truths",
    isOnline: true,
  },
  {
    handle: "raat_ki_baat",
    seed: "raat88",
    streakDays: 14,
    badge: "Night Owl 🌙",
    bio: "listening when everyone sleeps",
    isOnline: false,
  },
  {
    handle: "jhalli_07",
    seed: "jhalli07",
    streakDays: 9,
    badge: "Week One ✨",
    bio: "hopeless romantic & tea lover",
    isOnline: true,
  },
  {
    handle: "suno_baji",
    seed: "sunobaji",
    streakDays: 7,
    badge: "3-Day Spark 🔥",
    bio: "words that heal quietly",
    isOnline: false,
  },
];

export const CommunityRegulars: React.FC = () => {
  return (
    <section
      aria-label="Community Regulars"
      className="slide-in-card relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-card via-[#160e0e]/90 to-card/80 p-4 sm:p-5 shadow-soft transition-all"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(250,84,28,0.25)]">
            <Crown className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Community Regulars</span>
              <Sparkles className="size-3 text-primary shrink-0" />
            </h2>
            <p className="text-[11px] text-muted-foreground/80 font-vibe">
              Those who keep the quiet warmth alive
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-mono text-primary/90 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
          <Flame className="size-3 fill-current" />
          <span>Active</span>
        </span>
      </div>

      {/* Horizontal Carousel */}
      <div className="no-scrollbar -mx-4 sm:-mx-5 flex gap-3 overflow-x-auto px-4 sm:px-5 pt-3.5 pb-1 font-vibe">
        {REGULARS.map((reg) => (
          <div
            key={reg.handle}
            onClick={() => triggerHaptic("selection")}
            className="group relative flex w-36 shrink-0 flex-col items-center rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-center transition-all hover:border-primary/40 hover:bg-white/[0.05] active:scale-95 cursor-pointer"
          >
            {/* Avatar with status indicator */}
            <div className="relative mb-2">
              <CornerAvatar seed={reg.seed} size={44} />
              {reg.isOnline && (
                <span
                  className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#160e0e]"
                  title="Online"
                />
              )}
            </div>

            <p className="text-xs font-bold text-white tracking-tight truncate w-full group-hover:text-primary transition-colors">
              @{reg.handle}
            </p>

            <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
              <span>🔥</span>
              <span>{reg.streakDays}d streak</span>
            </span>

            <p className="mt-1.5 text-[10px] text-muted-foreground/75 leading-tight line-clamp-2">
              {reg.bio}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
