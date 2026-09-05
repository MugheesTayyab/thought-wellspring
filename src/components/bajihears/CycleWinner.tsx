import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REACTIONS,
  compactCount,
  formatCountdown,
  nextCycleAt,
  totalReactions,
  type ReactionKey,
  type Unsaid,
} from "@/lib/bajihears";

type Props = {
  unsaid: Unsaid;
  mine: ReactionKey[];
  onReact: (id: string, key: ReactionKey) => void;
  onShare: (unsaid: Unsaid) => void;
};

export function CycleWinner({ unsaid, mine, onReact, onShare }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      aria-labelledby="cycle-heading"
      className="grain bg-card border-hairline ring-ember shadow-lift relative overflow-hidden rounded-lg border px-6 py-9 text-center sm:px-10 sm:py-12"
    >
      <div className="ember-rule absolute inset-x-0 top-0 h-px" aria-hidden />

      <p id="cycle-heading" className="eyebrow text-primary">
        This cycle&apos;s unsaid
      </p>

      <blockquote className="font-display mx-auto mt-5 max-w-2xl text-balance text-[1.75rem] leading-[1.2] sm:text-[2.4rem]">
        {unsaid.text}
      </blockquote>

      <p className="text-muted-foreground mt-4 text-xs">
        Unsaid #{unsaid.num} · {unsaid.handle ?? "Anonymous"} ·{" "}
        {compactCount(totalReactions(unsaid))} reactions
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
        {REACTIONS.map((rx) => {
          const active = mine.includes(rx.key);
          return (
            <button
              key={rx.key}
              type="button"
              aria-label={rx.label}
              aria-pressed={active}
              onClick={() => onReact(unsaid.id, rx.key)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs tabular-nums transition-colors",
                active
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-hairline text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-sm">{rx.emoji}</span>
              {compactCount(unsaid.reactions[rx.key])}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onShare(unsaid)}
          className="border-hairline text-muted-foreground hover:text-primary flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
        >
          <Share2 className="size-3.5" aria-hidden />
          Share card
        </button>
      </div>

      <div className="border-hairline mt-8 border-t pt-5">
        <p className="eyebrow">Next reveal in</p>
        <p className="font-mono mt-2 text-xl tracking-[0.14em] tabular-nums sm:text-2xl">
          {formatCountdown(nextCycleAt(now) - now)}
        </p>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-xs leading-relaxed">
          Every 12 hours, the most-felt unsaid of the window is revealed here. Nothing else on
          BajiHears is ranked.
        </p>
      </div>
    </section>
  );
}
