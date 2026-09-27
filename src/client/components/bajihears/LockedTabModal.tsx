import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Compass, Swords, Lock, ArrowRight, Zap, X, Sparkles, Heart, Eye } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { clearBajiReadCache } from "@/client/lib/bajiRead";

interface LockedTabModalProps {
  type: "read" | "duel" | null;
  onClose: () => void;
  onUnlocked?: () => void;
}

export const LockedTabModal: React.FC<LockedTabModalProps> = ({
  type,
  onClose,
  onUnlocked,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!type || typeof document === "undefined") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [type]);

  if (!type) return null;

  const identity = getOrCreateIdentity();
  const currentActions = identity.totalActions ?? 0;
  const targetActions = type === "duel" ? 3 : 5;
  const needed = Math.max(0, targetActions - currentActions);
  const progressPercent = Math.min(100, Math.round((currentActions / targetActions) * 100));

  const isDuel = type === "duel";

  const handleInstantUnlock = () => {
    triggerHaptic("celebration");
    const id = getOrCreateIdentity();
    if (!id.tabsUnlocked) {
      id.tabsUnlocked = { duel: false, read: false };
    }
    if (isDuel) {
      id.tabsUnlocked.duel = true;
      id.totalActions = Math.max(id.totalActions ?? 0, 3);
    } else {
      id.tabsUnlocked.read = true;
      id.totalActions = Math.max(id.totalActions ?? 0, 5);
      clearBajiReadCache();
    }
    try {
      localStorage.setItem("baji:identity", JSON.stringify(id));
      sessionStorage.setItem("baji:read-visited", "1");
    } catch {}
    if (onUnlocked) onUnlocked();
    onClose();
    navigate({ to: isDuel ? "/duel" : "/read" });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] rounded-3xl border border-white/12 bg-gradient-to-b from-[#1f1712]/95 via-[#17110D]/95 to-[#100b08]/98 p-5 text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-[scaleUp_0.2s_ease-out] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 size-40 opacity-20 blur-2xl rounded-full"
          style={{
            background: isDuel
              ? "radial-gradient(circle, #f97316 0%, transparent 70%)"
              : "radial-gradient(circle, #E8552E 0%, transparent 70%)",
          }}
          aria-hidden
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-10 rounded-full p-1.5 text-[#9C8F87] hover:text-[#F5EFE9] hover:bg-white/10 transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Eyebrow Pill: Only for Read modal, Duel Arena badge removed */}
        {!isDuel && (
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-sans font-semibold tracking-wider uppercase text-[#E8552E]">
              <Eye className="size-2.5" />
              2 MIN READ · PERSONALITY INSIGHT
            </span>
          </div>
        )}

        {/* Header Icon + Title */}
        <div className="text-center">
          <h2 className="text-base sm:text-lg font-bold text-[#F5EFE9] tracking-tight font-display">
            {isDuel
              ? "Today's Dilemma"
              : "What do people secretly think of your personality?"}
          </h2>
          <p className="text-xs text-[#9C8F87] mt-1 leading-relaxed font-sans px-1">
            {isDuel
              ? "Vote on controversial dilemmas and see where everyone stands."
              : "Ever wonder what people whisper when you walk away? Your secret likes, midnight confessions, and silent double-taps reveal your archetype and social perception."}
          </p>
        </div>

        {/* Sneak-Peek Frosted Teaser Card (For Read Tab) */}
        {!isDuel && (
          <div className="relative mt-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left overflow-hidden">
            {/* Blurry Teaser Content */}
            <div className="filter blur-[2px] select-none opacity-60 space-y-2 text-xs pointer-events-none">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F5EFE9]">The 3AM Overthinker 🌙</span>
                <span className="text-[10px] text-amber-300 font-sans font-bold">96% Match</span>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-1.5 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-semibold">
                  <Eye className="size-3 shrink-0" />
                  <span>How people secretly think of you:</span>
                </div>
                <p className="text-[11px] text-[#9C8F87] italic line-clamp-2">
                  &ldquo;They assume you have an icy filter, but secretly wonder who holds you when you cry...&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                <Heart className="size-3 shrink-0" />
                <span>What you secretly hide: Cared 10x more than you showed</span>
              </div>
            </div>

            {/* Restrained Lock Overlay (No Flashing/Pulse) */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] p-2 text-center">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 mb-1">
                <Lock className="size-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {needed > 0
                  ? `Read ${needed} more ${needed === 1 ? "confession" : "confessions"} to unlock`
                  : "Ready to decode"}
              </span>
              <span className="text-[10px] text-[#9C8F87] mt-0.5">
                Unlocks your personality archetype
              </span>
            </div>
          </div>
        )}

        {/* Actionable Progress Tracker (Specific instruction + clean white counter) */}
        <div className="my-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#F5EFE9] font-medium font-sans">
              {isDuel ? "Vote in 3 duels to unlock" : "Read 5 posts to unlock"}
            </span>
            <span className="font-sans font-bold tabular-nums text-white text-xs">
              {currentActions} of {targetActions} completed
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#E8552E] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-[#9C8F87] font-sans">
            {isDuel
              ? "React to 3 unsaids on the Wall to enter the voting pool."
              : `Tap ❤️ on ${needed} more confessions to reveal your personality archetype.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#E8552E] py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Heart className="size-3.5 fill-current" />
            <span>Go Tap Reactions on Wall</span>
            <ArrowRight className="size-3.5" />
          </button>

          {/* Restrained Instant Unlock (subtle static highlight, no flashing/shimmer) */}
          <button
            type="button"
            onClick={handleInstantUnlock}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-center py-2.5 text-xs font-medium text-[#F5EFE9] transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Zap className="size-3.5 text-amber-400" />
            <span>Instant Unlock {isDuel ? "Duel" : "Read"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
