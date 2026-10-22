import { Bookmark, BookmarkCheck, Check, Copy, Share2, Sparkles, ArrowLeft, HeartHandshake } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ArchetypeDefinition } from "@/client/lib/bajiRead";

export function BajiReadCard({
  archetype,
  evidenceSummary,
  saved,
  copied,
  isSample = false,
  onSave,
  onCopy,
  onShare,
}: {
  archetype: ArchetypeDefinition;
  evidenceSummary: string;
  saved: boolean;
  copied: boolean;
  isSample?: boolean;
  onSave: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  return (
    <article
      className="w-full space-y-6"
      aria-labelledby="read-archetype-name"
    >
      {/* Act 1 | Reveal & Top Fold */}
      <section className="paper-card motion-note-in relative overflow-hidden p-6 sm:p-8">
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: archetype.color }}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-lilac" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lilac">
              {isSample ? "Sample Read · Preview" : "Your Baji Read"}
            </p>
          </div>
          <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            ~2 min read
          </span>
        </div>

        {/* Character Symbol & Archetype Title */}
        <div className="mt-6 flex items-start gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-xs"
            style={{ backgroundColor: `${archetype.color}15`, color: archetype.color }}
            aria-hidden
          >
            {archetype.emoji}
          </div>
          <div>
            <h2
              id="read-archetype-name"
              className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {archetype.name}
            </h2>
            <p
              className="mt-1 text-sm font-semibold tracking-wide"
              style={{ color: archetype.color }}
            >
              {archetype.tagline}
            </p>
          </div>
        </div>

        {/* The Core Hook */}
        <div className="mt-6 rounded-2xl border-l-4 border-coral bg-cream/70 p-4">
          <p className="font-quote text-lg leading-relaxed text-ink sm:text-xl">
            “{archetype.hookLine}”
          </p>
        </div>

        {/* Evidence / Activity Transparency */}
        <div className="mt-5 rounded-xl border border-border/70 bg-paper/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-bold uppercase tracking-wider text-ink/75">
            {isSample ? "Why this sample exists: " : "Inspired by your activity: "}
          </span>
          {evidenceSummary}
        </div>
      </section>

      {/* Act 2 | Familiar Patterns */}
      <section className="paper-card motion-note-in p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
          Act II · What tends to catch your eye
        </p>
        <h3 className="mt-2 font-display text-xl font-bold text-ink">
          The subtle rhythm you return to
        </h3>
        <p className="mt-3 text-[15px] leading-7 text-ink/85">
          {archetype.opening}
        </p>
        <p className="mt-3 text-[15px] leading-7 text-ink/85">
          {archetype.pattern}
        </p>
      </section>

      {/* Act 3 | Your Little Contrasts */}
      <section className="paper-card motion-note-in rounded-3xl border border-border bg-lilac/30 p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lilac">
          Act III · Contrasts you might relate to
        </p>
        <h3 className="mt-2 font-display text-xl font-bold text-ink">
          The two sides that coexist
        </h3>
        <div className="mt-4 rounded-2xl border border-border/80 bg-white/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            You might relate to…
          </p>
          <p className="mt-2 text-[15px] leading-7 text-ink/90">
            {archetype.contrast}
          </p>
        </div>
      </section>

      {/* Act 4 | A Quiet Reflection */}
      <section className="paper-card motion-note-in p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <HeartHandshake className="size-4 text-coral" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
            Act IV · A quiet thought for today
          </p>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-ink">
          A moment for yourself
        </h3>
        <p className="mt-3 font-quote text-lg leading-relaxed text-ink/90">
          “{archetype.reflectionPrompt}”
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          No scores, percentages, or personality labels here. Just a peaceful prompt to hold for a beat.
        </p>
      </section>

      {/* Act 5 | Close, Share & Return */}
      <section className="paper-card motion-note-in p-6 sm:p-7 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Act V · The Closing Note
        </p>
        <h3 className="mt-2 font-display text-2xl font-bold text-ink">
          {archetype.closing}
        </h3>
        <p className="mt-3 text-sm italic text-muted-foreground">
          Take what fits. Leave what doesn't.
        </p>

        {/* Action Button Grid */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onSave}
            className="tap-44 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-foreground transition hover:bg-cream"
          >
            {saved ? (
              <BookmarkCheck className="size-4 text-coral" />
            ) : (
              <Bookmark className="size-4 text-muted-foreground" />
            )}
            {saved ? "Saved" : "Save Read"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="tap-44 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-foreground transition hover:bg-cream"
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground" />
            )}
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="tap-44 flex items-center justify-center gap-1.5 rounded-xl bg-coral text-xs font-bold text-white shadow-xs transition hover:bg-coral-dark"
          >
            <Share2 className="size-4" />
            Share card
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Back to the Wall
          </Link>
        </div>
      </section>
    </article>
  );
}
