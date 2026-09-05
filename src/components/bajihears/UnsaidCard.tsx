import { useState } from "react";
import { Share2, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REACTIONS,
  compactCount,
  relativeTime,
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

export function UnsaidCard({ unsaid, mine, onReact, onShare }: Props) {
  const [bounced, setBounced] = useState<ReactionKey | null>(null);
  const [openReplies, setOpenReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localReplies, setLocalReplies] = useState(unsaid.replies ?? []);

  const react = (key: ReactionKey) => {
    setBounced(key);
    window.setTimeout(() => setBounced(null), 300);
    onReact(unsaid.id, key);
  };

  return (
    <article className="grain bg-card border-hairline flex h-full flex-col rounded-lg border p-5">
      <header className="border-hairline flex items-center justify-between border-b pb-3">
        <span className="eyebrow">Unsaid #{unsaid.num}</span>
        <div className="flex items-center gap-2">
          {unsaid.featuredReel && (
            <span className="eyebrow text-primary">On reel</span>
          )}
          <span className="eyebrow">{relativeTime(unsaid.createdAt)}</span>
        </div>
      </header>

      <p className="font-display mt-4 text-balance text-[1.35rem] leading-[1.25]">
        {unsaid.text}
      </p>

      <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
        <span className={unsaid.handle ? "text-sand" : undefined}>
          {unsaid.handle ?? "Anonymous"}
        </span>
        {unsaid.mood && (
          <>
            <span aria-hidden>·</span>
            <span>{unsaid.mood}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{compactCount(totalReactions(unsaid))} reactions</span>
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-1.5">
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
                  "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs tabular-nums transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-hairline text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span
                  className={cn("text-sm", bounced === rx.key && "bounce-once inline-block")}
                >
                  {rx.emoji}
                </span>
                {compactCount(unsaid.reactions[rx.key])}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onShare(unsaid)}
            aria-label="Make a shareable card"
            className="text-muted-foreground hover:text-primary ml-auto p-1.5 transition-colors"
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
              {openReplies ? "Hide replies" : `${localReplies.length} replies`}
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
          <ul className="border-hairline mt-3 space-y-2 border-l pl-3">
            {localReplies.map((reply) => (
              <li key={reply.id} className="text-muted-foreground text-sm">
                <CornerDownRight className="mr-1 inline size-3" aria-hidden />
                {reply.text}
                <span className="ml-2 text-xs opacity-70">{reply.handle ?? "Anonymous"}</span>
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
              placeholder="Say something kind…"
              className="bg-secondary/50 border-hairline placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            />
            <button
              type="submit"
              className="border-primary/50 text-primary rounded-md border px-3 py-2 text-sm font-medium"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
