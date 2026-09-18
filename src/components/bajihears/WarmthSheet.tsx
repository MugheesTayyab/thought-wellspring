import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  getTier,
  getNextTier,
  GIFT_MILESTONES,
  generateClaimCode,
  DAILY_PASSIVE_CAP,
} from "../../lib/warmth";
import { WarmthLogEntry, DailyCapState, StreakState } from "../../lib/bajihears";
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md transition-opacity">
      {/* Click backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-[#120d0d] p-6 shadow-2xl text-white overflow-hidden animate-[slideUp_0.3s_ease-out_forwards]">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Warmth</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: currentTier.colorCss }}
              >
                {currentTier.name}
              </span>
            </h2>
            <p className="text-xs text-white/60">Your quiet impact on the wall</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 my-3">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`flex-1 pb-2.5 text-center text-xs font-semibold tracking-wide transition-colors ${
              activeTab === "stats"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            My Warmth
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rewards")}
            className={`flex-1 pb-2.5 text-center text-xs font-semibold tracking-wide transition-colors ${
              activeTab === "rewards"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            Rewards & Gifts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 pb-2.5 text-center text-xs font-semibold tracking-wide transition-colors ${
              activeTab === "leaderboard"
                ? "text-primary border-b-2 border-primary"
                : "text-white/50 hover:text-white"
            }`}
          >
            Top Givers 👑
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 py-2">
          {activeTab === "stats" && (
            <>
              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-black/40 to-black/80 p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-white/60">
                      Total Earned
                    </span>
                    <div className="text-3xl font-extrabold font-mono text-primary flex items-center gap-2">
                      {totalWarmth.toLocaleString()}
                      <span className="text-lg font-normal">🔥</span>
                    </div>
                  </div>

                  {/* Visit Streak */}
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-white/60">
                      Daily Streak
                    </span>
                    <div className="text-xl font-bold font-mono text-amber-400 flex items-center justify-end gap-1">
                      <span>⚡</span>
                      <span>{streak.count} Days</span>
                    </div>
                  </div>
                </div>

                {/* Tier Progress Bar */}
                {nextTier ? (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-white/70">
                      <span>
                        Tier: <strong className="text-white">{currentTier.name}</strong>
                      </span>
                      <span>
                        Next: <strong className="text-white">{nextTier.name}</strong> ({remaining}{" "}
                        left)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: currentTier.colorCss,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs font-semibold text-amber-400">
                    👑 Maximum Tier Reached: Bonfire Legend!
                  </div>
                )}
              </div>

              {/* Passive Daily Cap Bar */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/80 font-medium">Daily Reaction & Duel Cap</span>
                  <span className="font-mono text-white/60">
                    {dailyCap.amountEarned} / {DAILY_PASSIVE_CAP} Warmth
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
                <p className="text-[11px] text-white/50">
                  Posting tea (+10) and adding echoes (+3) are never capped!
                </p>
              </div>

              {/* Activity Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Recent Warmth Log
                </h3>
                {warmthLog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
                    No Warmth earned yet. React to a post or answer a duel to get started!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
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
                Earn Warmth to unlock exclusive digital badges, wallpaper packs, and physical
                sticker gifts!
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
