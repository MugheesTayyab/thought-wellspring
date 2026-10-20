import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Flame, X } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-sm"
      role="presentation"
    >
      <button className="absolute inset-0" aria-label="Close Ember" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ember-title"
        className="motion-panel-in relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-border bg-paper px-5 pb-8 pt-3 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="mt-3 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
              Optional activity counter
            </p>
            <h2 id="ember-title" className="mt-1 font-display text-2xl font-bold text-ink">
              Ember
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="tap-44 grid place-items-center rounded-full"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5 rounded-3xl bg-butter/65 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-coral text-white">
              <Flame className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Ember</p>
              <p className="font-display text-3xl font-bold text-ink">
                {totalWarmth.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Ember quietly marks participation. It does not rank people, unlock promised gifts, or
            affect whose thoughts are heard.
          </p>
        </div>
        <section className="mt-6">
          <h3 className="font-display text-lg font-bold">How it grows</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Share a thought", AWARD_VALUES.post],
              ["Leave an Echo", AWARD_VALUES.echo],
              ["React", AWARD_VALUES.react],
              ["Choose in Duel", AWARD_VALUES.duel],
            ].map(([label, amount]) => (
              <div key={String(label)} className="rounded-2xl border border-border bg-cream/55 p-3">
                <p className="text-muted-foreground">{label}</p>
                <p className="mt-1 font-bold text-coral">+{amount} Ember</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-border p-4">
            <div className="flex justify-between text-xs font-semibold">
              <span>Reaction + Duel daily cap</span>
              <span>
                {dailyCap.amountEarned} / {DAILY_PASSIVE_CAP}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="motion-progress h-full rounded-full bg-coral"
                style={{ width: `${capProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Only passive React and Duel Ember counts toward this cap. It resets with the device’s
              calendar day.
            </p>
          </div>
        </section>
        <section className="mt-6">
          <div className="flex items-end justify-between">
            <h3 className="font-display text-lg font-bold">Recent activity</h3>
            <span className="text-xs text-muted-foreground">
              Visit count: {streak.count} day{streak.count === 1 ? "" : "s"}
            </span>
          </div>
          {warmthLog.length ? (
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
              {warmthLog.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="text-ink">{entry.label}</span>
                  <span
                    className={`font-mono font-bold ${entry.amount >= 0 ? "text-coral" : "text-muted-foreground"}`}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              Your Ember activity will appear here.
            </p>
          )}
        </section>
      </section>
    </div>,
    document.body,
  );
};
