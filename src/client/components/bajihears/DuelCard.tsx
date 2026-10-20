import type { Duel, DuelOption } from "@/shared/types/duel";
import { Check, Loader2 } from "lucide-react";
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
  const option = (item: DuelOption, index: 0 | 1) => {
    const selected = answeredState?.choiceIndex === index;
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
        className={`motion-note-in relative min-h-40 overflow-hidden rounded-3xl border p-5 text-left shadow-sm transition ${selected ? "border-coral bg-peach/45" : "border-border bg-paper hover:-translate-y-0.5 hover:border-coral/50"}`}
      >
        {showSplit && (
          <div
            className="absolute inset-y-0 left-0 bg-peach/45 motion-progress"
            style={{ width: `${percent}%` }}
          />
        )}
        <div className="relative flex h-full flex-col justify-between gap-5">
          <div>
            <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {index === 0 ? "A" : "B"}
              {item.category ? ` · ${item.category}` : ""}
            </span>
            <p className="mt-4 font-quote text-xl leading-7 text-ink">“{item.text}”</p>
          </div>
          <div className="flex min-h-6 items-center justify-between text-xs font-semibold text-muted-foreground">
            {answeredState ? (
              <span className={selected ? "text-coral" : ""}>
                {selected && <Check className="mr-1 inline size-4" />}
                {selected ? "Your choice" : ""}
              </span>
            ) : (
              <span>This feels closer</span>
            )}
            {showSplit && <span className="font-mono text-ink">{percent}%</span>}
            {isVoting && !answeredState && <Loader2 className="size-4 animate-spin" />}
          </div>
        </div>
      </button>
    );
  };
  return (
    <section className="w-full max-w-xl" aria-labelledby="duel-prompt">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
        Current Duel
      </p>
      <h2
        id="duel-prompt"
        className="mx-auto mt-2 max-w-md text-center font-display text-2xl font-bold text-ink"
      >
        {duel.prompt || "Which thought feels closer to you?"}
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Choose once. The community split appears after enough real votes arrive.
      </p>
      <div className="mt-6 grid gap-3">
        {option(duel.optionA, 0)}
        {option(duel.optionB, 1)}
      </div>
      {answeredState && (
        <div
          className="mt-5 rounded-2xl bg-butter/60 p-4 text-center text-sm text-ink"
          aria-live="polite"
        >
          {showSplit
            ? `${totalVotes} real choices are included in this split.`
            : "Your choice is in. The split stays private until at least 5 votes are recorded."}
        </div>
      )}
    </section>
  );
}
