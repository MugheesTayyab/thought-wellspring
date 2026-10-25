import { Link } from "@tanstack/react-router";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import type { Duel, DuelOption } from "@/shared/types/duel";
import { triggerHaptic } from "@/client/lib/haptics";

export function DuelCard({
  duel,
  answeredState,
  totalVotes,
  isVoting,
  onAnswer,
}: {
  duel: Duel;
  answeredState: { choiceIndex: 0 | 1; pctA: number; pctB: number } | null;
  totalVotes: number;
  isVoting: boolean;
  onAnswer: (choice: 0 | 1) => void;
}) {
  const showSplit = Boolean(answeredState && totalVotes >= 5);

  const renderOption = (item: DuelOption, index: 0 | 1) => {
    const isSelected = answeredState?.choiceIndex === index;
    const percent = index === 0 ? answeredState?.pctA : answeredState?.pctB;

    return (
      <button
        key={item.id}
        type="button"
        disabled={Boolean(answeredState) || isVoting}
        onClick={() => {
          triggerHaptic("selection");
          onAnswer(index);
        }}
        className={`duel-option relative w-full overflow-hidden rounded-2xl border p-3 sm:p-4 text-left transition-colors cursor-pointer ${
          isSelected
            ? "border-amber-400/90 bg-amber-50/70 shadow-sm"
            : answeredState
              ? "border-border/80 bg-paper/60 opacity-80"
              : "border-border-card bg-paper shadow-xs hover:-translate-y-0.5 hover:border-amber-400/60 active:scale-[0.99]"
        }`}
        aria-pressed={isSelected}
        aria-label={`Option ${index === 0 ? "A" : "B"}: ${item.text}`}
      >
        {/* Visual Progress Fill (after vote, if split available) */}
        {showSplit && (
          <div
            className="absolute inset-y-0 left-0 bg-amber-200/40 motion-progress transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        )}

        <div className="relative flex h-full flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold max-w-[70%] truncate ${
                  isSelected ? "bg-amber-200 text-amber-900" : "bg-cream text-muted-foreground"
                }`}
              >
                <span className="shrink-0">{index === 0 ? "Option A" : "Option B"}</span>
                {item.category ? <span className="truncate">&nbsp;· {item.category}</span> : ""}
              </span>

              {item.handle && (
                <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[30%] text-right">
                  {item.handle}
                </span>
              )}
            </div>

            <p className="duel-option-text mt-2 font-quote text-base leading-snug text-ink sm:text-lg">
              “{item.text}”
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs font-semibold text-muted-foreground">
            {answeredState ? (
              <span
                className={
                  isSelected
                    ? "font-bold text-amber-900 flex items-center gap-1"
                    : "text-muted-foreground"
                }
              >
                {isSelected ? (
                  <>
                    <Check className="size-4 text-amber-600" />
                    <span>Your choice today</span>
                  </>
                ) : (
                  <span>Other thought</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                <span>Tap if this feels closer</span>
              </span>
            )}

            {showSplit && (
              <span className="font-sans text-sm font-bold tabular-nums text-ink">{percent}%</span>
            )}

            {isVoting && !answeredState && (
              <Loader2 className="size-4 animate-spin text-amber-600" />
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <section className="duel-content w-full max-w-lg space-y-3" aria-labelledby="duel-heading">
      {/* Intro Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-butter/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
          <span>Today's Duel</span>
        </div>

        <h2
          id="duel-heading"
          className="mt-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
        >
          {duel.prompt || "Which one is more you?"}
        </h2>

        <p className="duel-description mt-1 text-xs text-muted-foreground">
          Two thoughts. Pick the one that feels closer today.
        </p>
      </div>

      {/* Stacked Cards with Delicate "or" Divider */}
      <div className="space-y-3">
        {renderOption(duel.optionA, 0)}

        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <span className="relative rounded-full border border-border bg-paper px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            or
          </span>
        </div>

        {renderOption(duel.optionB, 1)}
      </div>

      {/* Post-Choice Result Banner */}
      {answeredState && (
        <div
          className="duel-result rounded-2xl border border-border bg-butter/50 p-3 text-center"
          aria-live="polite"
        >
          <p className="font-display text-base font-bold text-ink">
            {showSplit ? "Here's how people chose today." : "Your pick is in."}
          </p>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {showSplit
              ? `Based on ${totalVotes} real community choices.`
              : "Results appear after five votes."}
          </p>

          <div className="mt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Back to the Wall
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
