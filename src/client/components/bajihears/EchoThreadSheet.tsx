import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { cn, relativeTime, stripHandle } from "@/shared/utils";
import { detectProfanity } from "@/shared/lib/profanity";
import type { Unsaid } from "@/shared/types/unsaid";

type Props = {
  open: boolean;
  post: Unsaid;
  myHandle: string | null;
  onClose: () => void;
  onEcho: (postId: string, text: string, handle: string | null) => Promise<void>;
  onReportEcho: (echoId: string) => Promise<string>;
};

export function EchoThreadSheet({ open, post, myHandle, onClose, onEcho, onReportEcho }: Props) {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const profanity = useMemo(() => detectProfanity(text), [text]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const send = async () => {
    const clean = text.trim();
    if (!clean || clean.length > 200 || profanity.hasProfanity || sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    const chosenHandle = anonymous || !myHandle?.trim() ? null : myHandle.trim();
    try {
      await onEcho(post.id, clean, chosenHandle);
      setText("");
      setSent(true);
      window.setTimeout(() => setSent(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message && !message.includes("Unexpected") && !message.includes("fetch")) {
        setError(message);
      } else {
        setError("Couldn't send your Echo right now. Your draft is preserved below.");
      }
    } finally {
      setSending(false);
    }
  };

  const report = async (echoId: string) => {
    if (reportedIds.includes(echoId) || echoId.startsWith("pending-")) return;
    setReportingId(echoId);
    setReportMessage(null);
    try {
      const message = await onReportEcho(echoId);
      setReportedIds((ids) => [...ids, echoId]);
      setReportMessage(message);
    } catch (reportError) {
      setReportMessage(
        reportError instanceof Error ? reportError.message : "Couldn't send that report just yet.",
      );
    } finally {
      setReportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-foreground/30 sm:items-center sm:justify-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`echo-title-${post.id}`}
        className="flex h-[min(92dvh,880px)] w-full flex-col rounded-t-[28px] border border-border-card bg-background shadow-2xl sm:max-w-xl sm:rounded-[28px]"
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-border-card px-4 sm:px-5">
          <div>
            <h2 id={`echo-title-${post.id}`} className="text-lg font-semibold text-foreground">
              Echoes
            </h2>
            <p className="text-xs text-muted-foreground">Responses to this thought</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close Echoes"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <article className="rounded-[22px] border border-primary/20 bg-[#FFF9F6] p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              {post.sourceType === "editorial" ? (
                <span className="font-semibold text-[#7D3028]">
                  BajiHears Original · Fictional Story
                </span>
              ) : (
                <span>{post.handle ? `@${stripHandle(post.handle)}` : "Anonymous"}</span>
              )}
              <span>{post.category}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[18px] leading-7 text-foreground">
              {post.text}
            </p>
          </article>

          <div className="mt-5 flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">
              {post.echoes.length} {post.echoes.length === 1 ? "Echo" : "Echoes"}
            </h3>
          </div>

          {post.echoes.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border-card p-5 text-center text-sm text-muted-foreground">
              No Echoes yet. You can leave one if you like.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {post.echoes.map((echo) => {
                const pending = echo.id.startsWith("pending-");
                const reported = reportedIds.includes(echo.id);
                return (
                  <li
                    key={echo.id}
                    className={cn(
                      "rounded-2xl border border-border-card bg-card p-3.5",
                      pending && "opacity-65",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {echo.handle ? `@${stripHandle(echo.handle)}` : "Anonymous"} ·{" "}
                          {relativeTime(echo.createdAt)}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {echo.text}
                        </p>
                      </div>
                      {!pending && (
                        <button
                          type="button"
                          onClick={() => report(echo.id)}
                          disabled={reported || reportingId === echo.id}
                          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60"
                          aria-label={reported ? "Echo reported" : "Report this Echo"}
                        >
                          {reportingId === echo.id ? (
                            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Flag className="size-3.5" aria-hidden />
                          )}
                          <span>{reported ? "Reported" : "Report"}</span>
                        </button>
                      )}
                    </div>
                    {pending && <p className="mt-1 text-xs text-muted-foreground">Sending…</p>}
                  </li>
                );
              })}
            </ul>
          )}

          {reportMessage && (
            <p
              role="status"
              className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-foreground"
            >
              {reportMessage}
            </p>
          )}
        </div>

        <footer className="shrink-0 border-t border-border-card bg-background px-4 pb-[calc(.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-5">
          <label
            htmlFor={`echo-input-${post.id}`}
            className="text-sm font-semibold text-foreground"
          >
            Want to leave an Echo?
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A kind word, a thought of your own, or just a small response.
          </p>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              id={`echo-input-${post.id}`}
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 200))}
              rows={2}
              placeholder="Write an Echo…"
              className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-border-card bg-card px-3.5 py-3 text-base leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() || profanity.hasProfanity || sending}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white disabled:bg-secondary disabled:text-muted-foreground"
              aria-label="Send Echo"
            >
              {sending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setAnonymous(true)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold",
                  anonymous ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Anonymous
              </button>
              <button
                type="button"
                onClick={() => myHandle && setAnonymous(false)}
                disabled={!myHandle}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold",
                  !anonymous ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  !myHandle && "opacity-45",
                )}
              >
                {myHandle ? `@${stripHandle(myHandle)}` : "No handle set"}
              </button>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{text.length}/200</span>
          </div>
          {(error || profanity.hasProfanity) && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {profanity.hasProfanity ? "Please revise that before sending." : error}
            </p>
          )}
          {sent && (
            <p role="status" className="mt-2 text-xs font-medium text-[#426548]">
              Your Echo is here.
            </p>
          )}
        </footer>
      </section>
    </div>
  );
}
