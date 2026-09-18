import React, { useState } from "react";
import { getTier } from "../../lib/warmth";

interface Giver {
  rank: number;
  callSign: string;
  warmth: number;
  badge: string;
  isUser?: boolean;
}

// Simulated real-feeling Top Givers list.
// PHASE 2 SUPABASE SYNC: Swap this static mock array with Supabase RPC `select top 10 from warmth_leaderboard`
const INITIAL_TOP_GIVERS: Omit<Giver, "rank">[] = [
  { callSign: "@lateshiftpoet", warmth: 4850, badge: "👑" },
  { callSign: "LahoreSoul", warmth: 3420, badge: "🔥" },
  { callSign: "SilentEchoes", warmth: 2890, badge: "🔥" },
  { callSign: "@aashir.writes", warmth: 2150, badge: "✨" },
  { callSign: "3amWhispers", warmth: 1680, badge: "✨" },
  { callSign: "MidnightDrifter", warmth: 1240, badge: "🌟" },
  { callSign: "QuietStorm99", warmth: 950, badge: "🌟" },
  { callSign: "VibeSeeker", warmth: 720, badge: "🪵" },
  { callSign: "AnonGiver_42", warmth: 480, badge: "🪵" },
];

interface TopGiversProps {
  userWarmth: number;
  userCallSign: string | null;
  onSaveCallSign: (callSign: string) => void;
}

export const TopGivers: React.FC<TopGiversProps> = ({
  userWarmth,
  userCallSign,
  onSaveCallSign,
}) => {
  const [editingCallSign, setEditingCallSign] = useState(false);
  const [inputVal, setInputVal] = useState(userCallSign ?? "");

  // Build combined list with user inserted at correct position
  const userNickname =
    userCallSign && userCallSign.trim() !== "" ? userCallSign.trim() : "You (Anonymous)";

  const userEntry: Omit<Giver, "rank"> = {
    callSign: userNickname,
    warmth: userWarmth,
    badge: getTier(userWarmth).key === "Bonfire" ? "👑" : "🔥",
    isUser: true,
  };

  const allGivers = [...INITIAL_TOP_GIVERS, userEntry].sort((a, b) => b.warmth - a.warmth);

  const rankedList: Giver[] = allGivers.map((g, idx) => ({
    ...g,
    rank: idx + 1,
  }));

  const userRankObj = rankedList.find((g) => g.isUser);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCallSign(inputVal.trim());
    setEditingCallSign(false);
  };

  return (
    <div className="space-y-4 text-left">
      {/* User Rank Header Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-black/40 to-black/80 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
              Your Leaderboard Status
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-white">{userNickname}</span>
              <button
                type="button"
                onClick={() => setEditingCallSign(!editingCallSign)}
                className="text-[11px] text-primary hover:underline"
              >
                {editingCallSign ? "cancel" : "edit handle"}
              </button>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-white/50">Current Rank</span>
            <div className="text-2xl font-extrabold font-mono text-amber-400">
              #{userRankObj?.rank ?? "-"}
            </div>
          </div>
        </div>

        {/* Edit Call-Sign Form */}
        {editingCallSign && (
          <form onSubmit={handleSave} className="mt-3 flex gap-2 pt-3 border-t border-white/10">
            <input
              type="text"
              maxLength={20}
              placeholder="e.g. @silentpoet or DarkHeart"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/80 transition-colors"
            >
              Save
            </button>
          </form>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 px-2">
          <span>Rank & Giver</span>
          <span>Warmth Earned</span>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {rankedList.map((giver) => {
            const tier = getTier(giver.warmth);
            return (
              <div
                key={`${giver.callSign}-${giver.rank}`}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all ${
                  giver.isUser
                    ? "border-primary/50 bg-primary/20 shadow-[0_0_15px_rgba(250,84,28,0.2)]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs font-bold w-6 text-center ${
                      giver.rank === 1
                        ? "text-amber-400 text-sm"
                        : giver.rank === 2
                          ? "text-slate-300"
                          : giver.rank === 3
                            ? "text-amber-600"
                            : "text-white/40"
                    }`}
                  >
                    {giver.rank === 1
                      ? "🥇"
                      : giver.rank === 2
                        ? "🥈"
                        : giver.rank === 3
                          ? "🥉"
                          : `#${giver.rank}`}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-xs text-white">
                      <span>{giver.callSign}</span>
                      {giver.isUser && (
                        <span className="rounded bg-primary/40 px-1 py-0.2 text-[9px] font-bold text-white">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">{tier.name} Tier</span>
                  </div>
                </div>

                <div className="font-mono text-xs font-bold text-primary flex items-center gap-1">
                  <span>{giver.warmth.toLocaleString()}</span>
                  <span>🔥</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
