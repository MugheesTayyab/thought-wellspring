import { useRef, useState } from "react";
import {
  Copy,
  Flag,
  Flame,
  Heart,
  HeartHandshake,
  Instagram,
  MessageCircle,
  CloudRain,
  Sparkles,
} from "lucide-react";
import { RevealCountdown } from "./RevealCountdown";

const REACTION_ICON = {
  heart: Heart,
  sad: CloudRain,
  fire: Flame,
  hug: HeartHandshake,
} as const;

import { cn } from "@/lib/utils";
import {
  REACTIONS,
  compactCount,
  presetByKey,
  relativeTime,
  type ReactionKey,
  type Unsaid,
} from "@/lib/bajihears";

const BURST_EMOJIS = ["✨", "💖", "🔥", "💅", "🥺", "🌸"];

const QUICK_VIBES = [
  "Real spill 💅",
  "I feel you 🥺",
  "No way 😱",
  "Sending hugs 🫂",
  "Hot take 🔥",
];

type Props = {
  unsaid: Unsaid;
  mine: ReactionKey[];
  echoed: boolean;
  reported: boolean;
  myHandle: string | null;
  hero?: boolean;
  hook?: string;
  onReact: (id: string, key: ReactionKey) => void;
  onEcho: (id: string, text: string, handle: string | null) => void;
  onReport: (id: string) => void;
  onShare: (unsaid: Unsaid) => void;
};

export function UnsaidCard({
  unsaid,
  mine,
  echoed,
  reported,
  myHandle,
  hero,
  onReact,
  onEcho,
  onReport,
  onShare,
}: Props) {
  const [bounced, setBounced] = useState<ReactionKey | null>(null);
  const [burst, setBurst] = useState(false);
  const [openEchoes, setOpenEchoes] = useState(false);
  const [echoOpen, setEchoOpen] = useState(false);
  const [echoText, setEchoText] = useState("");
  const [echoAnon, setEchoAnon] = useState(true);
  const [copied, setCopied] = useState(false);
  const lastTap = useRef(0);
  const preset = presetByKey(unsaid.preset);

  const react = (key: ReactionKey) => {
    setBounced(key);
    window.setTimeout(() => setBounced(null), 220);
    onReact(unsaid.id, key);
  };

  // Instagram-style double tap anywhere on the card = multi-emoji floating burst.
  const onCardPointerUp = () => {
    const t = Date.now();
    if (t - lastTap.current < 320) {
      lastTap.current = 0;
      if (!mine.includes("heart")) onReact(unsaid.id, "heart");
      setBurst(true);
      window.setTimeout(() => setBurst(false), 900);
      return;
    }
    lastTap.current = t;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `"${unsaid.text}"\n— ${unsaid.handle ?? "anonymous"}, BajiHears`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <article
      onPointerUp={onCardPointerUp}
      className={cn(
        "slide-in-card tilt-card relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 select-none",
        hero
          ? "bg-hero-gradient border-primary/50 shadow-glow p-4 sm:p-7 hover:shadow-[0_20px_60px_-15px_rgba(249,115,22,0.35)]"
          : "bg-gradient-to-br from-card via-card/95 to-card/90 border border-white/12 hover:border-primary/40 shadow-soft hover:shadow-[0_16px_40px_-12px_rgba(249,115,22,0.22)] p-4 sm:p-6",
      )}
    >
      {/* Ambient background glow for Shade theme */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full opacity-40 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${preset.from} 0%, ${preset.to} 100%)`,
        }}
        aria-hidden
      />

      {/* Decorative Quote Mark Watermark */}
      <span
        className="font-quote text-primary/10 pointer-events-none absolute -top-3 left-2 text-7xl select-none"
        aria-hidden
      >
        “
      </span>

      {/* Multi-Emoji Floating Burst on Double-Tap */}
      {burst && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-3 overflow-hidden">
          {BURST_EMOJIS.map((emoji, idx) => (
            <span
              key={idx}
              className="float-up-particle text-3xl drop-shadow-md"
              style={{
                animationDelay: `${idx * 0.08}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Hero Badge */}
      {hero && (
        <div className="relative z-10 mb-4 text-center">
          <span className="bg-brand-gradient text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase shadow-md">
            <Sparkles className="size-3.5 fill-current" aria-hidden />
            Most Echoed Tea 👑
          </span>
          <RevealCountdown className="text-primary/95 mt-3 block text-center text-sm font-semibold tracking-wide" />
        </div>
      )}

      {/* Main Quote Content with Gen Z Aesthetics */}
      <p
        className={cn(
          "text-foreground text-balance relative z-10 font-vibe tracking-normal leading-relaxed text-foreground/95",
          hero
            ? "font-display text-center text-xl sm:text-2xl font-extrabold tracking-wide"
            : "text-[16px] sm:text-[17px] font-medium",
        )}
      >
        {unsaid.text}
      </p>

      {/* Post Metadata & Vibe Badges */}
      <div
        className={cn(
          "relative z-10 mt-3.5 flex flex-wrap items-center gap-2 text-[12px] font-vibe",
          hero && "justify-center",
        )}
      >
        <span className="bg-white/5 border-white/10 font-semibold text-foreground/85 rounded-full border px-2.5 py-0.5 text-[11px] shadow-xs">
          @{unsaid.handle ?? "anonymous"}
        </span>
        <span aria-hidden className="opacity-30">
          ·
        </span>
        <span className="text-muted-foreground/75 text-[11px]">
          {relativeTime(unsaid.createdAt)}
        </span>
        <span aria-hidden className="opacity-30">
          ·
        </span>
        <span className="border-ember/30 bg-gradient-to-r from-ember/15 to-flame/15 text-ember rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          #{unsaid.category.toLowerCase().replace(/\s+/g, "")}
        </span>
        <span
          aria-hidden
          className="size-2 rounded-full shadow-xs"
          style={{
            backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
          }}
        />
      </div>

      {/* Row 1 — Tactile Reaction Chips */}
      <div
        className={cn(
          "border-white/10 relative z-10 mt-4 grid grid-cols-4 gap-2 border-t pt-3.5",
          hero && "gap-2",
        )}
      >
        {REACTIONS.map((rx) => {
          const active = mine.includes(rx.key);
          const Icon = REACTION_ICON[rx.key];
          return (
            <button
              key={rx.key}
              type="button"
              aria-label={rx.label}
              aria-pressed={active}
              onClick={() => react(rx.key)}
              className={cn(
                "flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-2xl border text-xs font-bold tabular-nums transition-all duration-200 active:scale-95 hover:scale-[1.03]",
                active
                  ? "border-primary/70 bg-gradient-to-r from-ember/20 to-flame/20 text-primary shadow-[0_0_15px_rgba(249,115,22,0.25)]"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:border-white/20 hover:text-foreground",
              )}
            >
              <span
                key={bounced === rx.key ? `bounce-${rx.key}` : `static-${rx.key}`}
                className={cn(
                  "inline-flex shrink-0 transition-transform",
                  bounced === rx.key && "react-pop",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active && "text-primary fill-current drop-shadow-sm",
                  )}
                  aria-hidden
                />
              </span>
              <span>{compactCount(unsaid.reactions[rx.key])}</span>
            </button>
          );
        })}
      </div>

      {copied && (
        <p className="text-ember relative z-10 mt-2 text-center text-xs font-semibold animate-fade-in">
          Copied vibe to clipboard ✨
        </p>
      )}

      {/* Row 2 — Secondary Actions & Share */}
      <div className="border-white/10 text-muted-foreground/80 relative z-10 mt-3.5 flex items-center justify-between border-t pt-3 text-xs font-vibe">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (unsaid.echoes.length > 0) {
                setOpenEchoes((v) => !v);
              } else {
                setEchoOpen((v) => !v);
              }
            }}
            className={cn(
              "flex min-h-[44px] items-center gap-1.5 transition-colors hover:text-foreground px-1 font-semibold",
              echoed && "text-primary font-bold",
            )}
          >
            <MessageCircle
              className="size-4 shrink-0 text-primary/90"
              aria-hidden
            />
            <span>
              {unsaid.echoes.length > 0
                ? `${unsaid.echoes.length} ${unsaid.echoes.length === 1 ? "Echo" : "Echoes"}`
                : echoed
                  ? "Echoed"
                  : "Echo"}
            </span>
          </button>

          {unsaid.echoes.length > 0 && !echoed && (
            <button
              type="button"
              onClick={() => setEchoOpen((v) => !v)}
              className="text-ember hover:text-primary min-h-[44px] text-[11px] font-semibold underline underline-offset-2 px-1"
            >
              + Echo back
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={copy}
            aria-label="Copy text"
            title="Copy text"
            className="tap-44 hover:text-foreground grid min-h-[44px] min-w-9 place-items-center transition-colors"
          >
            <Copy className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onShare(unsaid)}
            aria-label="Share to Story"
            title="Share to Story"
            className="tap-44 hover:text-primary hover:scale-110 grid min-h-[44px] min-w-9 place-items-center transition-all"
          >
            <Instagram className="size-4 text-ember/90" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onReport(unsaid.id)}
            disabled={reported}
            aria-label={reported ? "Reported" : "Report this Unsaid"}
            title={reported ? "Reported" : "Report"}
            className={cn(
              "tap-44 flex min-h-[44px] items-center gap-1 transition-colors px-1",
              reported ? "opacity-50" : "hover:text-destructive",
            )}
          >
            <Flag className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {reported ? "Reported" : "Report"}
            </span>
          </button>
        </div>
      </div>

      {/* Echo List */}
      {openEchoes && unsaid.echoes.length > 0 && (
        <ul className="border-border/70 relative z-10 mt-3 space-y-2 border-l-2 pl-3">
          {unsaid.echoes.map((echo) => (
            <li
              key={echo.id}
              className="text-foreground/90 font-vibe text-xs sm:text-sm leading-snug"
            >
              {echo.text}
              <span className="text-muted-foreground ml-2 text-[11px] font-semibold">
                @{echo.handle ?? "anonymous"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Interactive + Echo Back Form with Quick Vibe Stickers */}
      {echoOpen && !echoed && (
        <form
          className="relative z-10 mt-3 space-y-2.5 animate-fade-in"
          onSubmit={(e) => {
            e.preventDefault();
            const text = echoText.trim();
            if (text.length < 2) return;
            onEcho(unsaid.id, text, echoAnon ? null : myHandle);
            setEchoText("");
            setEchoOpen(false);
            setOpenEchoes(true);
          }}
        >
          {/* Quick-Reply Vibe Stickers */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_VIBES.map((vibe) => (
              <button
                key={vibe}
                type="button"
                onClick={() => setEchoText(vibe)}
                className="bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 text-foreground/80 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
              >
                {vibe}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={echoText}
              onChange={(e) => setEchoText(e.target.value.slice(0, 200))}
              placeholder="Spill your thoughts..."
              className="bg-secondary/60 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-full border px-4 py-2 text-xs sm:text-sm font-vibe outline-none focus:ring-2"
            />
            <button
              type="submit"
              className="bg-brand-gradient text-primary-foreground rounded-full px-5 py-2 text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition-opacity"
            >
              Echo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEchoAnon(true)}
              className={cn(
                "min-h-10 rounded-xl border px-3 text-xs font-semibold transition-all",
                echoAnon
                  ? "border-primary bg-primary/15 text-foreground shadow-xs"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              Anonymous
            </button>
            <button
              type="button"
              onClick={() => myHandle && setEchoAnon(false)}
              disabled={!myHandle}
              className={cn(
                "min-h-10 rounded-xl border px-3 text-xs font-semibold transition-all",
                !echoAnon
                  ? "border-primary bg-primary/15 text-foreground shadow-xs"
                  : "border-border bg-secondary/40 text-muted-foreground",
                !myHandle && "opacity-50",
              )}
            >
              {myHandle ? `As @${myHandle}` : "Post as @handle"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
