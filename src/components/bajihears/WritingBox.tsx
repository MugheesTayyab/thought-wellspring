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
  const [category, setCategory] = useState<Category>("Spill The Tea");
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
        <p className="text-primary text-[11px] tracking-widest uppercase font-bold">
          Your tea is live ☕
        </p>
        <p className="font-display mt-2 text-xl">
          Next drop unlocks in {formatCountdown(unlockAt! - now)}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          One drop per cycle. Keep reading The Wall while you wait.
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
    <section className="bg-gradient-to-b from-white/[0.04] to-transparent bg-card border-white/10 shadow-soft hover:border-white/20 rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all">
      <div>
        <div className="mb-2 flex flex-row gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-label={p.name}
              title={p.name}
              onClick={() => setPreset(p.key)}
              style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              className={cn(
                "size-4 rounded-full border transition-all",
                preset === p.key
                  ? "border-primary scale-110 ring-2 ring-primary/40"
                  : "border-white/20 opacity-70 hover:opacity-100",
              )}
            />
          ))}
        </div>
        <p className="text-muted-foreground/70 mb-2 text-[10px] tracking-wide font-medium">
          {PRESETS.find((p) => p.key === preset)!.name}
        </p>

        <textarea
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={2}
          placeholder="Spill your tea or quiet thoughts..."
          className="bg-white/[0.03] border-white/10 placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-primary/20 w-full resize-none rounded-2xl border p-3.5 text-base leading-relaxed outline-none focus:ring-2 transition-all font-vibe"
        />
        <div className={cn("mt-1.5 flex justify-end text-[11px] font-medium", counterTone)}>
          <span className="shrink-0 tabular-nums">
            {text.length}/{MAX_LEN}
          </span>
        </div>
      </div>

      {open && (
        <div className="pop-in mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 font-vibe">
            <button
              type="button"
              onClick={() => setAnonymous(true)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-95 min-h-[44px]",
                anonymous
                  ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground",
              )}
            >
              Anonymous
            </button>
            <button
              type="button"
              onClick={() => setAnonymous(false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-95 min-h-[44px]",
                !anonymous
                  ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground",
              )}
            >
              <Instagram className="size-4 shrink-0" aria-hidden />
              Instagram
            </button>
          </div>

          {!anonymous && (
            <div className="border-white/10 bg-white/[0.03] flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all font-vibe min-h-[44px]">
              <span className="text-primary/90 text-sm font-semibold">@</span>
              <input
                value={igHandle}
                onChange={(e) => setIgHandle(stripHandle(e.target.value).slice(0, 30))}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                aria-label="Your Instagram handle"
                className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </div>
          )}

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 font-vibe touch-pan-x">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95 min-h-[36px]",
                  category === c
                    ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
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
            "w-full rounded-2xl py-3 text-[15px] font-bold tracking-wide transition-opacity font-vibe min-h-[44px]",
            valid && !sending
              ? "bg-brand-gradient text-primary-foreground shadow-md"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {sending ? "spill in progress…" : "Spill it ☕"}
        </button>
      </div>
    </section>
  );
}
