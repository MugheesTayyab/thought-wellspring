import { Bookmark, BookmarkCheck, Check, Copy, Share2 } from "lucide-react";
import type { ArchetypeDefinition } from "@/client/lib/bajiRead";

export function BajiReadCard({
  archetype,
  evidenceSummary,
  saved,
  copied,
  onSave,
  onCopy,
  onShare,
}: {
  archetype: ArchetypeDefinition;
  evidenceSummary: string;
  saved: boolean;
  copied: boolean;
  onSave: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  return (
    <article
      className="paper-card motion-note-in relative w-full overflow-hidden p-6 sm:p-8"
      aria-labelledby="read-title"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: archetype.color }} />
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">
        Your Baji Read · about 2 minutes
      </p>
      <div className="mt-7 text-4xl" aria-hidden>
        {archetype.emoji}
      </div>
      <h2 id="read-title" className="mt-3 font-display text-3xl font-bold leading-tight text-ink">
        {archetype.name}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: archetype.color }}>
        {archetype.tagline}
      </p>
      <p className="mt-6 border-l-2 border-coral pl-4 font-quote text-xl leading-8 text-ink">
        “{archetype.hookLine}”
      </p>
      <div className="mt-7 space-y-7 text-[15px] leading-7 text-ink/85">
        <section>
          <h3 className="font-display text-lg font-bold text-ink">The opening note</h3>
          <p className="mt-2">{archetype.opening}</p>
        </section>
        <section>
          <h3 className="font-display text-lg font-bold text-ink">A familiar pattern</h3>
          <p className="mt-2">{archetype.pattern}</p>
        </section>
        <section className="rounded-2xl bg-lilac/60 p-4">
          <h3 className="font-display text-lg font-bold text-ink">The gentle contrast</h3>
          <p className="mt-2">{archetype.contrast}</p>
        </section>
        <section>
          <h3 className="font-display text-lg font-bold text-ink">A note to keep</h3>
          <p className="mt-2 font-medium">{archetype.closing}</p>
        </section>
      </div>
      <div className="mt-7 rounded-2xl border border-border bg-cream/70 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Why this appeared
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{evidenceSummary}</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        This is a playful editorial reflection from your activity here—not a diagnosis, score, or
        claim about what other people think.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onSave}
          className="tap-44 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-xs font-semibold"
        >
          {saved ? (
            <BookmarkCheck className="size-4 text-coral" />
          ) : (
            <Bookmark className="size-4" />
          )}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="tap-44 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-xs font-semibold"
        >
          {copied ? <Check className="size-4 text-sage" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="tap-44 flex items-center justify-center gap-1.5 rounded-xl bg-coral text-xs font-bold text-white"
        >
          <Share2 className="size-4" />
          Share
        </button>
      </div>
    </article>
  );
}
