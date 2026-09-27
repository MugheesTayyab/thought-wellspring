import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Compass, Swords, Lock, CheckCircle2, Circle, ArrowRight, Zap, X } from "lucide-react";
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
  const title = isDuel ? "The Duel is Locked" : "Baji Read is Locked";
  const subtitle = isDuel
    ? "Vote on provocative late-night dilemmas and see what percentage of people think like you."
    : "Baji uncovers your psychological archetype from what you read and react to. No quizzes, no forms.";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-b from-[#1c1212] via-[#120d0d] to-[#090606] p-6 text-foreground shadow-[0_0_50px_rgba(250,84,28,0.35)] animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-48 rounded-full bg-primary/25 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Locked Badge Icon */}
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-[#261512] to-black shadow-[0_0_25px_rgba(250,84,28,0.5)]">
          {isDuel ? (
            <Swords className="size-8 text-primary" />
          ) : (
            <Compass className="size-8 text-primary" />
          )}
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#0d0909] border border-primary/60 text-primary shadow-sm">
            <Lock className="size-3" />
          </div>
        </div>

        {/* Header Titles */}
        <div className="text-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            Feature Unlock
          </span>
          <h2 className="text-xl font-extrabold text-white mt-1 tracking-tight">{title}</h2>
          <p className="text-xs text-white/70 mt-1.5 leading-relaxed font-vibe">
            {subtitle}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="my-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-white/80">Your Activity</span>
            <span className="font-mono text-primary font-bold">
              {currentActions} / {targetActions} Actions
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-500 shadow-[0_0_10px_rgba(250,84,28,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Step Checklist */}
          <div className="mt-4 space-y-2 border-t border-white/8 pt-3 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              How to complete actions:
            </p>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Tap a reaction (Heart, Hug, Fire) on any post</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Add an anonymous Echo / comment to a thought</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Post your own anonymous confession</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-primary via-flame to-ember py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(250,84,28,0.4)] transition hover:opacity-95 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Explore The Feed & Unlock</span>
            <ArrowRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleInstantUnlock}
            className="w-full text-center py-2 text-[11px] font-semibold text-white/40 hover:text-primary transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Zap className="size-3" />
            <span>Tester Mode: Unlock Instantly</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
