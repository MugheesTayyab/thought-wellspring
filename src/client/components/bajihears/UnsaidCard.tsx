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
  Crown,
  Gift,
  MoreHorizontal,
  Clock,
  ShieldAlert,
  Share2,
  SmilePlus,
} from "lucide-react";
import { RevealCountdown } from "./RevealCountdown";
import { HearthBurst } from "./HearthBurst";
import { PublicProfileModal } from "./PublicProfileModal";
import { triggerHaptic } from "@/client/lib/haptics";
import { useWarmth } from "@/client/stores/warmth-context";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { vetoPost } from "@/client/lib/local-storage";
import { detectProfanity } from "@/shared/lib/profanity";
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
  const [showRxPicker, setShowRxPicker] = useState(false);
  const [profileModalId, setProfileModalId] = useState<string | null>(null);

  const [hearthSpark, setHearthSpark] = useState(false);
  const lastTap = useRef(0);
  const preset = presetByKey(unsaid.preset);

  // Smooth, slow 3D scroll physics for the winner card
  const cardRef = useRef<HTMLElement | null>(null);
  const currentTilt = useRef({ rx: 0, ry: 0, tz: 0 });
  const targetTilt = useRef({ rx: 0, ry: 0, tz: 0 });

  useEffect(() => {
    if (!isWinner || typeof window === "undefined") return;

    let animId: number;

    const onScroll = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerY = rect.top + rect.height / 2;
      const dist = (centerY - vh / 2) / (vh / 2);
      const clamped = Math.max(-1.4, Math.min(1.4, dist));

      // Very slow and graceful 3D rotation with subtle lift
      targetTilt.current = {
        rx: -clamped * 4.2,
        ry: Math.sin(clamped * Math.PI) * 2.2,
        tz: Math.max(0, (1 - Math.abs(clamped)) * 14),
      };
    };

    const loop = () => {
      const lerp = 0.08;
      currentTilt.current.rx += (targetTilt.current.rx - currentTilt.current.rx) * lerp;
      currentTilt.current.ry += (targetTilt.current.ry - currentTilt.current.ry) * lerp;
      currentTilt.current.tz += (targetTilt.current.tz - currentTilt.current.tz) * lerp;

      if (cardRef.current) {
        const { rx, ry, tz } = currentTilt.current;
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${tz.toFixed(1)}px)`;
      }
      animId = requestAnimationFrame(loop);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animId);
    };
  }, [isWinner]);

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
    setHearthSpark(true);
    window.setTimeout(() => setHearthSpark(false), 950);
    onReact(unsaid.id, key);
  };

  // Double tap anywhere on the card: exclusively likes post with a minimal centered heart pop.
  // Decoupled from selection/copy and ignores taps on interactive child controls.
  const onCardPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, form, [role='button']")) {
      return;
    }

    const t = Date.now();
    if (t - lastTap.current < 280) {
      lastTap.current = 0;
      triggerHaptic("celebration");
      if (!mine.includes("heart")) onReact(unsaid.id, "heart");
      setBurst(true);
      window.setTimeout(() => {
        setBurst(false);
      }, 350);
      return;
    }
    lastTap.current = t;
  };

  // Candlelight Spotlight tracking on hover / touch move
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--candle-x", `${x.toFixed(1)}%`);
    e.currentTarget.style.setProperty("--candle-y", `${y.toFixed(1)}%`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `"${unsaid.text}"\nBy ${unsaid.handle ? `@${unsaid.handle}` : "anonymous"} • BajiHears`,
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
    <>
      <article
        ref={cardRef}
        onPointerUp={onCardPointerUp}
        onPointerMove={onPointerMove}
        style={
          isWinner
            ? {
                transformStyle: "preserve-3d",
                willChange: "transform",
                transition: "box-shadow 0.3s ease",
              }
            : undefined
        }
        className={cn(
          "relative rounded-2xl sm:rounded-3xl transition-all duration-200 select-none p-5 sm:p-6 overflow-hidden candlelight-card",
          isWinner
            ? "border-2 border-[#fa541c] ring-1 ring-[#fa541c]/60 bg-gradient-to-b from-[#221610] via-[#1c130e] to-[#140e0a] shadow-[0_0_35px_rgba(250,84,28,0.35),0_16px_45px_-8px_rgba(0,0,0,0.85)]"
            : "bg-[#17110D]",
          isVetoed && "opacity-40 pointer-events-none",
        )}
      >
        {/* Real Floating Ember Hearth Burst on Explicit Reaction */}
        {hearthSpark && <HearthBurst />}

        {/* Minimal Centered Heart Pop on Double-Tap (quick settle, does not compete with text) */}
        {burst && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="animate-like-heart-settle flex items-center justify-center">
              <Heart className="size-9 text-rose-500 fill-rose-500 drop-shadow-[0_2px_10px_rgba(244,63,94,0.5)]" />
            </div>
          </div>
        )}

        {/* Ambient glow reserved strictly for Winner card */}
        {isWinner && (
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(circle, #E8552E 0%, transparent 70%)",
            }}
            aria-hidden
          />
        )}

        {/* Crowned Winner Header (Responsive, zero-collision layout) */}
        {isWinner && (
          <div className="winner-badge-float flex items-center justify-between flex-wrap gap-2.5 pb-3 mb-3 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2">
              <span className="winner-crown-bob flex size-7 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
                👑
              </span>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold uppercase tracking-wider text-amber-300 leading-tight">
                  CYCLE CHAMPION
                </span>
                <span className="text-[10px] text-[#9C8F87] font-sans leading-tight">
                  Featured on @bajihears
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-sans font-medium text-[#F5EFE9] shrink-0">
              <Instagram className="size-3 text-[#E8552E] shrink-0" />
              <RevealCountdown prefix="Drop in " className="text-[#E8552E] font-medium" />
            </div>
          </div>
        )}

        {/* Standard Card Header Row: Handle, Instagram icon to the right, date, and category tag */}
        <div className="flex items-center justify-between gap-3 text-xs font-sans mb-3 pb-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 text-[#9C8F87] min-w-0">
            {unsaid.handle ? (
              <div className="inline-flex items-center gap-1.5 truncate">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileModalId(unsaid.profileId || unsaid.handle);
                  }}
                  style={auraStyle}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#F5EFE9] hover:text-[#E8552E] transition-colors cursor-pointer group"
                  title={`Open @${stripHandle(unsaid.handle)}'s Public Corner`}
                >
                  {crownIcon && <span className="text-[10px]">👑</span>}
                  <span className="group-hover:underline">@{stripHandle(unsaid.handle)}</span>
                </button>

                {getInstagramUrl(unsaid.handle) && (
                  <a
                    href={getInstagramUrl(unsaid.handle)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#9C8F87] hover:text-pink-400 transition-colors p-0.5 inline-flex items-center"
                    title="Open Instagram"
                  >
                    <Instagram className="size-3 text-[#E8552E] opacity-80 hover:opacity-100" aria-hidden />
                  </a>
                )}
              </div>
            ) : (
              <span className="text-[12px] font-sans font-medium text-[#9C8F87]/80">
                anonymous
              </span>
            )}
            <span className="text-[#9C8F87]/40 text-xs select-none">·</span>
            <span className="text-[12px] text-[#9C8F87]/70 whitespace-nowrap">
              {relativeTime(unsaid.createdAt)}
            </span>
          </div>

          <span className="shrink-0 border border-white/10 text-[#9C8F87] rounded-full px-2.5 py-0.5 text-[11px] font-normal bg-transparent">
            #{unsaid.category.toLowerCase().replace(/\s+/g, "")}
          </span>
        </div>

        {/* Quote: The Hero Body Text (never overlaps metadata or date) */}
        <p
          className={cn(
            "font-quote font-normal leading-[1.65] text-[#F5EFE9] tracking-normal select-none [text-wrap:pretty] [text-wrap:balance]",
            isWinner ? "text-[21px] sm:text-[24px] leading-[1.6]" : "text-[18px] sm:text-[20px]",
          )}
        >
          {unsaid.text}
        </p>

        {/* Small muted status caption if Winner without header */}
        {isWinner && !hero && (
          <div className="mt-2.5 text-xs text-[#9C8F87] flex items-center gap-1.5 font-sans">
            <RevealCountdown className="text-[#9C8F87]" />
          </div>
        )}

        {/* Pending status caption */}
        {unsaid.status === "pending" && (
          <div className="mt-2 text-xs text-amber-400/80 flex items-center gap-1.5 font-sans">
            <Clock className="size-3 animate-spin" />
            <span>warming up: visible to others shortly</span>
          </div>
        )}

      {copied && (
        <p className="text-[#E8552E] mt-2 text-center text-xs font-semibold animate-fade-in font-sans">
          Copied to clipboard
        </p>
      )}

      {vetoFeedback && (
        <p className="text-amber-400 mt-2 text-center text-xs font-semibold animate-fade-in flex items-center justify-center gap-1 font-sans">
          <ShieldAlert className="size-3.5" />
          <span>{vetoFeedback}</span>
        </p>
      )}

      {/* Bottom Action Row: Reactions, Echo, Share, and Overflow Menu */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 text-xs font-sans">
        {/* Left: Reaction Cluster with Primary Heart */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Heart reaction"
            onClick={() => react("heart")}
            className={cn(
              "flex items-center gap-1.5 py-1 px-2.5 rounded-full border transition-all text-xs active:scale-95 cursor-pointer",
              mine.includes("heart")
                ? "border-[#E8552E]/60 bg-[#E8552E]/10 text-[#E8552E] font-semibold"
                : "border-transparent text-[#9C8F87] hover:text-[#F5EFE9] hover:bg-white/[0.04]",
            )}
          >
            <Heart
              className={cn("size-3.5", mine.includes("heart") && "fill-current text-[#E8552E]")}
            />
            <span className="tabular-nums font-sans font-semibold text-xs">{compactCount(unsaid.reactions.heart)}</span>
          </button>

          {/* User's custom non-heart reaction indicator if active */}
          {mine.some((k) => k !== "heart") && (
            <span className="text-xs px-1 select-none animate-fade-in" title="Your reaction">
              {mine.includes("fire") ? "🔥" : mine.includes("hug") ? "🤝" : "🌧️"}
            </span>
          )}

          {/* Quiet Reaction Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRxPicker((v) => !v)}
              aria-label="More reactions"
              className="p-1 text-[#9C8F87]/60 hover:text-[#F5EFE9] transition-colors rounded-full hover:bg-white/[0.04] cursor-pointer"
            >
              <SmilePlus className="size-3.5" />
            </button>

            {showRxPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-1 rounded-full border border-white/10 bg-[#1c1511]/98 px-2 py-1 shadow-2xl backdrop-blur-xl animate-[slideUp_0.15s_ease-out]">
                {REACTIONS.map((rx) => {
                  const Icon = REACTION_ICON[rx.key];
                  const active = mine.includes(rx.key);
                  return (
                    <button
                      key={rx.key}
                      type="button"
                      onClick={() => {
                        react(rx.key);
                        setShowRxPicker(false);
                      }}
                      title={rx.label}
                      className={cn(
                        "p-1.5 rounded-full transition-all hover:scale-110 cursor-pointer",
                        active ? "text-[#E8552E] bg-white/10" : "text-[#9C8F87] hover:text-[#F5EFE9]",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions Row (Echo, Share, Overflow Menu) */}
        <div className="flex items-center gap-3">
          {/* Echo */}
          <button
            type="button"
            onClick={() => {
              if (unsaid.echoes.length > 0) setOpenEchoes((v) => !v);
              else setEchoOpen((v) => !v);
            }}
            className={cn(
              "flex items-center gap-1.5 text-[#9C8F87] hover:text-[#F5EFE9] transition-colors font-sans text-xs font-medium cursor-pointer",
              echoed && "text-[#E8552E] font-semibold",
            )}
          >
            <MessageCircle className="size-3.5 shrink-0" />
            <span>
              {unsaid.echoes.length > 0
                ? `${unsaid.echoes.length} ${unsaid.echoes.length === 1 ? "Echo" : "Echoes"}`
                : "Echo"}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => onShare(unsaid)}
            className="flex items-center gap-1.5 text-[#9C8F87] hover:text-[#F5EFE9] transition-colors font-sans text-xs font-medium cursor-pointer"
            title="Share Story Card"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Three-Dot Overflow Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              className="p-1 text-[#9C8F87] hover:text-[#F5EFE9] transition-colors rounded-full hover:bg-white/[0.04] cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-30 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1511]/98 py-1.5 shadow-2xl backdrop-blur-2xl animate-[slideUp_0.15s_ease-out] font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copy();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#F5EFE9]/90 hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Copy className="size-3.5 text-[#9C8F87]" />
                  <span>Copy text</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setGiftConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#F5EFE9]/90 hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Gift className="size-3.5 text-amber-400" />
                  <span>Send 10 warmth</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleVeto();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#F5EFE9]/90 hover:bg-white/[0.08] hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="size-3.5 text-[#9C8F87]" />
                  <span>Something feels off</span>
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
              className={cn(
                "text-foreground/90 font-vibe text-xs sm:text-sm leading-snug flex items-center flex-wrap gap-1",
                echo.id.startsWith("pending-") && "opacity-70 animate-pulse"
              )}
            >
              <span>{echo.text}</span>
              {echo.id.startsWith("pending-") && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/80">
                  <Clock className="size-2.5" />
                  <span>sending…</span>
                </span>
              )}
              {echo.handle ? (
                <a
                  href={getInstagramUrl(echo.handle)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                  title={`Visit Instagram @${stripHandle(echo.handle)}`}
                >
                  <span>@{stripHandle(echo.handle)}</span>
                  <Instagram className="size-2.5 text-primary shrink-0" aria-hidden />
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

          {(() => {
            const profanity = detectProfanity(echoText);
            const hasBadWords = profanity.hasProfanity;
            return (
              <>
                {hasBadWords && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-center text-[11px] text-rose-300 font-medium">
                    ⚠️ Inappropriate words (like f-words, s-words) are not allowed.
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={echoText}
                    onChange={(e) => setEchoText(e.target.value.slice(0, 200))}
                    placeholder="Spill your thoughts..."
                    className="bg-secondary/60 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-full border px-4 py-2 text-xs sm:text-sm font-vibe outline-none focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={hasBadWords || echoText.trim().length < 2}
                    className="bg-brand-gradient text-primary-foreground rounded-full px-5 py-2 text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition-opacity disabled:opacity-40"
                  >
                    Echo
                  </button>
                </div>
              </>
            );
          })()}

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
      {/* Gift Confirmation Modal */}
      {giftConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-[280px] rounded-3xl border border-white/10 bg-[#17110D]/90 p-4 text-center shadow-2xl backdrop-blur-2xl text-foreground font-sans animate-[scaleUp_0.18s_ease-out]">
            <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-2xl bg-[#E8552E]/10 border border-[#E8552E]/25 text-[#E8552E]">
              <Gift className="size-5" />
            </div>
            <h4 className="text-sm font-bold text-[#F5EFE9]">Send 10 warmth?</h4>
            <p className="text-[11px] text-[#9C8F87] mt-0.5">Spread quiet appreciation to this author.</p>
            <div className="mt-3.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGiftConfirmOpen(false)}
                className="w-full rounded-xl border border-white/10 py-1.5 text-xs font-medium text-[#9C8F87] hover:text-[#F5EFE9] hover:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendGift}
                disabled={totalWarmth < 10}
                className="w-full rounded-xl bg-[#E8552E] py-1.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-40 cursor-pointer"
              >
                {totalWarmth < 10 ? "Need 10🔥" : "Send 10🔥"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>

    {/* Public Profile View Modal */}
    <PublicProfileModal
      identifier={profileModalId}
      isOpen={Boolean(profileModalId)}
      onClose={() => setProfileModalId(null)}
    />
  </>
  );
}
