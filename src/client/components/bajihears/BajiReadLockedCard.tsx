import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";

export function BajiReadLockedCard({
  totalActions,
  actionsNeeded,
}: {
  totalActions: number;
  actionsNeeded: number;
}) {
  const progress = Math.min(100, (totalActions / 5) * 100);
  return (
    <section
      className="paper-card motion-note-in w-full p-6 sm:p-8"
      aria-labelledby="read-forming-title"
    >
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-butter text-ink">
        <Lock className="size-5" />
      </div>
      <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
        A playful reflection
      </p>
      <h2
        id="read-forming-title"
        className="mt-2 text-center font-display text-2xl font-bold text-ink"
      >
        Your Read is still forming
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-muted-foreground">
        Explore naturally by reacting, leaving an Echo, choosing in Duel, or sharing a thought. This
        is not a personality test.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-cream/70 p-4">
        <div className="flex justify-between text-xs font-semibold">
          <span>Activity gathered</span>
          <span>{Math.min(totalActions, 5)} of 5</span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={totalActions}
          aria-valuemax={5}
          aria-valuemin={0}
        >
          <div
            className="h-full rounded-full bg-coral motion-progress"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {actionsNeeded} more {actionsNeeded === 1 ? "activity" : "activities"} before there is
          enough context.
        </p>
      </div>
      <Link
        to="/"
        className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral px-4 text-sm font-bold text-white"
      >
        Explore the Wall <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
