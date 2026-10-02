import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Instagram, Send, ShieldCheck } from "lucide-react";
import { cn, formatCountdown, stripHandle } from "@/shared/utils";
import type { Category } from "@/shared/types/unsaid";
import { CATEGORIES } from "@/shared/constants/categories";
import { LOCKOUT_MS, MAX_LEN, MIN_LEN } from "@/shared/constants/cycle";
import { PRESETS } from "@/shared/constants/presets";
import { triggerHaptic } from "@/client/lib/haptics";
import { detectProfanity } from "@/shared/lib/profanity";

type Props = {
  lastSubmitAt: number | null;
  myHandle: string | null;
  onSubmit: (input: {
    text: string;
    handle: string | null;
    category: Category;
    preset: string;
  }) => void | Promise<unknown>;
  onUnlock: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export function WritingBox({
  lastSubmitAt,
  myHandle,
  onSubmit,
  onUnlock,
  isSubmitting = false,
  submitError = null,
}: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [igHandle, setIgHandle] = useState(myHandle ? stripHandle(myHandle) : "");
  const [category, setCategory] = useState<Category>("Spill The Tea");
  const [preset, setPreset] = useState(PRESETS[0]!.key);
  const [localSending, setLocalSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const sending = isSubmitting || localSending;

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
  const profanityCheck = useMemo(() => detectProfanity(text), [text]);

  if (locked) {
    return (
      <section className="border-l-2 border-primary bg-card p-5 sm:p-6" aria-live="polite">
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="size-4" aria-hidden />
          <span>Your post is live</span>
        </div>
        <p className="font-quote text-xl font-semibold text-foreground sm:text-2xl">
          It is on the wall now.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You can write again in{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCountdown(unlockAt! - now)}
          </span>
          .
        </p>
      </section>
    );
  }

  const open = focused || text.length > 0;
  const cleanIg = stripHandle(igHandle);
  const valid =
    text.trim().length >= MIN_LEN &&
    !profanityCheck.hasProfanity &&
    (anonymous || cleanIg.length >= 2);

  // SVG circular progress calculation
  const ringCircumference = 44; // 2 * PI * 7 ≈ 43.98
  const progressRatio = Math.min(1, text.length / MAX_LEN);
  const ringOffset = ringCircumference - progressRatio * ringCircumference;
  const ringColor =
    text.length >= 275
      ? "var(--color-destructive)"
      : text.length >= 250
        ? "var(--color-warn)"
        : "var(--color-primary)";

  return (
    <section
      className="border-l-2 border-primary bg-card p-4 sm:p-6"
      aria-labelledby="write-heading"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your turn</p>
          <h2 id="write-heading" className="mt-1 font-display text-2xl font-medium sm:text-3xl">
            What went unsaid?
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Anonymous by default</span>
      </div>
      <div>
        <div className="mb-2 flex flex-row gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-label={p.name}
              title={p.name}
              onClick={() => {
                triggerHaptic("selection");
                setPreset(p.key);
              }}
              style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              className={cn(
                "size-4 rounded-full border transition-all cursor-pointer",
                preset === p.key
                  ? "border-primary scale-110 ring-2 ring-primary/40"
                  : "border-white/20 opacity-70 hover:opacity-100",
              )}
            />
          ))}
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {PRESETS.find((p) => p.key === preset)!.name}
        </p>

        <label htmlFor="unsaid-text" className="sr-only">
          Your Unsaid
        </label>
        <textarea
          id="unsaid-text"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={2}
          placeholder="Write the sentence you keep editing in your head…"
          className="min-h-28 w-full resize-none rounded-lg border border-border bg-background p-4 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div
          className={cn(
            "mt-2 flex items-center justify-end gap-2 text-[11px] font-medium",
            counterTone,
          )}
        >
          {/* Circular SVG progress ring */}
          <svg className="size-4 -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2"
            />
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke={ringColor}
              strokeWidth="2"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          </svg>
          <span className="shrink-0 tabular-nums font-mono">
            {text.length}/{MAX_LEN}
          </span>
        </div>
      </div>

      {open && (
        <div className="pop-in mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 font-vibe">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setAnonymous(true);
              }}
              className={cn(
                "min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors",
                anonymous
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              Anonymous
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setAnonymous(false);
              }}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
                !anonymous
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Instagram className="size-3.5" aria-hidden />
              <span>Use my handle</span>
            </button>
          </div>

          {!anonymous && (
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <span className="text-muted-foreground text-sm font-semibold">@</span>
              <input
                type="text"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                placeholder="instagram_handle"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 font-sans font-medium"
              />
            </div>
          )}

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 font-vibe">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setCategory(c);
                }}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors",
                  category === c
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {profanityCheck.hasProfanity && (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>
            That wording cannot be posted here. Remove abusive or explicit language and try again.
          </span>
        </div>
      )}

      {submitError && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-center text-xs text-destructive">
          {submitError}
        </div>
      )}

      <div className="mt-2.5">
        <button
          type="button"
          disabled={!valid || sending}
          onClick={async () => {
            triggerHaptic("impactMedium");
            setLocalSending(true);
            try {
              const res = onSubmit({
                text: text.trim(),
                handle: anonymous ? null : `@${cleanIg}`,
                category,
                preset,
              });
              if (res instanceof Promise) {
                await res;
              }
              setText("");
              setFocused(false);
              setAnonymous(true);
            } catch {
              // Error handled by parent or displayed via submitError prop
            } finally {
              setLocalSending(false);
            }
          }}
          className={cn(
            "spring-press flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
            valid && !sending
              ? "bg-primary text-primary-foreground hover:bg-flame"
              : "bg-secondary text-muted-foreground",
          )}
        >
          <Send className="size-4" aria-hidden />
          {sending ? "Posting…" : anonymous ? "Post anonymously" : "Post with handle"}
        </button>
      </div>
    </section>
  );
}
