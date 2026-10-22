import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, BookOpen, Heart, Eye } from "lucide-react";

export function BajiReadLockedCard({
  totalActions,
  actionsNeeded,
  onPreviewSample,
}: {
  totalActions: number;
  actionsNeeded: number;
  onPreviewSample?: () => void;
}) {
  const currentCount = Math.min(totalActions, 5);
  const progress = Math.min(100, (currentCount / 5) * 100);

  return (
    <section
      className="paper-card motion-note-in w-full p-6 sm:p-8 text-center"
      aria-labelledby="read-intro-heading"
    >
      {/* Editorial Glyph & Eyebrow */}
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-lilac/30 text-lilac">
        <Sparkles className="size-6" />
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-lilac">
        Baji Read · A Playful Reflection
      </p>

      <h2
        id="read-intro-heading"
        className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
      >
        A little read, just for fun.
      </h2>

      <p className="mx-auto mt-2.5 max-w-sm text-sm leading-6 text-ink/80">
        A playful take on the patterns you leave behind when you explore the Wall.
      </p>

      {/* Soft Disclaimer */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs text-muted-foreground">
        <span>For reflection, not a personality diagnosis.</span>
      </div>

      {/* Progress & Eligibility Box */}
      <div className="mt-6 rounded-2xl border border-border/80 bg-paper/60 p-5 text-left">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span>Thoughts & choices explored</span>
          <span className="font-bold tabular-nums text-coral">
            {currentCount} of 5
          </span>
        </div>

        <div
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-border/60"
          role="progressbar"
          aria-valuenow={currentCount}
          aria-valuemax={5}
          aria-valuemin={0}
        >
          <div
            className="h-full rounded-full bg-coral transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {actionsNeeded > 0
            ? `${actionsNeeded} more small interaction${actionsNeeded === 1 ? "" : "s"} before there is enough context to shape your reflection.`
            : "You have enough activity to shape your reflection."}
        </p>

        {/* What Counts Guide */}
        <div className="mt-4 pt-3.5 border-t border-border/70 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Heart className="size-3 text-coral shrink-0" />
            <span>React to a thought</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3 text-coral shrink-0" />
            <span>Choose in Duel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-coral shrink-0" />
            <span>Leave an Echo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="size-3 text-coral shrink-0" />
            <span>Explore Wall thoughts</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Reading without posting is always valued here. You'll never be pressured to write vulnerable secrets to unlock a read.
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        {onPreviewSample && (
          <button
            type="button"
            onClick={onPreviewSample}
            className="tap-44 flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-xs font-bold text-ink shadow-xs transition hover:bg-cream"
          >
            <Sparkles className="size-3.5 text-lilac" />
            Preview a sample Read
          </button>
        )}
        <Link
          to="/"
          className="tap-44 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs transition hover:bg-coral-dark"
        >
          Explore the Wall <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
