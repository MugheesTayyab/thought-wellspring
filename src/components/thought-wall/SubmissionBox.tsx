import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LOCKOUT_MS,
  MAX_LEN,
  MIN_LEN,
  formatCountdown,
  stripHandle,
} from "@/lib/thought-wall";

type Props = {
  lastSubmitAt: number | null;
  onSubmit: (input: { text: string; handle: string | null; email: string | null }) => void;
  onUnlock: () => void;
};

export function SubmissionBox({ lastSubmitAt, onSubmit, onUnlock }: Props) {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const unlockAt = lastSubmitAt ? lastSubmitAt + LOCKOUT_MS : null;
  const locked = unlockAt !== null && unlockAt > now;

  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [locked]);

  const counterTone = useMemo(() => {
    if (text.length >= 275) return "text-destructive";
    if (text.length >= 250) return "text-warn";
    return "text-muted-foreground";
  }, [text.length]);

  if (locked) {
    return (
      <section className="bg-hero-gradient border-primary/30 rounded-2xl border p-6 text-center">
        <p className="text-primary text-xs tracking-widest uppercase">Your thought is live</p>
        <p className="font-display mt-3 text-2xl">
          Next one unlocks in {formatCountdown(unlockAt! - now)}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          One a day. It keeps them honest. While you wait, see what others are saying.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          className="text-muted-foreground/70 mt-4 text-[11px] underline"
        >
          (demo: reset the lock)
        </button>
      </section>
    );
  }

  const valid = text.trim().length >= MIN_LEN && (anonymous || stripHandle(handle).length > 1);

  return (
    <section className="bg-card border-border rounded-2xl border p-5 shadow-soft">
      <h2 className="text-lg">Say it here.</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Nobody has to know it was you.
      </p>

      <div className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={3}
          placeholder="What did you never get to say…"
          className="bg-secondary/40 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full resize-none rounded-xl border p-4 text-base leading-snug outline-none focus:ring-2"
        />
        <div className={cn("mt-1 text-right text-xs", counterTone)}>
          {text.length}/{MAX_LEN}
        </div>
      </div>

      {text.trim().length > 0 && (
        <div className="pop-in mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAnonymous(true)}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                anonymous
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              Post anonymous
            </button>
            <button
              type="button"
              onClick={() => setAnonymous(false)}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                !anonymous
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              Tag my @handle
            </button>
          </div>

          {!anonymous && (
            <input
              value={handle}
              onChange={(e) => setHandle(stripHandle(e.target.value))}
              placeholder="yourhandle"
              className="bg-secondary/40 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
            />
          )}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Want us to tell you if this gets featured? (optional)"
            className="bg-transparent border-border/60 text-muted-foreground placeholder:text-muted-foreground/60 focus:ring-ring w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2"
          />
        </div>
      )}

      <button
        type="button"
        disabled={!valid || sending}
        onClick={() => {
          setSending(true);
          window.setTimeout(() => {
            onSubmit({
              text: text.trim(),
              handle: anonymous ? null : `@${stripHandle(handle)}`,
              email: email.trim() || null,
            });
            setSending(false);
            setText("");
            setHandle("");
            setEmail("");
            setAnonymous(true);
          }, 450);
        }}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 text-base font-semibold transition-opacity",
          valid && !sending
            ? "bg-brand-gradient text-primary-foreground"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {sending ? "letting it out…" : "Say it."}
      </button>
    </section>
  );
}
