import React from "react";
import { createPortal } from "react-dom";
import type { GiftMilestone as GiftMilestoneType } from "@/shared/types/warmth";
import { generateClaimCode } from "@/shared/utils";

interface GiftMilestoneModalProps {
  milestone: GiftMilestoneType | null;
  avatarSeed: string;
  onClaim: () => void;
}

export const GiftMilestoneModal: React.FC<GiftMilestoneModalProps> = ({
  milestone,
  avatarSeed,
  onClaim,
}) => {
  if (!milestone) return null;

  const claimCode = generateClaimCode(milestone.threshold, avatarSeed);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/50 bg-gradient-to-b from-[#1c1212] via-[#120d0d] to-black p-6 text-center shadow-[0_0_50px_rgba(250,84,28,0.4)] animate-[scaleUp_0.3s_ease-out]">
        {/* Glow backdrop effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-primary/30 blur-3xl pointer-events-none" />

        {/* Emoji Badge Burst */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/20 to-black text-4xl shadow-[0_0_25px_rgba(250,84,28,0.6)] animate-bounce">
          {milestone.badgeEmoji}
        </div>

        {/* Header */}
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
          Milestone Unlocked!
        </h3>
        <h2 className="text-2xl font-extrabold text-white mt-1">{milestone.title}</h2>
        <p className="text-xs font-medium text-amber-400 mt-0.5 font-mono">
          Reached {milestone.threshold} Warmth Points 🔥
        </p>

        {/* Reward Box */}
        <div className="my-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left space-y-2">
          <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Reward
          </div>
          <div className="text-sm font-bold text-white leading-snug">{milestone.reward}</div>

          <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
            <div className="text-[10px] text-white/60">Claim Code</div>
            <div className="flex items-center justify-between rounded-lg bg-black/80 px-3 py-1.5 border border-primary/40 font-mono text-sm font-extrabold text-primary">
              <span>{claimCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(claimCode);
                }}
                className="text-[10px] font-sans font-semibold text-white/70 hover:text-white"
              >
                Copy
              </button>
            </div>
          </div>
          <p className="text-[10px] text-white/40">{milestone.claimInstruction}</p>
        </div>

        {/* Button */}
        <button
          onClick={onClaim}
          type="button"
          className="w-full rounded-2xl bg-gradient-to-r from-primary via-flame to-ember py-3 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-95"
        >
          Claim Reward & Keep Glowing 🔥
        </button>
      </div>
    </div>,
    document.body,
  );
};
