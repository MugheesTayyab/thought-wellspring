import { Link } from "@tanstack/react-router";

export interface BajiReadLockedCardProps {
  totalActions: number;
  actionsNeeded: number;
}

export function BajiReadLockedCard({ totalActions, actionsNeeded }: BajiReadLockedCardProps) {
  const percentage = Math.min(100, Math.max(0, (totalActions / 5) * 100));

  return (
    <div
      role="status"
      aria-label="Your Baji Read is forming"
      className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-7 backdrop-blur-xl shadow-soft pop-in text-white"
    >
      {/* Centered Breathing Sparkle Icon */}
      <div className="flex justify-center">
        <span
          className="text-3xl sm:text-4xl select-none inline-block read-pulse"
          aria-hidden="true"
        >
          ✨
        </span>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="mt-3 text-center font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
        Your Baji Read is forming
      </h2>
      <p className="mt-1.5 text-center font-vibe text-xs sm:text-sm text-muted-foreground italic px-2">
        &ldquo;We&apos;re listening to what you vibe with. Keep going — your type is almost
        ready.&rdquo;
      </p>

      {/* Divider */}
      <div className="my-4 sm:my-5 h-px w-full bg-white/10" />

      {/* Progress Bar with ARIA */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-white/80">Progress</span>
          <span className="font-mono text-primary">{Math.min(5, totalActions)} / 5</span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={totalActions}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-label="Baji Read unlock progress"
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-brand-gradient transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-right text-[11px] text-white/50 font-vibe">
          {actionsNeeded > 0
            ? `${actionsNeeded} more action${actionsNeeded === 1 ? "" : "s"} to unlock your Read`
            : "Threshold reached! Refreshing your Read..."}
        </p>
      </div>

      {/* Divider */}
      <div className="my-4 sm:my-5 h-px w-full bg-white/10" />

      {/* How to Unlock Faster Section */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
          How to unlock faster
        </p>

        <div className="grid gap-1.5 sm:gap-2">
          <Link
            to="/duel"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3 text-xs font-medium text-white/90 hover:bg-white/[0.08] hover:border-primary/40 transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm" aria-hidden="true">
                ⚔️
              </span>
              <span>Answer a Duel</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-primary">+2 toward unlock</span>
          </Link>

          <Link
            to="/"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3 text-xs font-medium text-white/90 hover:bg-white/[0.08] hover:border-primary/40 transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm" aria-hidden="true">
                ❤️
              </span>
              <span>React to Unsaids</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-primary">+1 each</span>
          </Link>

          <Link
            to="/"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3 text-xs font-medium text-white/90 hover:bg-white/[0.08] hover:border-primary/40 transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm" aria-hidden="true">
                💬
              </span>
              <span>Send an Echo</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-primary">+1 each</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
