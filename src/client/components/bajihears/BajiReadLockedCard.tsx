import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Heart, Eye, ArrowRight, Zap } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BajiReadLockedCardProps {
  totalActions: number;
  actionsNeeded: number;
}

export function BajiReadLockedCard({ totalActions, actionsNeeded }: BajiReadLockedCardProps) {
  const percentage = Math.min(100, Math.max(0, (totalActions / 5) * 100));

  const handleInstantUnlock = () => {
    triggerHaptic("celebration");
    try {
      const raw = localStorage.getItem("baji:identity");
      const id = raw ? JSON.parse(raw) : {};
      if (!id.tabsUnlocked) id.tabsUnlocked = {};
      id.tabsUnlocked.read = true;
      id.totalActions = Math.max(id.totalActions ?? 0, 5);
      localStorage.setItem("baji:identity", JSON.stringify(id));
      window.location.reload();
    } catch {}
  };

  return (
    <div
      role="status"
      aria-label="Your Baji Read is forming"
      className="w-full max-w-md rounded-3xl border border-white/12 bg-gradient-to-b from-[#1c1511] via-[#140e0b] to-[#0d0906] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl text-foreground text-center relative overflow-hidden"
    >
      {/* Ambient Top Glow */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-48 opacity-25 blur-3xl rounded-full bg-[#E8552E]"
        aria-hidden
      />

      {/* Eyebrow */}
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-sans font-semibold tracking-wider uppercase text-[#E8552E]">
          <Eye className="size-3" />
          <span>2 MIN READ · PERSONALITY INSIGHT</span>
        </span>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#F5EFE9]">
        What do people secretly think of your personality?
      </h2>
      <p className="mt-2 text-xs sm:text-sm text-[#9C8F87] leading-relaxed font-sans px-2">
        Ever wonder what people whisper when you walk away? Your secret likes, midnight confessions, and silent double-taps reveal your archetype and social perception.
      </p>

      {/* Frosted Sneak Peek of the Archetype Card */}
      <div className="relative my-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left overflow-hidden">
        <div className="filter blur-[2.5px] select-none opacity-60 space-y-2 text-xs pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F5EFE9] text-sm">The 3AM Overthinker 🌙</span>
            <span className="text-[10px] text-amber-300 font-sans font-bold">96% Match</span>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold">
              <Eye className="size-3.5 shrink-0" />
              <span>How people secretly think of you:</span>
            </div>
            <p className="text-xs text-[#9C8F87] italic line-clamp-2">
              &ldquo;They assume you have an icy filter, but secretly wonder who holds you when you cry...&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
            <Heart className="size-3.5 shrink-0" />
            <span>What you secretly hide: Cared 10x more than you showed</span>
          </div>
        </div>

        {/* Lock Overlay (Restrained, no pulse) */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] p-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 mb-1.5">
            <Lock className="size-4" />
          </div>
          <span className="text-xs font-bold text-white">
            {actionsNeeded > 0
              ? `Read ${actionsNeeded} more ${actionsNeeded === 1 ? "confession" : "confessions"} to unlock`
              : "Ready to reveal"}
          </span>
          <span className="text-[11px] text-[#9C8F87] mt-0.5">
            Reveals your personality archetype
          </span>
        </div>
      </div>

      {/* Progress Bar with actionable label and clean white numbers */}
      <div className="space-y-2 text-left bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#F5EFE9] font-medium font-sans">Read 5 posts to unlock</span>
          <span className="font-sans font-bold tabular-nums text-white text-xs">
            {Math.min(5, totalActions)} of 5 completed
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={totalActions}
          aria-valuemin={0}
          aria-valuemax={5}
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-[#E8552E] transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-right text-[11px] text-[#9C8F87] font-sans">
          {actionsNeeded > 0
            ? "React on the Wall to reveal your personality archetype"
            : "Threshold reached! Forming your Read..."}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 space-y-2">
        <Link
          to="/"
          className="w-full rounded-xl bg-[#E8552E] hover:opacity-95 py-3 text-xs font-bold text-white shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Heart className="size-4 fill-current" />
          <span>Go React to Confessions on Wall</span>
          <ArrowRight className="size-4" />
        </Link>

        {/* Restrained Instant Unlock (subtle static highlight, no flashing/shimmer) */}
        <button
          type="button"
          onClick={handleInstantUnlock}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-center py-2.5 text-xs font-medium text-[#F5EFE9] transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <Zap className="size-3.5 text-amber-400" />
          <span>Instant Unlock Read</span>
        </button>
      </div>
    </div>
  );
}
