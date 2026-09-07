import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  LOCKOUT_MS,
  MAX_LEN,
  MIN_LEN,
  PRESETS,
  formatCountdown,
  type Category,
} from "@/lib/bajihears";

type Props = {
  lastSubmitAt: number | null;
  myHandle: string | null;
  onSubmit: (input: {
    text: string;
    handle: string | null;
    category: Category;
    preset: string;
  }) => void;
  onUnlock: () => void;
};

export function WritingBox({ lastSubmitAt, myHandle, onSubmit, onUnlock }: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [category, setCategory] = useState<Category>("Confession");
  const [preset, setPreset] = useState(PRESETS[0]!.key);
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
        <p className="text-primary text-xs tracking-widest uppercase">Your Unsaid is live</p>
        <p className="font-display mt-3 text-2xl">
          Next one unlocks in {formatCountdown(unlockAt! - now)}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          One per cycle. Keep scrolling The Wall while you wait.
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

  const open = focused || text.length > 0;
  const valid = text.trim().length >= MIN_LEN;

  return (
    <section className="bg-card border-border rounded-2xl border p-5 shadow-soft">
      <div className="flex gap-3">
        <div className="flex flex-col gap-2 pt-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-label={p.name}
              title={p.name}
              onClick={() => setPreset(p.key)}
              style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              className={cn(
                "size-5 rounded-full border transition-transform",
                preset === p.key ? "border-primary scale-110" : "border-border/60",
              )}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onFocus={() => setFocused(true)}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            placeholder="Your words matter"
            className="bg-secondary/40 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full resize-none rounded-xl border p-4 text-base leading-snug outline-none focus:ring-2"
          />
          <div className={cn("mt-1 flex items-center justify-between text-xs", counterTone)}>
            <span className="text-muted-foreground">{PRESETS.find((p) => p.key === preset)!.name}</span>
            <span>
              {text.length}/{MAX_LEN}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className="pop-in mt-3 space-y-3">
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
              Anonymous
            </button>
            {myHandle && (
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
                Post as {myHandle}
              </button>
            )}
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                  category === c
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
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
              handle: anonymous ? null : myHandle,
              category,
              preset,
            });
            setSending(false);
            setText("");
            setFocused(false);
            setAnonymous(true);
          }, 400);
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
