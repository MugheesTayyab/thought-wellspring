import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Compass, Swords, Lock, CheckCircle2, ArrowRight, Zap, X } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";
import { getOrCreateIdentity } from "@/client/lib/identity";

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
  const progressPercent = Math.min(100, Math.round((currentActions / targetActions) * 100));

  const isDuel = type === "duel";
  const title = isDuel ? "The Duel unlocks in 3 actions" : "Baji Read unlocks in 5 actions";
  const subtitle = isDuel
    ? "Vote on dilemmas or react on the Wall to join the community voting pool."
    : "Baji decodes your psychological vibe from what you react to. No quizzes.";

  const handleInstantUnlock = () => {
    triggerHaptic("success");
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
    }
    try {
      localStorage.setItem("baji:identity", JSON.stringify(id));
    } catch {}
    if (onUnlocked) onUnlocked();
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[320px] rounded-3xl border border-white/10 bg-[#17110D]/90 p-5 text-foreground shadow-2xl backdrop-blur-2xl animate-[scaleUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 rounded-full p-1 text-[#9C8F87] hover:text-[#F5EFE9] hover:bg-white/10 transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Locked Badge Icon */}
        <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#E8552E]/10 border border-[#E8552E]/25 text-[#E8552E]">
          {isDuel ? (
            <Swords className="size-6" />
          ) : (
            <Compass className="size-6" />
          )}
          <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#17110D] border border-white/10 text-[#E8552E]">
            <Lock className="size-2.5" />
          </div>
        </div>

        {/* Header Titles */}
        <div className="text-center">
          <h2 className="text-base sm:text-lg font-bold text-[#F5EFE9] tracking-tight font-display">{title}</h2>
          <p className="text-xs text-[#9C8F87] mt-1 leading-relaxed font-sans">
            {subtitle}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="my-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-[#9C8F87]">Progress</span>
            <span className="font-mono text-[#E8552E] font-bold">
              {currentActions} / {targetActions}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#E8552E] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Step Checklist */}
          <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-2.5">
            <div className="flex items-center gap-2 text-xs text-[#F5EFE9]/85">
              <CheckCircle2 className="size-3 text-[#E8552E] shrink-0" />
              <span>Tap ❤️ on confessions</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#F5EFE9]/85">
              <CheckCircle2 className="size-3 text-[#E8552E] shrink-0" />
              <span>Drop an anonymous 💬 Echo reply</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#E8552E] py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Explore The Feed</span>
            <ArrowRight className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={handleInstantUnlock}
            className="w-full text-center py-1.5 text-[11px] font-medium text-[#9C8F87]/60 hover:text-[#E8552E] transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Zap className="size-3" />
            <span>Tester: Unlock Instantly</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
