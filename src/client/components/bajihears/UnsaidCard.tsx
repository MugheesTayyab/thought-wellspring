import { useRef, useState, useEffect } from "react";
import {
  Copy,
  Check,
  Flag,
  Flame,
  Heart,
  HeartHandshake,
  Instagram,
  MessageCircle,
  CloudRain,
  Sparkles,
  Gift,
  MoreHorizontal,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { RevealCountdown } from "./RevealCountdown";
import { triggerHaptic } from "@/client/lib/haptics";
import { useWarmth } from "@/client/stores/warmth-context";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { vetoPost } from "@/client/lib/local-storage";
import {
  cn,
  compactCount,
  relativeTime,
  stripHandle,
  getInstagramUrl,
  getTier,
} from "@/shared/utils";
import { REACTIONS } from "@/shared/constants/reactions";
import { presetByKey } from "@/shared/constants/presets";
import type { ReactionKey, Unsaid } from "@/shared/types/unsaid";

const REACTION_ICON = {
  heart: Heart,
  sad: CloudRain,
  fire: Flame,
  hug: HeartHandshake,
} as const;

const BURST_EMOJIS = ["❤️", "✨", "🔥", "🫂", "💖", "💅"];

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
  isWinner?: boolean;
  hook?: string;
  onReact: (id: string, key: ReactionKey) => void;
  onEcho: (id: string, text: string, echoHandle: string | null) => void;
  onReport: (id: string) => void;
  onShare: (unsaid: Unsaid) => void;
};

export function UnsaidCard({
  unsaid,
  mine,
  echoed,
  reported,
  myHandle,
  hero = false,
  isWinner = false,
  hook,
  onReact,
  onEcho,
  onReport,
  onShare,
}: Props) {
  const { totalWarmth, spendWarmth } = useWarmth();
  const [bounced, setBounced] = useState<ReactionKey | null>(null);
  const [burst, setBurst] = useState(false);
  const [openEchoes, setOpenEchoes] = useState(false);
  const [echoOpen, setEchoOpen] = useState(false);
  const [echoText, setEchoText] = useState("");
  const [echoAnon, setEchoAnon] = useState(true);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [giftConfirmOpen, setGiftConfirmOpen] = useState(false);
  const [isGifted, setIsGifted] = useState(false);
  const [isVetoed, setIsVetoed] = useState(false);
  const [vetoFeedback, setVetoFeedback] = useState<string | null>(null);

  const lastTap = useRef(0);
  const preset = presetByKey(unsaid.preset);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("bh:giftedPosts");
        if (raw) {
          const ids = JSON.parse(raw) as string[];
          if (ids.includes(unsaid.id)) setIsGifted(true);
        }
      } catch {
        // ignore
      }
    }
  }, [unsaid.id]);

  const handleSendGift = () => {
    if (totalWarmth < 10 || isGifted) return;
    triggerHaptic("celebration");
    spendWarmth(10, "Gifted 10 Warmth to post");
    setIsGifted(true);
    setGiftConfirmOpen(false);

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("bh:giftedPosts");
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        localStorage.setItem("bh:giftedPosts", JSON.stringify([...ids, unsaid.id]));
      } catch {
        // ignore
      }
    }
  };

  const handleVeto = () => {
    triggerHaptic("warning");
    setMenuOpen(false);
    const identity = getOrCreateIdentity();
    const res = vetoPost(unsaid.id, identity.deviceToken);
    if (res.success) {
      setIsVetoed(true);
      setVetoFeedback(res.underReview ? "Flagged for review" : "Thanks for keeping the wall safe");
    } else {
      setVetoFeedback(res.reason ?? "Unable to flag");
    }
    window.setTimeout(() => setVetoFeedback(null), 3000);
  };

  const react = (key: ReactionKey) => {
    triggerHaptic("impactLight");
    setBounced(key);
    window.setTimeout(() => setBounced(null), 220);
    onReact(unsaid.id, key);
  };

  // Instagram-style double tap anywhere on the card = multi-emoji floating burst.
  const onCardPointerUp = () => {
    const t = Date.now();
    if (t - lastTap.current < 320) {
      lastTap.current = 0;
      triggerHaptic("celebration");
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
      triggerHaptic("selection");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const isOwnPost = Boolean(
    unsaid.handle && myHandle && stripHandle(unsaid.handle) === stripHandle(myHandle),
  );
  const tier = getTier(totalWarmth);
  let auraStyle: React.CSSProperties | undefined = undefined;
  let crownIcon = false;
  if (isOwnPost) {
    if (tier.key === "Flicker") {
      auraStyle = { textShadow: "0 0 8px rgba(255,133,51,0.7)" };
    } else if (tier.key === "Glow") {
      auraStyle = { textShadow: "0 0 14px rgba(168,85,247,0.85)" };
    } else if (tier.key === "Blaze") {
      auraStyle = { textShadow: "0 0 16px rgba(255,59,48,0.95)" };
    } else if (tier.key === "Bonfire") {
      auraStyle = { textShadow: "0 0 22px rgba(251,191,36,1)" };
      crownIcon = true;
    }
  }

  return (
    <article
      onPointerUp={onCardPointerUp}
      className={cn(
        "slide-in-card tilt-card relative overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-200 select-none",
        isWinner
          ? "border-t-2 border-amber-400 bg-gradient-to-br from-amber-500/15 via-card/95 to-card/90 border-x border-b border-amber-400/40 shadow-[0_10px_35px_-10px_rgba(251,191,36,0.3)] p-4 sm:p-6"
          : hero
            ? "bg-hero-gradient border-primary/40 shadow-glow p-4 sm:p-6 hover:shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)]"
            : "bg-gradient-to-br from-card via-card/95 to-card/90 border border-white/10 hover:border-primary/30 shadow-soft p-4 sm:p-5",
      )}
    >
      {/* Ambient background glow for Shade theme */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full opacity-35 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${preset.from} 0%, ${preset.to} 100%)`,
        }}
        aria-hidden
      />

      {/* Decorative Quote Mark Watermark */}
      <span
        className="font-quote text-primary/8 pointer-events-none absolute -top-3 left-2 text-6xl sm:text-7xl select-none"
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

      {/* Winner Pin Badge */}
      {isWinner && (
        <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]">
            <Sparkles className="size-3 fill-current" aria-hidden />⭐ Baji Heard This
          </span>
          <RevealCountdown className="text-amber-300 text-xs font-semibold tracking-wide" />
        </div>
      )}

      {/* Pending Post Warming-Up Badge */}
      {unsaid.status === "pending" && (
        <div className="relative z-10 mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
          <Clock className="size-3.5 animate-spin shrink-0" />
          <span>Your post is warming up — visible to others shortly</span>
        </div>
      )}

      {/* Hero Badge */}
      {hero && !isWinner && (
        <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <span className="bg-brand-gradient text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase shadow-xs">
            <Sparkles className="size-3 fill-current" aria-hidden />
            Top Echoed Tea 👑
          </span>
          <RevealCountdown className="text-primary/90 text-xs font-semibold tracking-wide" />
        </div>
      )}

      {/* Main Quote Content */}
      <p
        className={cn(
          "text-foreground text-balance relative z-10 font-vibe tracking-normal leading-relaxed text-foreground/95",
          hero || isWinner
            ? "font-display text-center text-lg sm:text-2xl font-bold tracking-tight"
            : "text-[15px] sm:text-[16px] font-normal",
        )}
      >
        {unsaid.text}
      </p>

      {/* Post Metadata & Vibe Badges */}
      <div
        className={cn(
          "relative z-10 mt-3 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-vibe",
          (hero || isWinner) && "justify-center",
        )}
      >
        {unsaid.handle ? (
          <a
            href={getInstagramUrl(unsaid.handle)!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={auraStyle}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 hover:border-primary/70 transition-all shadow-xs",
              isOwnPost && tier.key !== "Ember" && "ring-1 ring-primary/40",
            )}
            title={`Visit Instagram @${stripHandle(unsaid.handle)}`}
          >
            {crownIcon && <span className="text-[10px]">👑</span>}
            <Instagram className="size-3 text-primary shrink-0" aria-hidden />
            <span>@{stripHandle(unsaid.handle)}</span>
          </a>
        ) : (
          <span className="bg-white/5 border-white/10 font-medium text-foreground/80 rounded-full border px-2 py-0.5 text-[11px] shadow-xs">
            @anonymous
          </span>
        )}
        <span aria-hidden className="opacity-30">
          ·
        </span>
        <span className="text-muted-foreground/75 text-[11px]">
          {relativeTime(unsaid.createdAt)}
        </span>
        <span aria-hidden className="opacity-30">
          ·
        </span>
        <span className="border-ember/30 bg-gradient-to-r from-ember/15 to-flame/15 text-ember rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
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
      <div className="border-white/8 relative z-10 mt-3.5 grid grid-cols-4 gap-1.5 sm:gap-2 border-t pt-3">
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
                "flex h-8 sm:h-9 min-w-0 items-center justify-center gap-1 sm:gap-1.5 rounded-full border text-[11px] sm:text-xs font-semibold tabular-nums transition-all duration-150 active:scale-95",
                active
                  ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_12px_rgba(250,84,28,0.2)]"
                  : "border-white/8 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/15 hover:text-foreground",
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
                  className={cn("size-3.5", active && "text-primary fill-current")}
                  aria-hidden
                />
              </span>
              <span className="truncate">{compactCount(unsaid.reactions[rx.key])}</span>
            </button>
          );
        })}
      </div>

      {copied && (
        <p className="text-ember relative z-10 mt-2 text-center text-xs font-semibold animate-fade-in">
          Copied vibe to clipboard ✨
        </p>
      )}

      {vetoFeedback && (
        <p className="text-amber-400 relative z-10 mt-2 text-center text-xs font-semibold animate-fade-in flex items-center justify-center gap-1">
          <ShieldAlert className="size-3.5" />
          <span>{vetoFeedback}</span>
        </p>
      )}

      {/* Row 2 — Secondary Actions, Gift, & Overflow Menu */}
      <div className="border-white/10 text-muted-foreground/80 relative z-10 mt-3.5 flex items-center justify-between border-t pt-3 text-xs font-vibe">
        <div className="flex items-center gap-2 sm:gap-3">
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
            <MessageCircle className="size-4 shrink-0 text-primary/90" aria-hidden />
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
              + Echo
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Gift 10 Warmth Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (isGifted) return;
                setGiftConfirmOpen((v) => !v);
              }}
              disabled={isGifted}
              aria-label={isGifted ? "Gifted" : "Send 10 Warmth"}
              title={isGifted ? "Gifted" : "Send 10 Warmth"}
              className={cn(
                "tap-44 grid min-h-[44px] min-w-9 place-items-center rounded-full transition-all",
                isGifted ? "text-emerald-400 font-bold" : "hover:text-amber-400 hover:scale-105",
              )}
            >
              {isGifted ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <Gift className="size-4 text-amber-400/90" />
              )}
            </button>

            {/* Gift Confirmation Popover */}
            {giftConfirmOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-30 w-48 rounded-2xl border border-primary/30 bg-[#191010] p-3 shadow-xl backdrop-blur-xl animate-[slideUp_0.2s_ease-out]">
                <p className="text-xs font-semibold text-white">Send 10 Warmth to this post?</p>
                <p className="text-[10px] text-white/60 mt-0.5">Spread quiet appreciation</p>
                <div className="mt-2.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGiftConfirmOpen(false)}
                    className="rounded-lg px-2 py-1 text-[10px] text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendGift}
                    disabled={totalWarmth < 10}
                    className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-white shadow-xs disabled:opacity-50"
                  >
                    Send (10🔥)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied!" : "Copy text"}
            title={copied ? "Copied!" : "Copy text"}
            className="tap-44 spring-press hover:text-foreground grid min-h-[44px] min-w-9 place-items-center transition-colors"
          >
            {copied ? (
              <Check className="size-4 text-emerald-400 animate-fade-in" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
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

          {/* Three-Dot Overflow Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              className="tap-44 hover:text-foreground grid min-h-[44px] min-w-8 place-items-center transition-colors"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-30 w-44 overflow-hidden rounded-2xl border border-white/15 bg-[#170e0e]/95 py-1 shadow-2xl backdrop-blur-2xl animate-[slideUp_0.15s_ease-out]">
                <button
                  type="button"
                  onClick={handleVeto}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-amber-400 transition-colors"
                >
                  <ShieldAlert className="size-3.5 text-amber-400" />
                  <span>Something feels off</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copy();
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Copy className="size-3.5" />
                  <span>Copy text</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onShare(unsaid);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Instagram className="size-3.5 text-ember" />
                  <span>Share story card</span>
                </button>
              </div>
            )}
          </div>
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
              {echo.handle ? (
                <a
                  href={getInstagramUrl(echo.handle)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                  title={`Visit Instagram @${stripHandle(echo.handle)}`}
                >
                  <Instagram className="size-2.5 text-primary shrink-0" aria-hidden />
                  <span>@{stripHandle(echo.handle)}</span>
                </a>
              ) : (
                <span className="text-muted-foreground ml-2 text-[11px] font-semibold">
                  @anonymous
                </span>
              )}
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
