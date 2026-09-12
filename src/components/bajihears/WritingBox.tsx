import { useEffect, useMemo, useState } from "react";
import { Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  LOCKOUT_MS,
  MAX_LEN,
  MIN_LEN,
  PRESETS,
  formatCountdown,
  stripHandle,
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
  const [igHandle, setIgHandle] = useState(myHandle ? stripHandle(myHandle) : "");
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
      <section className="bg-hero-gradient border-primary/30 rounded-3xl border p-5 text-center">
        <p className="text-primary text-[11px] tracking-widest uppercase">Your Unsaid is live</p>
        <p className="font-display mt-2 text-xl">
          Next one unlocks in {formatCountdown(unlockAt! - now)}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          One per cycle. Keep scrolling The Wall while you wait.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          className="text-muted-foreground/70 mt-3 text-[11px] underline"
        >
          (demo: reset the lock)
        </button>
      </section>
    );
  }

  const open = focused || text.length > 0;
  const cleanIg = stripHandle(igHandle);
  const valid = text.trim().length >= MIN_LEN && (anonymous || cleanIg.length >= 2);

  return (
    <section className="bg-card border-border rounded-3xl border p-4 shadow-soft">
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
                "size-4 rounded-full border transition-transform",
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
            rows={2}
            placeholder="Your words matter"
            className="bg-secondary/40 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full resize-none rounded-2xl border p-3 text-[15px] leading-snug outline-none focus:ring-2"
          />
          <div className={cn("mt-1 flex items-center justify-between text-[11px]", counterTone)}>
            <span className="text-muted-foreground truncate">
              {PRESETS.find((p) => p.key === preset)!.name}
            </span>
            <span className="shrink-0 tabular-nums">
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
                "rounded-2xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                anonymous
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              Anonymous
            </button>
            <button
              type="button"
              onClick={() => setAnonymous(false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                !anonymous
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              <Instagram className="size-4 shrink-0" aria-hidden />
              Instagram
            </button>
          </div>

          {!anonymous && (
            <div className="border-border bg-secondary/40 flex items-center gap-1 rounded-2xl border px-3 py-2">
              <span className="text-muted-foreground text-sm">@</span>
              <input
                value={igHandle}
                onChange={(e) => setIgHandle(stripHandle(e.target.value).slice(0, 30))}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                aria-label="Your Instagram handle"
                className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          )}

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px]",
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
              handle: anonymous ? null : `@${cleanIg}`,
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
          "mt-3 w-full rounded-2xl py-3 text-[15px] font-semibold transition-opacity",
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
