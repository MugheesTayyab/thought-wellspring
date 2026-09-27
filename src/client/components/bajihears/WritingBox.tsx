import { useEffect, useMemo, useState } from "react";
import { Instagram } from "lucide-react";
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
  }) => void | Promise<any>;
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

  if (locked) {
    return (
      <section className="bg-[#17110D] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 text-center">
        <p className="text-[#E8552E] text-xs font-semibold">
          Your tea is on the wall ☕
        </p>
        <p className="font-quote mt-2 text-xl font-bold text-[#F5EFE9]">
          Next drop unlocks in {formatCountdown(unlockAt! - now)}
        </p>
        <p className="text-[#9C8F87] mt-1.5 text-xs max-w-xs mx-auto">
          One confession per cycle keeps the tea real. Come back daily to build your 10-day streak — Baji follows active regulars back! 👑
        </p>
      </section>
    );
  }

  const open = focused || text.length > 0;
  const cleanIg = stripHandle(igHandle);
  const profanityCheck = useMemo(() => detectProfanity(text), [text]);
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
    <section className="bg-[#17110D] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all">
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
        <p className="text-[#9C8F87] mb-2 text-[10px] tracking-wide font-medium">
          {PRESETS.find((p) => p.key === preset)!.name}
        </p>

        <textarea
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={2}
          placeholder="Spill the tea... something you couldn't say out loud."
          className="bg-white/[0.03] border-white/10 placeholder:text-[#9C8F87]/60 focus:border-[#E8552E]/60 focus:ring-[#E8552E]/20 w-full resize-none rounded-2xl border p-3.5 text-sm sm:text-base leading-relaxed outline-none focus:ring-2 transition-all font-sans text-[#F5EFE9]"
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
              onClick={() => {
                triggerHaptic("selection");
                setAnonymous(false);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[13px] font-semibold transition-all active:scale-95 min-h-[44px]",
                !anonymous
                  ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground",
              )}
            >
              <Instagram className="size-3.5" aria-hidden />
              <span>Drop Handle</span>
            </button>
          </div>

          {!anonymous && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-muted-foreground text-sm font-semibold">@</span>
              <input
                type="text"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                placeholder="instagram_handle"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 font-mono"
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
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                  category === c
                    ? "border-primary/60 bg-primary/20 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {profanityCheck.hasProfanity && (
        <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-center text-xs text-rose-300 font-medium flex items-center justify-center gap-2 animate-[pulse_2s_infinite]">
          <span className="text-sm">⚠️</span>
          <span>Baji keeps it warm & honest, not dirty. Inappropriate words (like f-words, s-words) are not allowed.</span>
        </div>
      )}

      {submitError && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-center text-xs text-destructive">
          {submitError}
        </div>
      )}

      <div className="mt-3">
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
            "spring-press w-full rounded-2xl py-3 text-[15px] font-bold tracking-wide transition-opacity font-vibe min-h-[44px]",
            valid && !sending
              ? "bg-brand-gradient text-primary-foreground shadow-md"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {sending ? "Posting anonymously…" : "Post Anonymously 🔒"}
        </button>
      </div>
    </section>
  );
}
