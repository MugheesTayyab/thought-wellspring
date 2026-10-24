import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Check, ChevronDown, Info, LoaderCircle, X } from "lucide-react";
import { cn, formatCountdown, stripHandle } from "@/shared/utils";
import type { Category } from "@/shared/types/unsaid";
import type { SubmitPostResult } from "@/shared/types/api";
import { CATEGORIES } from "@/shared/constants/categories";
import { LOCKOUT_MS, MAX_LEN, MIN_LEN } from "@/shared/constants/cycle";
import { PRESETS } from "@/shared/constants/presets";
import { triggerHaptic } from "@/client/lib/haptics";
import { detectProfanity } from "@/shared/lib/profanity";

const DRAFT_KEY = "bh:wall-composer-draft-v1";

type Draft = {
  text: string;
  anonymous: boolean;
  handle: string;
  category: Category | null;
  preset: string;
};

type Props = {
  lastSubmitAt: number | null;
  myHandle: string | null;
  onSubmit: (input: {
    text: string;
    handle: string | null;
    category: Category;
    preset: string;
  }) => Promise<SubmitPostResult>;
  onClose: () => void;
  onSeePost?: (id: string) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

function readDraft(myHandle: string | null): Draft {
  const fallback: Draft = {
    text: "",
    anonymous: true,
    handle: myHandle ? stripHandle(myHandle) : "",
    category: null,
    preset: PRESETS[0]!.key,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
    return value
      ? {
          ...fallback,
          ...value,
          category: CATEGORIES.includes(value.category as Category)
            ? (value.category as Category)
            : null,
          preset: PRESETS.some((mood) => mood.key === value.preset)
            ? (value.preset as string)
            : fallback.preset,
        }
      : fallback;
  } catch {
    return fallback;
  }
}

export function WritingBox({
  lastSubmitAt,
  myHandle,
  onSubmit,
  onClose,
  onSeePost,
  isSubmitting = false,
  submitError = null,
}: Props) {
  const initialDraft = useMemo(() => readDraft(myHandle), [myHandle]);
  const [text, setText] = useState(initialDraft.text);
  const [anonymous, setAnonymous] = useState(initialDraft.anonymous);
  const [handle, setHandle] = useState(initialDraft.handle);
  const [category, setCategory] = useState<Category | null>(initialDraft.category);
  const [preset, setPreset] = useState(initialDraft.preset);
  const [localSending, setLocalSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitPostResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const submitInFlightRef = useRef(false);

  const sending = isSubmitting || localSending;
  const cleanHandle = stripHandle(handle)
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);
  const profanityCheck = useMemo(() => detectProfanity(text), [text]);
  const unlockAt = lastSubmitAt ? lastSubmitAt + LOCKOUT_MS : null;
  const locked = unlockAt !== null && unlockAt > now;
  const overLimit = text.length > MAX_LEN;
  const missingCategory = category === null;
  const invalidHandle = !anonymous && cleanHandle.length < 2;
  const valid =
    text.trim().length >= MIN_LEN &&
    !overLimit &&
    !profanityCheck.hasProfanity &&
    !missingCategory &&
    !invalidHandle;
  const selectedMood = PRESETS.find((mood) => mood.key === preset) ?? PRESETS[0]!;

  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!locked) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [locked]);

  useEffect(() => {
    if (result) return;
    const draft: Draft = { text, anonymous, handle, category, preset };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* The composer remains usable when storage is blocked. */
    }
  }, [anonymous, category, handle, preset, result, text]);

  useEffect(() => {
    if (!sending) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(timer);
  }, [sending]);

  const close = () => {
    triggerHaptic("selection");
    onClose();
  };

  const submit = async () => {
    if (!valid || !category || sending || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    triggerHaptic("impactMedium");
    setLocalError(null);
    setLocalSending(true);
    try {
      const submission = await onSubmit({
        text: text.trim(),
        handle: anonymous ? null : `@${cleanHandle}`,
        category,
        preset,
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Publishing already succeeded. */
      }
      setResult(submission);
      triggerHaptic("celebration");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Couldn't post that just yet.");
    } finally {
      submitInFlightRef.current = false;
      setLocalSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex bg-background sm:items-center sm:justify-center sm:bg-foreground/25 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
    >
      <section className="flex min-h-0 w-full flex-col bg-background sm:max-h-[920px] sm:max-w-xl sm:rounded-[28px] sm:border sm:border-border sm:shadow-2xl">
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-border px-4 pt-[env(safe-area-inset-top,0px)] sm:px-5">
          <div>
            <h2 id="composer-title" className="text-lg font-semibold text-foreground">
              Write a thought
            </h2>
            <p className="text-xs text-muted-foreground">It doesn&apos;t need to sound perfect.</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close composer. Your draft is saved on this device."
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {result ? (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#E7F0E7] text-[#426548]">
                <Check className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-3xl text-foreground">
                {result.status === "published"
                  ? "Your thought is on the Wall."
                  : "Sent for review."}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {result.status === "published"
                  ? "Thanks for sharing it here."
                  : "It isn't public yet. The moderation check needs to finish first."}
              </p>
              <div className="mt-7 grid gap-2">
                {result.status === "published" && (
                  <button
                    type="button"
                    onClick={() => onSeePost?.(result.id)}
                    className="min-h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-white"
                  >
                    See your post
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="min-h-12 rounded-2xl border border-border bg-card px-5 text-sm font-semibold text-foreground"
                >
                  Back to the Wall
                </button>
              </div>
            </div>
          </div>
        ) : locked ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-sm">
              <h3 className="font-display text-2xl text-foreground">
                Your last thought was received.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can write another in {formatCountdown(unlockAt! - now)}. Reading and Echoes are
                still available.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 min-h-12 rounded-2xl border border-border bg-card px-5 text-sm font-semibold"
              >
                Back to the Wall
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-7 pb-5 sm:px-6 sm:pt-8">
              <div className="relative">
                {/* Baji mascot peeking over the upper border creating a clean cutout effect */}
                <div className="absolute -top-6 left-5 z-10 pointer-events-none select-none sm:-top-7 sm:left-6">
                  <img
                    src="/assets/brand/baji-mascot.png"
                    alt="Baji"
                    className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_4px_10px_rgba(80,43,38,0.12)]"
                    loading="eager"
                    decoding="sync"
                  />
                </div>

                <div
                  className="rounded-[22px] border border-border-card bg-white p-4 pt-6 transition-colors focus-within:border-primary/60 focus-within:shadow-[inset_0_0_0_1px_rgba(203,91,71,.12)]"
                  style={{
                    backgroundImage: `linear-gradient(145deg, ${selectedMood.from}, ${selectedMood.to})`,
                    color: selectedMood.ink,
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={8}
                    maxLength={MAX_LEN + 80}
                    placeholder="What's something you've been keeping to yourself?"
                    className="min-h-[210px] w-full resize-none bg-transparent font-sans text-[18px] leading-[1.65] text-inherit outline-none placeholder:text-[#746B66]"
                  />
                  <div className="mt-2 flex items-end justify-between gap-4 border-t border-black/5 pt-3">
                    <p className="max-w-xs text-xs leading-5 text-[#655D58]">
                      Keep names and private details out of public posts.
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-xs tabular-nums",
                        overLimit ? "font-semibold text-destructive" : "text-[#746B66]",
                      )}
                    >
                      {text.length}/{MAX_LEN}
                    </span>
                  </div>
                </div>
              </div>

              {overLimit && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  That thought is a little over the limit. Shorten it to share.
                </p>
              )}

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-foreground">Mood</legend>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This only changes the card's look.
                </p>
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                  {PRESETS.map((mood) => {
                    const selected = mood.key === preset;
                    return (
                      <button
                        key={mood.key}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${mood.name}${selected ? ", selected" : ""}`}
                        onClick={() => {
                          setPreset(mood.key);
                          triggerHaptic("selection");
                        }}
                        className={cn(
                          "min-w-[96px] shrink-0 rounded-2xl border p-2 text-left transition-all duration-200 cursor-pointer",
                          selected
                            ? "border-primary ring-2 ring-primary/20 bg-accent/25"
                            : "border-border-card bg-card hover:border-primary/40",
                        )}
                      >
                        <span
                          className="block h-9 rounded-xl border border-black/5"
                          style={{
                            backgroundImage: `linear-gradient(145deg, ${mood.from}, ${mood.to})`,
                          }}
                        />
                        <span className="mt-1.5 block text-[11px] font-medium text-foreground">
                          {mood.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-foreground">Post as</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={anonymous}
                    onClick={() => setAnonymous(true)}
                    className={cn(
                      "min-h-[72px] rounded-2xl border p-3 text-left transition-colors cursor-pointer",
                      anonymous
                        ? "border-primary bg-accent"
                        : "border-border-card bg-card hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">Anonymous</span>
                    <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                      Other readers won't see a name attached.
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={!anonymous}
                    onClick={() => setAnonymous(false)}
                    className={cn(
                      "min-h-[72px] rounded-2xl border p-3 text-left transition-colors cursor-pointer",
                      !anonymous
                        ? "border-primary bg-accent"
                        : "border-border-card bg-card hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      With a handle
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                      Readers can see the Instagram handle you enter.
                    </span>
                  </button>
                </div>

                {!anonymous && (
                  <div className="mt-3 rounded-2xl border border-border-card bg-card p-3">
                    <label
                      htmlFor="public-handle"
                      className="text-xs font-semibold text-foreground"
                    >
                      Instagram handle
                    </label>
                    <div className="mt-2 flex min-h-12 items-center rounded-xl border border-border-card bg-background px-3 focus-within:border-primary">
                      <AtSign className="size-4 text-muted-foreground" aria-hidden />
                      <input
                        id="public-handle"
                        value={handle}
                        onChange={(event) => setHandle(event.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="your.handle"
                        className="h-11 w-full bg-transparent px-2 text-base text-foreground outline-none"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      People may use this to find your account outside BajiHears. We never fill it
                      automatically from a private account.
                    </p>
                  </div>
                )}
              </fieldset>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-foreground">Category</legend>
                <p className="mt-0.5 text-xs text-muted-foreground">Choose the closest fit.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={category === option}
                      onClick={() => setCategory(option)}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-xs font-semibold cursor-pointer transition-colors",
                        category === option
                          ? "border-primary bg-accent text-primary"
                          : "border-border-card bg-card text-muted-foreground hover:text-foreground hover:border-primary/40",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6 rounded-2xl border border-[#D8CCEA] bg-[#F4F0FA] p-4 text-sm text-[#51436A]">
                <div className="flex gap-2">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">How this post appears</p>
                    <p className="mt-1 leading-5">
                      Public on the Wall ·{" "}
                      {anonymous
                        ? "Posted as Anonymous"
                        : `Handle: @${cleanHandle || "your handle"}`}
                      .
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium underline decoration-current/40 underline-offset-2">
                        What can others see?
                      </summary>
                      <p className="mt-2 leading-5">
                        Anyone who can open the Wall can read or share the post. Readers don't see
                        your device identifier, but the service stores it for rate limits and
                        moderation. Anonymous does not mean private from the platform or its service
                        providers.
                      </p>
                    </details>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-foreground"
              >
                Preview as others see it
                <ChevronDown
                  className={cn("size-4 transition-transform", showPreview && "rotate-180")}
                />
              </button>

              {showPreview && (
                <div
                  className="rounded-[22px] border border-border-card p-4 shadow-sm"
                  style={{
                    backgroundImage: `linear-gradient(145deg, ${selectedMood.from}, ${selectedMood.to})`,
                  }}
                >
                  <div className="flex items-center justify-between text-xs text-[#6F6661]">
                    <span>{anonymous ? "Anonymous" : `@${cleanHandle || "your.handle"}`}</span>
                    <span>{category ?? "Choose a category"}</span>
                  </div>
                  <p
                    className="mt-4 whitespace-pre-wrap text-[18px] leading-7"
                    style={{ color: selectedMood.ink }}
                  >
                    {text.trim() || "Your thought will appear here."}
                  </p>
                </div>
              )}

              {(localError || submitError || profanityCheck.hasProfanity) && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <p className="font-semibold">
                    {profanityCheck.hasProfanity
                      ? "Please revise that before sharing."
                      : "Couldn't post that just yet."}
                  </p>
                  <p className="mt-1">
                    {profanityCheck.hasProfanity
                      ? "Remove insults or explicit language, then try again."
                      : "Your words are still here. Check your connection and try again."}
                  </p>
                </div>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Draft saved only in this browser. It is not synced between devices.
              </p>
            </div>

            <footer className="shrink-0 border-t border-border bg-background px-4 pb-[calc(.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-6">
              {!valid && text.length > 0 && (
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  {overLimit
                    ? "Shorten the thought to share."
                    : missingCategory
                      ? "Choose a category before sharing."
                      : invalidHandle
                        ? "Enter the handle people will see."
                        : text.trim().length < MIN_LEN
                          ? "Write a little something first."
                          : "Revise the highlighted text before sharing."}
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!valid || sending}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white disabled:bg-secondary disabled:text-muted-foreground"
              >
                {sending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                {sending
                  ? slow
                    ? "Still sending…"
                    : "Posting…"
                  : anonymous
                    ? "Post anonymously"
                    : "Post with handle"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
