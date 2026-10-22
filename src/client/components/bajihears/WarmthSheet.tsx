import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Flame, X, Sparkles, HeartHandshake, ShieldCheck } from "lucide-react";
import { AWARD_VALUES, DAILY_PASSIVE_CAP } from "@/shared/constants/warmth";
import type { WarmthLogEntry, DailyCapState, StreakState } from "@/shared/types/warmth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  totalWarmth: number;
  warmthLog: WarmthLogEntry[];
  dailyCap: DailyCapState;
  streak: StreakState;
  milestonesClaimed: number[];
  callSign: string | null;
  onUpdateCallSign: (name: string) => void;
  avatarSeed: string;
}

export const WarmthSheet = ({
  isOpen,
  onClose,
  totalWarmth,
  warmthLog,
  dailyCap,
  streak,
}: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = prior;
      window.removeEventListener("keydown", escape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const capProgress = Math.min(100, (dailyCap.amountEarned / DAILY_PASSIVE_CAP) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      role="presentation"
    >
      <button className="absolute inset-0" aria-label="Close Ember" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ember-title"
        className="motion-panel-in relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[2.2rem] border border-border bg-paper px-5 pb-10 pt-3.5 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />

        {/* Top Header */}
        <div className="mt-3.5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-coral" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
                Optional community points
              </p>
            </div>
            <h2 id="ember-title" className="mt-1 font-display text-2xl font-bold text-ink">
              Ember
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="tap-44 grid place-items-center rounded-full text-muted-foreground hover:text-ink transition-colors"
            aria-label="Close Ember details"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Section 1 | Summary Balance Card */}
        <div className="mt-4 rounded-3xl border border-amber-300/60 bg-butter/60 p-5">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 place-items-center rounded-2xl bg-coral text-white shadow-xs">
              <Flame className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Your Ember balance</p>
              <p className="font-display text-3xl font-bold text-ink">
                {totalWarmth.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
            A little thank-you for joining in. Ember quietly marks participation. It doesn't rank
            people, create pressure, or decide whose thoughts get heard.
          </p>
        </div>

        {/* Reassurance Banner */}
        <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl bg-cream/70 p-3.5 text-xs text-muted-foreground">
          <HeartHandshake className="size-4 text-coral shrink-0 mt-0.5" />
          <span>
            You're welcome here, with or without a streak. This is just an extra. The Wall is always yours to explore.
          </span>
        </div>

        {/* Section 2 | How it grows */}
        <section className="mt-6">
          <h3 className="font-display text-lg font-bold text-ink">Ways to earn Ember</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Earned naturally through ordinary interactions across BajiHears.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Share a thought", AWARD_VALUES.post],
              ["Leave an Echo", AWARD_VALUES.echo],
              ["React to a thought", AWARD_VALUES.react],
              ["Choose in a Duel", AWARD_VALUES.duel],
            ].map(([label, amount]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-border/80 bg-white/70 p-3.5 shadow-2xs"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-sans text-base font-bold text-coral">+{amount} Ember</p>
              </div>
            ))}
          </div>

          {/* Daily Passive Cap */}
          <div className="mt-3 rounded-2xl border border-border/80 bg-white/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-ink">
              <span>Reaction & Duel daily cap</span>
              <span className="font-bold tabular-nums text-coral">
                {dailyCap.amountEarned} / {DAILY_PASSIVE_CAP}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-coral transition-all duration-300"
                style={{ width: `${capProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Only passive React and Duel Ember counts toward this cap. It resets with each calendar day to keep things relaxed.
            </p>
          </div>
        </section>

        {/* Section 3 | Streak Information */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Daily visits</h3>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {streak.count} day{streak.count === 1 ? "" : "s"} visited
            </span>
          </div>

          <div className="mt-3 rounded-2xl border border-border/80 bg-white/60 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-ink">
              {streak.count > 0
                ? "You've checked in recently. Nice having you here."
                : "Your streak can start again whenever you like."}
            </p>
            <p className="mt-1">
              Never worry about missing a day. There are no penalties or broken streak alerts here.
            </p>
          </div>
        </section>

        {/* Section 4 | Recent Activity */}
        <section className="mt-6">
          <h3 className="font-display text-lg font-bold text-ink">Recent activity</h3>

          {warmthLog.length ? (
            <ul className="mt-3 divide-y divide-border-card rounded-2xl border border-border-card bg-white shadow-2xs">
              {warmthLog.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="text-ink text-xs font-medium">{entry.label}</span>
                  <span
                    className={`font-sans font-bold tabular-nums text-xs ${
                      entry.amount >= 0 ? "text-coral" : "text-muted-foreground"
                    }`}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-border-card p-5 text-center text-xs text-muted-foreground">
              Your Ember activity will appear here as you take part.
            </p>
          )}
        </section>
      </section>
    </div>,
    document.body,
  );
};
