import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Flame, Heart, MessageCircle, Coffee, Gift, Crown, Award, X } from "lucide-react";
import { getTier, getNextTier, generateClaimCode } from "@/shared/utils";
import { GIFT_MILESTONES, DAILY_PASSIVE_CAP } from "@/shared/constants/warmth";
import type { WarmthLogEntry, DailyCapState, StreakState } from "@/shared/types/warmth";
import { TopGivers } from "./TopGivers";

interface WarmthSheetProps {
  isOpen: boolean;
  onClose: () => void;
  totalWarmth: number;
  warmthLog: WarmthLogEntry[];
  dailyCap: DailyCapState;
  streak: StreakState;
  milestonesClaimed: number[];
  callSign: string | null;
  onUpdateCallSign: (name: string) => void;
  avatarSeed: string;
}

export const WarmthSheet: React.FC<WarmthSheetProps> = ({
  isOpen,
  onClose,
  totalWarmth,
  warmthLog,
  dailyCap,
  streak,
  milestonesClaimed,
  callSign,
  onUpdateCallSign,
  avatarSeed,
}) => {
  const [activeTab, setActiveTab] = useState<"stats" | "leaderboard" | "rewards">("stats");

  if (!isOpen) return null;

  const currentTier = getTier(totalWarmth);
  const { nextTier, remaining, progressPct } = getNextTier(totalWarmth);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md transition-opacity">
      {/* Click backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/12 bg-[#17110D]/95 p-5 shadow-2xl backdrop-blur-2xl text-[#F5EFE9] overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Drag handle */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#F5EFE9] flex items-center gap-2 font-display">
              <span>Gossip Karma & Warmth</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: currentTier.colorCss }}
              >
                {currentTier.name} Aura
              </span>
            </h2>
            <p className="text-xs text-[#9C8F87] font-sans">
              Your secret tea points & wall reputation ☕
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="rounded-full p-1.5 text-[#9C8F87] hover:bg-white/10 hover:text-[#F5EFE9] transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 5-SECOND EXPLANATION CARD (Super clear, trendy & relatable for girls) */}
        <div className="mt-3 rounded-2xl border border-[#E8552E]/30 bg-gradient-to-br from-[#E8552E]/15 via-primary/10 to-transparent p-3.5 font-sans shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="size-4 text-[#E8552E] shrink-0" />
            <h3 className="text-xs font-bold text-[#F5EFE9] tracking-tight">
              What is Warmth? Your Tea Points ☕✨
            </h3>
          </div>
          <p className="text-[11px] text-[#F5EFE9]/90 leading-relaxed">
            Think of Warmth like your <strong className="text-[#E8552E]">gossip karma</strong>. Every time you spill feelings, hype someone's confession with ❤️, or drop an echo, your aura levels up!
          </p>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="rounded-xl bg-white/[0.04] p-1.5 border border-white/[0.06]">
              <p className="text-[#9C8F87]">☕ Spill Tea</p>
              <p className="font-mono font-bold text-[#E8552E] mt-0.5">+10 pts</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-1.5 border border-white/[0.06]">
              <p className="text-[#9C8F87]">💬 Leave Echo</p>
              <p className="font-mono font-bold text-[#E8552E] mt-0.5">+3 pts</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-1.5 border border-white/[0.06]">
              <p className="text-[#9C8F87]">❤️ Hype Wall</p>
              <p className="font-mono font-bold text-[#E8552E] mt-0.5">+1 pt</p>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9C8F87]">
            <span>💅 <strong>Perk:</strong> Unlocks your personality Read & 10-day streak gets followed by Baji on Insta! 👑</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 my-3 font-sans text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`flex-1 pb-2.5 text-center font-semibold tracking-wide transition-colors cursor-pointer ${
              activeTab === "stats"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            My Karma & Aura ✨
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rewards")}
            className={`flex-1 pb-2.5 text-center font-semibold tracking-wide transition-colors cursor-pointer ${
              activeTab === "rewards"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            Perks & Badges 🎁
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 pb-2.5 text-center font-semibold tracking-wide transition-colors cursor-pointer ${
              activeTab === "leaderboard"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            Wall VIPs 👑
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-1 font-sans">
          {activeTab === "stats" && (
            <>
              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-black/40 to-black/80 p-4.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">
                      Total Tea Points
                    </span>
                    <div className="text-3xl font-extrabold font-mono text-primary flex items-center gap-2 mt-0.5">
                      {totalWarmth.toLocaleString()}
                      <span className="text-lg font-normal">🔥</span>
                    </div>
                  </div>

                  {/* Visit Streak */}
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">
                      Daily Streak
                    </span>
                    <div className="text-xl font-bold font-mono text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                      <span>⚡</span>
                      <span>{streak.count} Days</span>
                    </div>
                  </div>
                </div>

                {/* Tier Progress Bar */}
                {nextTier ? (
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex justify-between text-xs text-white/70">
                      <span>
                        Aura: <strong className="text-white">{currentTier.name}</strong>
                      </span>
                      <span>
                        Next Rank: <strong className="text-white">{nextTier.name}</strong> ({remaining}{" "}
                        pts left)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(232,85,46,0.6)]"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: currentTier.colorCss,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3.5 text-xs font-semibold text-amber-400">
                    👑 Maximum Tier Reached: Bonfire Legend!
                  </div>
                )}
              </div>

              {/* Passive Daily Cap Bar */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/80 font-medium">Daily Tap Limit (Resets midnight 🕛)</span>
                  <span className="font-mono text-white/60">
                    {dailyCap.amountEarned} / {DAILY_PASSIVE_CAP} pts
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-primary/80 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (dailyCap.amountEarned / DAILY_PASSIVE_CAP) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-white/50 leading-tight">
                  Tapping reactions caps at 30/day to prevent spam. Spilling tea (+10) and echoes (+3) are always unlimited!
                </p>
              </div>

              {/* Activity Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Recent Karma Log
                </h3>
                {warmthLog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/40">
                    No points yet. Go double-tap any confession on the wall or vote on a duel to start!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {warmthLog.slice(0, 15).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-mono font-bold">+{entry.amount}</span>
                          <span className="text-white/80">{entry.label}</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "rewards" && (
            <div className="space-y-4">
              <p className="text-xs text-white/70">
                Collect Warmth to unlock exclusive digital badges, secret wallpaper packs, and VIP gifts!
              </p>

              <div className="space-y-3">
                {GIFT_MILESTONES.map((m) => {
                  const unlocked = totalWarmth >= m.threshold;
                  const claimed = milestonesClaimed.includes(m.threshold);
                  const code = generateClaimCode(m.threshold, avatarSeed);

                  return (
                    <div
                      key={m.threshold}
                      className={`relative rounded-xl border p-4 transition-all ${
                        unlocked
                          ? "border-primary/40 bg-gradient-to-r from-primary/10 to-transparent"
                          : "border-white/10 bg-white/[0.02] opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{m.badgeEmoji}</span>
                          <div>
                            <h4 className="font-bold text-sm text-white flex items-center gap-2">
                              {m.title}
                              <span className="text-xs font-mono text-primary">
                                ({m.threshold} Warmth)
                              </span>
                            </h4>
                            <p className="text-xs text-white/70 mt-0.5">{m.reward}</p>
                          </div>
                        </div>

                        {unlocked ? (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-white/40">LOCKED</span>
                        )}
                      </div>

                      {unlocked && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">Your Claim Code:</span>
                            <code className="font-mono font-bold text-primary bg-black/60 px-2 py-0.5 rounded border border-primary/30">
                              {code}
                            </code>
                          </div>
                          <p className="text-[11px] text-white/50">{m.claimInstruction}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <TopGivers
              userWarmth={totalWarmth}
              userCallSign={callSign}
              onSaveCallSign={onUpdateCallSign}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
