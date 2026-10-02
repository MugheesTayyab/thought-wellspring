import React from "react";
import { Flame } from "lucide-react";
import { getTier, getNextTier } from "@/shared/utils";

interface WarmthOrbProps {
  totalWarmth: number;
  isFlashing?: boolean;
  mini?: boolean;
  onClick?: () => void;
  className?: string;
}

export const WarmthOrb: React.FC<WarmthOrbProps> = ({
  totalWarmth,
  isFlashing = false,
  mini = false,
  onClick,
  className = "",
}) => {
  const currentTier = getTier(totalWarmth);
  const { progressPct } = getNextTier(totalWarmth);

  if (mini) {
    return (
      <button
        onClick={onClick}
        type="button"
        suppressHydrationWarning
        className={`group relative flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs transition-colors hover:border-primary/60 ${className}`}
        aria-label={`View Warmth: ${totalWarmth} points, ${currentTier.name} tier`}
      >
        <Flame className={`size-4 text-primary ${isFlashing ? "bounce-once" : ""}`} aria-hidden />
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span suppressHydrationWarning className="tabular-nums text-primary">
            {totalWarmth.toLocaleString()}
          </span>
          <span suppressHydrationWarning className="font-semibold text-muted-foreground">
            {currentTier.name}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg p-2 text-foreground transition-colors hover:bg-muted ${className}`}
      aria-label={`View Warmth: ${totalWarmth} points, ${currentTier.name} tier`}
    >
      <Flame className={`size-5 text-primary ${isFlashing ? "bounce-once" : ""}`} aria-hidden />
      <span suppressHydrationWarning className="text-xs font-bold tabular-nums">
        {totalWarmth}
      </span>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full bg-primary" style={{ width: `${progressPct}%` }} />
      </span>
    </button>
  );
};
