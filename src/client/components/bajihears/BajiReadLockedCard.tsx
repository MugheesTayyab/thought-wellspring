import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Heart, Lock, Zap } from "lucide-react";
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
      const identity = raw ? JSON.parse(raw) : {};
      if (!identity.tabsUnlocked) identity.tabsUnlocked = {};
      identity.tabsUnlocked.read = true;
      identity.totalActions = Math.max(identity.totalActions ?? 0, 5);
      localStorage.setItem("baji:identity", JSON.stringify(identity));
      window.location.reload();
    } catch {
      // Keep the locked state when local storage is unavailable.
    }
  };

  return (
    <section
      aria-labelledby="read-lock-title"
      className="w-full max-w-md border-l-2 border-primary bg-card p-6 text-center text-foreground sm:p-7"
    >
      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <Eye className="size-3.5" aria-hidden />2 min read · personality insight
      </p>
      <h2 id="read-lock-title" className="mt-3 font-display text-2xl font-semibold">
        Your pattern is taking shape.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Read and react to five confessions. Your choices reveal the archetype behind your Baji Read.
      </p>

      <div className="relative my-5 overflow-hidden rounded-lg border border-border bg-background p-4 text-left">
        <div className="pointer-events-none select-none space-y-2 text-xs opacity-30 blur-[3px]">
          <div className="flex justify-between gap-4">
            <strong className="text-sm">Your archetype</strong>
            <strong className="text-warn">Match forming</strong>
          </div>
          <p className="border-l border-border pl-3 text-muted-foreground">
            The way you respond points to how you protect your softest truths.
          </p>
          <p className="text-muted-foreground">A deeper insight appears here once it is ready.</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 p-3">
          <span className="mb-2 flex size-10 items-center justify-center rounded-full border border-border bg-muted text-warn">
            <Lock className="size-4" aria-hidden />
          </span>
          <strong className="text-sm">
            {actionsNeeded > 0
              ? `Read ${actionsNeeded} more ${actionsNeeded === 1 ? "confession" : "confessions"}`
              : "Ready to reveal"}
          </strong>
          <span className="mt-1 text-xs text-muted-foreground">
            Private until you choose to share it
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4 text-left">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-medium">Read 5 posts to unlock</span>
          <strong className="tabular-nums">{Math.min(5, totalActions)} of 5</strong>
        </div>
        <div
          role="progressbar"
          aria-label="Baji Read unlock progress"
          aria-valuenow={totalActions}
          aria-valuemin={0}
          aria-valuemax={5}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {actionsNeeded > 0 ? "React on the Wall to continue" : "Your Read is forming…"}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <Link
          to="/"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Heart className="size-4" aria-hidden />
          Go to the Wall
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={handleInstantUnlock}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <Zap className="size-4 text-warn" aria-hidden />
          Unlock this Read now
        </button>
      </div>
    </section>
  );
}
