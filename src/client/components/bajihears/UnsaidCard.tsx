import { useRef, useState, useEffect } from "react";
import {
  Copy,
  Bookmark,
  Flame,
  Heart,
  HeartHandshake,
  Instagram,
  MessageCircle,
  CloudRain,
  Crown,
  MoreHorizontal,
  Clock,
  ShieldAlert,
  Share2,
  SmilePlus,
  Feather,
} from "lucide-react";
import { RevealCountdown } from "./RevealCountdown";
import { PublicProfileModal } from "./PublicProfileModal";
import { EchoThreadSheet } from "./EchoThreadSheet";
import { triggerHaptic } from "@/client/lib/haptics";
import { useWarmth } from "@/client/stores/warmth-context";
import {
  cn,
  compactCount,
  relativeTime,
  stripHandle,
  getInstagramUrl,
  getTier,
} from "@/shared/utils";
import { REACTIONS } from "@/shared/constants/reactions";
import type { ReactionKey, Unsaid } from "@/shared/types/unsaid";

const REACTION_ICON = {
  heart: Heart,
  sad: CloudRain,
  fire: Flame,
  hug: HeartHandshake,
} as const;

type Props = {
  unsaid: Unsaid;
  mine: ReactionKey[];
  echoed: boolean;
  reported: boolean;
  saved: boolean;
  myHandle: string | null;
  hero?: boolean;
  isWinner?: boolean;
  hook?: string;
  onReact: (id: string, key: ReactionKey) => void;
  onEcho: (id: string, text: string, echoHandle: string | null) => Promise<void>;
  onReport: (id: string) => Promise<string>;
  onReportEcho: (echoId: string) => Promise<string>;
  onSave: (unsaid: Unsaid) => void;
  onShare: (unsaid: Unsaid) => void;
};

export function UnsaidCard({
  unsaid,
  mine,
  echoed,
  reported,
  saved,
  myHandle,
  hero = false,
  isWinner = false,
  hook,
  onReact,
  onEcho,
  onReport,
  onReportEcho,
  onSave,
  onShare,
}: Props) {
  const { totalWarmth } = useWarmth();
  const [bounced, setBounced] = useState<ReactionKey | null>(null);
  const [burst, setBurst] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVetoed, setIsVetoed] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [vetoFeedback, setVetoFeedback] = useState<string | null>(null);
  const [showRxPicker, setShowRxPicker] = useState(false);
  const [profileModalId, setProfileModalId] = useState<string | null>(null);

  const lastTap = useRef(0);
  const cardRef = useRef<HTMLElement | null>(null);

  const handleVeto = async () => {
    if (reported || reporting) return;
    triggerHaptic("warning");
    setMenuOpen(false);
    setReporting(true);
    try {
      const message = await onReport(unsaid.id);
      setIsVetoed(true);
      setVetoFeedback(message);
    } catch (error) {
      setVetoFeedback(error instanceof Error ? error.message : "Unable to send that report");
    } finally {
      setReporting(false);
    }
    window.setTimeout(() => setVetoFeedback(null), 3000);
  };

  const react = (key: ReactionKey) => {
    triggerHaptic("impactLight");
    setBounced(key);
    window.setTimeout(() => setBounced(null), 220);
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
      const attribution =
        unsaid.sourceType === "editorial"
          ? "BajiHears Original · Fictional Story"
          : unsaid.handle
            ? `@${stripHandle(unsaid.handle)}`
            : "anonymous";
      await navigator.clipboard.writeText(
        `"${unsaid.text}"\n— ${attribution} • BajiHears`,
      );
      triggerHaptic("selection");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const isOwnPost = Boolean(
    unsaid.sourceType !== "editorial" &&
      unsaid.handle &&
      myHandle &&
      stripHandle(unsaid.handle) === stripHandle(myHandle),
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
        id={`thought-${unsaid.id}`}
        data-editorial-seed-id={unsaid.editorialSeedId ?? undefined}
        ref={cardRef}
        onPointerUp={onCardPointerUp}
        onPointerMove={onPointerMove}
        className={cn(
          "paper-card relative overflow-hidden p-5 transition-all duration-200 sm:p-6",
          isWinner
            ? "border-2 border-[#E3B8B1] bg-[#FFF9F6] shadow-[0_12px_36px_-16px_rgba(214,90,73,0.18)]"
            : unsaid.sourceType === "editorial"
              ? "border-[#E8DFD8] bg-[#FFFDFB] hover:border-[#D6A69F]"
              : "bg-card hover:border-[#CBB9B6]",
          isVetoed && "opacity-40 pointer-events-none",
        )}
      >
        {/* Real Floating Ember Hearth Burst on Explicit Reaction */}

        {/* Minimal Centered Heart Pop on Double-Tap (quick settle, does not compete with text) */}
        {burst && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="animate-like-heart-settle flex items-center justify-center">
              <Heart className="size-9 text-rose-500 fill-rose-500 drop-shadow-[0_2px_10px_rgba(244,63,94,0.5)]" />
            </div>
          </div>
        )}

        {/* Ambient glow reserved strictly for Winner card */}
        {/* Crowned Winner Header (Responsive, zero-collision layout) */}
        {isWinner && (
          <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 mb-3 border-b border-border relative z-10">
            <div className="flex items-center gap-2">
              <span
                className="flex size-7 items-center justify-center rounded-full bg-[#FBE6E4] text-[#7D3028]"
                aria-hidden
              >
                <Crown className="size-3.5" />
              </span>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold tracking-wide text-[#7D3028] leading-tight">
                  Featured thought
                </span>
                <span className="text-[10px] text-muted-foreground font-sans leading-tight">
                  Featured on @bajihears
                </span>
              </div>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Community pick
            </span>
          </div>
        )}

        {/* Card Header Row: Editorial collection label OR Standard Community Row */}
        {unsaid.sourceType === "editorial" ? (
          <div className="flex items-center justify-between gap-2.5 text-xs font-sans mb-3 pb-2.5 border-b border-[#E3B8B1]/40">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#7D3028] border border-[#E3B8B1]">
                <Feather className="size-3 text-[#7D3028]" aria-hidden />
                BajiHears Original · Fictional
              </span>
              {unsaid.displayOrder != null && (
                <span className="text-[11px] font-medium text-muted-foreground/80">
                  #{String(unsaid.displayOrder).padStart(2, "0")}
                </span>
              )}
            </div>

            <span className="shrink-0 border border-border-card text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-secondary/50">
              #{unsaid.category.toLowerCase().replace(/\s+/g, "")}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 text-xs font-sans mb-3 pb-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              {unsaid.handle ? (
                <div className="inline-flex items-center gap-1.5 truncate">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileModalId(unsaid.profileId || unsaid.handle);
                    }}
                    style={auraStyle}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer group"
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
                      className="text-muted-foreground hover:text-pink-500 transition-colors p-0.5 inline-flex items-center"
                      title="Open Instagram"
                    >
                      <Instagram
                        className="size-3 text-primary opacity-80 hover:opacity-100"
                        aria-hidden
                      />
                    </a>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                  <span className="listening-mark scale-75" aria-hidden /> Anonymous
                </span>
              )}
              <span className="text-muted-foreground/40 text-xs select-none">·</span>
              <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                {relativeTime(unsaid.createdAt)}
              </span>
            </div>

            <span className="shrink-0 border border-border-card text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-secondary/50">
              #{unsaid.category.toLowerCase().replace(/\s+/g, "")}
            </span>
          </div>
        )}

        {/* Quote: The Hero Body Text (never overlaps metadata or date) */}
        <p
          className={cn(
            "font-normal text-foreground tracking-normal [text-wrap:pretty]",
            isWinner
              ? "font-serif text-[22px] leading-[1.48] sm:text-[25px]"
              : "font-sans text-[18px] leading-[1.55] sm:text-[20px]",
          )}
        >
          {unsaid.text}
        </p>

        {/* Small muted status caption if Winner without header */}
        {isWinner && !hero && (
          <div className="mt-2.5 text-xs text-muted-foreground flex items-center gap-1.5 font-sans">
            <RevealCountdown className="text-muted-foreground" />
          </div>
        )}

        {/* Pending status caption */}
        {unsaid.status === "pending" && (
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1.5 font-sans">
            <Clock className="size-3 animate-spin" />
            <span>warming up: visible to others shortly</span>
          </div>
        )}

        {copied && (
          <p className="text-primary mt-2 text-center text-xs font-semibold animate-fade-in font-sans">
            Copied to clipboard
          </p>
        )}

        {vetoFeedback && (
          <p className="text-amber-600 mt-2 text-center text-xs font-semibold animate-fade-in flex items-center justify-center gap-1 font-sans">
            <ShieldAlert className="size-3.5" />
            <span>{vetoFeedback}</span>
          </p>
        )}

        {/* Bottom Action Row: Reactions, Echo, Share, and Overflow Menu */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-y-1 border-t border-border pt-3 text-xs font-sans">
          {/* Left: Reaction Cluster with Primary Heart */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={
                unsaid.reactions.heart > 0
                  ? `Relate ${compactCount(unsaid.reactions.heart)} to this thought`
                  : "Relate to this thought"
              }
              aria-pressed={mine.includes("heart")}
              onClick={() => react("heart")}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs transition-all active:scale-[.97] cursor-pointer",
                mine.includes("heart")
                  ? "border-primary/40 bg-accent text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Heart
                className={cn("size-3.5", mine.includes("heart") && "fill-current text-primary")}
              />
              <span className="font-sans font-semibold">Relate</span>
              {unsaid.reactions.heart > 0 && (
                <span className="tabular-nums text-[11px]">
                  {compactCount(unsaid.reactions.heart)}
                </span>
              )}
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
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <SmilePlus className="size-3.5" />
              </button>

              {showRxPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg animate-[slideUp_0.15s_ease-out]">
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
                          active
                            ? "text-primary bg-secondary"
                            : "text-muted-foreground hover:text-foreground",
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
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {/* Echo */}
            <button
              type="button"
              onClick={() => setThreadOpen(true)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer font-sans",
                echoed && "text-primary font-semibold",
              )}
            >
              <MessageCircle className="size-3.5 shrink-0" />
              <span>
                {unsaid.echoes.length > 0
                  ? `${unsaid.echoes.length} ${unsaid.echoes.length === 1 ? "Echo" : "Echoes"}`
                  : "Echo"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSave(unsaid)}
              aria-pressed={saved}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-colors hover:bg-secondary",
                saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title={saved ? "Remove from saved thoughts" : "Save on this device"}
            >
              <Bookmark className={cn("size-3.5", saved && "fill-current")} aria-hidden />
              <span className="sr-only sm:not-sr-only">{saved ? "Saved" : "Save"}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => onShare(unsaid)}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer font-sans"
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
                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <MoreHorizontal className="size-4" />
              </button>

              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 z-30 w-44 overflow-hidden rounded-2xl border border-border-card bg-card py-1.5 shadow-[0_8px_24px_-6px_rgba(62,43,38,0.12)] animate-[slideUp_0.15s_ease-out] font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      copy();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Copy className="size-3.5 text-[#9C8F87]" />
                    <span>Copy text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleVeto();
                    }}
                    disabled={reported || reporting}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-foreground hover:bg-secondary hover:text-amber-700 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="size-3.5 text-[#9C8F87]" />
                    <span>{reported ? "Reported" : reporting ? "Reporting…" : "Report post"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Public Profile View Modal */}
      <PublicProfileModal
        identifier={profileModalId}
        isOpen={Boolean(profileModalId)}
        onClose={() => setProfileModalId(null)}
      />
      <EchoThreadSheet
        open={threadOpen}
        post={unsaid}
        myHandle={myHandle}
        onClose={() => setThreadOpen(false)}
        onEcho={onEcho}
        onReportEcho={onReportEcho}
      />
    </>
  );
}
