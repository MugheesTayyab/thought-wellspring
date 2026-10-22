import { Link } from "@tanstack/react-router";
import { Check, Loader2, ArrowLeft, Sparkles } from "lucide-react";
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
        className={`motion-note-in relative min-h-[140px] w-full overflow-hidden rounded-3xl border p-5 sm:p-6 text-left transition-all duration-200 cursor-pointer ${
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

        <div className="relative flex h-full flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  isSelected
                    ? "bg-amber-200 text-amber-900"
                    : "bg-cream text-muted-foreground"
                }`}
              >
                {index === 0 ? "Option A" : "Option B"}
                {item.category ? ` · ${item.category}` : ""}
              </span>

              {item.handle && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.handle}
                </span>
              )}
            </div>

            <p className="mt-3.5 font-quote text-lg leading-relaxed text-ink sm:text-xl">
              “{item.text}”
            </p>
          </div>

          <div className="flex min-h-6 items-center justify-between border-t border-border/60 pt-3 text-xs font-semibold text-muted-foreground">
            {answeredState ? (
              <span className={isSelected ? "font-bold text-amber-900 flex items-center gap-1" : "text-muted-foreground"}>
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
              <span className="font-sans text-sm font-bold tabular-nums text-ink">
                {percent}%
              </span>
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
    <section className="w-full max-w-lg space-y-5" aria-labelledby="duel-heading">
      {/* Intro Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-butter/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
          <Sparkles className="size-3 text-amber-600" />
          <span>Today's Duel</span>
        </div>

        <h2
          id="duel-heading"
          className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {duel.prompt || "Which one is more you?"}
        </h2>

        <p className="mt-1.5 text-sm text-muted-foreground">
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
          className="paper-card motion-note-in mt-6 rounded-3xl border border-border bg-butter/50 p-5 text-center"
          aria-live="polite"
        >
          <p className="font-display text-base font-bold text-ink">
            {showSplit ? "Here's how people chose today." : "Your pick is in."}
          </p>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {showSplit
              ? `Based on ${totalVotes} real community choices.`
              : "Still early. There aren't enough picks to show a meaningful split yet."}
          </p>

          <div className="mt-4 pt-3 border-t border-border/70">
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
