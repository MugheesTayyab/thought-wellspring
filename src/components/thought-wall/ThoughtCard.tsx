import { useState } from "react";
import { Share2, ArrowBigUp, Film, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REACTIONS,
  compactCount,
  relativeTime,
  type ReactionKey,
  type Thought,
} from "@/lib/thought-wall";

type Props = {
  thought: Thought;
  mine: ReactionKey[];
  hero?: boolean;
  onReact: (id: string, key: ReactionKey) => void;
  onShare: (thought: Thought) => void;
};

export function ThoughtCard({ thought, mine, hero, onReact, onShare }: Props) {
  const [bounced, setBounced] = useState<ReactionKey | null>(null);
  const [openReplies, setOpenReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localReplies, setLocalReplies] = useState(thought.replies ?? []);

  const react = (key: ReactionKey) => {
    setBounced(key);
    window.setTimeout(() => setBounced(null), 320);
    onReact(thought.id, key);
  };

  return (
    <article
      className={cn(
        "pop-in relative rounded-2xl border p-5 shadow-soft",
        hero
          ? "bg-hero-gradient border-primary/40 shadow-glow px-5 py-7"
          : "bg-card border-border",
      )}
    >
      {hero && (
        <span className="bg-brand-gradient text-primary-foreground mb-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          🔥 Today&apos;s top
        </span>
      )}

      {thought.featuredReel && (
        <span className="border-primary/40 text-primary absolute top-4 right-4 rounded-full border px-2 py-0.5 text-[11px]">
          Featured on Reel 🎬
        </span>
      )}

      <p
        className={cn(
          "font-display text-balance",
          hero ? "text-center text-2xl leading-snug sm:text-3xl" : "text-lg leading-snug",
        )}
      >
        {thought.text}
      </p>

      <div
        className={cn(
          "text-muted-foreground mt-3 flex items-center gap-2 text-xs",
          hero && "justify-center",
        )}
      >
        <span>{thought.handle ? thought.handle : "anonymous"}</span>
        <span aria-hidden>·</span>
        <span>{relativeTime(thought.createdAt)}</span>
        {thought.mood && (
          <>
            <span aria-hidden>·</span>
            <span>{thought.mood}</span>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {REACTIONS.map((rx) => {
          const active = mine.includes(rx.key);
          return (
            <button
              key={rx.key}
              type="button"
              aria-label={rx.label}
              aria-pressed={active}
              onClick={() => react(rx.key)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("text-sm", bounced === rx.key && "bounce-once inline-block")}>
                {rx.emoji}
              </span>
              {compactCount(thought.reactions[rx.key])}
            </button>
          );
        })}

        <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
          <ArrowBigUp className="size-4" aria-hidden />
          {compactCount(thought.upvotes)}
        </span>

        <button
          type="button"
          onClick={() => onShare(thought)}
          aria-label="Make a shareable card"
          className="text-muted-foreground hover:text-primary p-1.5 transition-colors"
        >
          <Share2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        {localReplies.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenReplies((v) => !v)}
            className="text-primary"
          >
            {openReplies ? "hide replies" : `${localReplies.length} replies`}
          </button>
        )}
        <button
          type="button"
          onClick={() => setReplyOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          Reply
        </button>
      </div>

      {openReplies && (
        <ul className="border-border/70 mt-3 space-y-2 border-l pl-3">
          {localReplies.map((reply) => (
            <li key={reply.id} className="text-muted-foreground text-sm">
              <CornerDownRight className="mr-1 inline size-3" aria-hidden />
              {reply.text}
              <span className="ml-2 text-xs opacity-70">
                {reply.handle ?? "anonymous"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {replyOpen && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = replyText.trim();
            if (text.length < 2) return;
            setLocalReplies((prev) => [
              ...prev,
              { id: `local-${Date.now()}`, text, handle: null },
            ]);
            setReplyText("");
            setReplyOpen(false);
            setOpenReplies(true);
          }}
        >
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="say something kind…"
            className="bg-secondary/50 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-full border px-4 py-2 text-sm outline-none focus:ring-2"
          />
          <button
            type="submit"
            className="bg-brand-gradient text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold"
          >
            Send
          </button>
        </form>
      )}
    </article>
  );
}
