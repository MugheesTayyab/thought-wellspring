import React, { useState } from "react";
import { createPortal } from "react-dom";
import type { GiftMilestone as GiftMilestoneType } from "@/shared/types/warmth";
import { generateClaimCode } from "@/shared/utils";
import { Check, Copy } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  if (!milestone) return null;

  const claimCode = generateClaimCode(milestone.threshold, avatarSeed);

  const copyCode = () => {
    try {
      navigator.clipboard?.writeText(claimCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]"
      onClick={onClaim}
    >
      <div
        className="w-full max-w-[270px] rounded-3xl border border-white/10 bg-[#17110D]/90 p-4 text-center shadow-2xl backdrop-blur-2xl font-sans text-[#F5EFE9] animate-[scaleUp_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Icon Badge */}
        <div className="mx-auto mb-2.5 flex size-9 items-center justify-center rounded-xl bg-[#E8552E]/10 border border-[#E8552E]/25 text-base select-none">
          {milestone.badgeEmoji}
        </div>

        {/* Header */}
        <h2 className="text-sm font-bold text-[#F5EFE9] leading-tight">
          {milestone.title}
        </h2>
        <p className="text-[11px] text-[#9C8F87] mt-0.5">
          {milestone.threshold} warmth unlocked
        </p>

        {/* Minimal Reward Box */}
        <div className="my-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-left space-y-1.5">
          <p className="text-[11px] text-[#F5EFE9]/85 leading-snug">{milestone.reward}</p>

          <div className="flex items-center justify-between rounded-lg bg-black/40 px-2 py-1 border border-white/10">
            <span className="font-mono text-xs font-semibold text-[#E8552E]">{claimCode}</span>
            <button
              type="button"
              onClick={copyCode}
              className="text-[10px] font-medium text-[#9C8F87] hover:text-[#F5EFE9] flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-2.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-2.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClaim}
          type="button"
          className="w-full rounded-xl bg-[#E8552E] py-2 text-xs font-semibold text-white shadow-md transition hover:opacity-95 active:scale-98 cursor-pointer"
        >
          Keep Spilling
        </button>
      </div>
    </div>,
    document.body,
  );
};
