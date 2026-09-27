import { useRef, useState, useEffect } from "react";
import {
  Copy,
  Check,
  Flame,
  Heart,
  HeartHandshake,
  Instagram,
  MessageCircle,
  CloudRain,
  Gift,
  MoreHorizontal,
  Clock,
  ShieldAlert,
  Share2,
  SmilePlus,
} from "lucide-react";
import { RevealCountdown } from "./RevealCountdown";
import { HearthBurst } from "./HearthBurst";
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
} from "@/shared/utils";
import { REACTIONS } from "@/shared/constants/reactions";
import type { ReactionKey, Unsaid } from "@/shared/types/unsaid";

const REACTION_ICON = {
  heart: Heart,
  sad: CloudRain,
  fire: Flame,
  hug: HeartHandshake,
} as const;

const BURST_EMOJIS = ["⚡", "✨", "🔥", "📜", "✒️", "💥"];
const WINNER_BURST_EMOJIS = ["📜", "⚡", "🔥", "💥", "⚡", "✨", "📜"];

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

  const [hearthSpark, setHearthSpark] = useState(false);
  const [winnerCelebrated, setWinnerCelebrated] = useState(false);
  const lastTap = useRef(0);

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
      setVetoFeedback(res.underReview ? "Flagged for review" : "Filed in moderation log");
    } else {
      setVetoFeedback(res.reason ?? "Unable to flag");
    }
    window.setTimeout(() => setVetoFeedback(null), 3000);
  };

  const handleWinnerCrown = (key: ReactionKey = "heart") => {
    triggerHaptic("celebration");
    setWinnerCelebrated(true);
    setBurst(true);
    setHearthSpark(true);
    setBounced(key);
    window.setTimeout(() => setBounced(null), 300);
    window.setTimeout(() => setWinnerCelebrated(false), 2800);
    window.setTimeout(() => {
      setBurst(false);
      setHearthSpark(false);
    }, 1200);
    onReact(unsaid.id, key);
  };

  const react = (key: ReactionKey) => {
    if (isWinner) {
      handleWinnerCrown(key);
      return;
    }
    triggerHaptic("impactLight");
    setBounced(key);
    window.setTimeout(() => setBounced(null), 220);
    setHearthSpark(true);
    window.setTimeout(() => setHearthSpark(false), 950);
    onReact(unsaid.id, key);
  };

  const onCardPointerUp = () => {
    const t = Date.now();
    if (t - lastTap.current < 320) {
      lastTap.current = 0;
      if (isWinner) {
        handleWinnerCrown("heart");
        return;
      }
      triggerHaptic("celebration");
      if (!mine.includes("heart")) onReact(unsaid.id, "heart");
      setBurst(true);
      setHearthSpark(true);
      window.setTimeout(() => {
        setBurst(false);
        setHearthSpark(false);
      }, 950);
      return;
    }
    lastTap.current = t;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `"${unsaid.text}"\n[CASE FILE #${unsaid.id.slice(-4).toUpperCase()} — ${unsaid.handle ? `@${stripHandle(unsaid.handle)}` : "ANONYMOUS"}]`,
      );
      triggerHaptic("selection");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const caseId = unsaid.id.slice(-4).toUpperCase();

  return (
    <article
      onPointerUp={onCardPointerUp}
      className={cn(
        "relative rounded-sm border-2 select-none p-4 sm:p-5 overflow-hidden transition-all duration-150 font-sans",
        isWinner
          ? "border-[#C42B2B] bg-[#E6DCCB] text-[#111111] shadow-[6px_6px_0px_#C42B2B]"
          : "border-[#111111] bg-[#ECE5D8] text-[#111111] shadow-[4px_4px_0px_#111111]",
        isVetoed && "opacity-40 pointer-events-none",
      )}
    >
      {/* Real Floating Ember Burst on Reaction or Double-Tap */}
      {hearthSpark && <HearthBurst />}

      {/* Confirmed Vote Banner Toast */}
      {winnerCelebrated && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1 bg-[#C42B2B] text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-[3px_3px_0px_#111111] border border-[#111111]">
          <span>[ VERDICT RECORDED: +3 WARMTH ]</span>
        </div>
      )}

      {/* Floating Stencil Burst Particles */}
      {burst && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-3 overflow-hidden">
          {(isWinner ? WINNER_BURST_EMOJIS : BURST_EMOJIS).map((emoji, idx) => (
            <span
              key={idx}
              className="float-up-particle text-3xl select-none"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* RAW RED INK RUBBER STAMP FOR CYCLE LAUREATE (No crowns, pure evidence classification) */}
      {isWinner && (
        <div className="pointer-events-none absolute top-3 right-3 z-10 rotate-[-3.5deg] border-2 border-[#C42B2B] bg-[#E6DCCB]/90 px-2.5 py-1 text-[#C42B2B] font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-wider leading-none shadow-[1px_1px_0px_#C42B2B]">
          <div>[ EXHIBIT A ]</div>
          <div className="text-[10px] text-[#C42B2B]/90 mt-0.5">CYCLE LAUREATE</div>
        </div>
      )}

      {/* Technical Docket Header Bar */}
      <div className="border-b border-[#D6CDBF] pb-2.5 mb-3 flex items-center justify-between font-mono text-[11px] text-[#645E55]">
        <div className="flex items-center gap-2">
          <span className="bg-[#111111] text-[#ECE5D8] px-1.5 py-0.5 font-bold tracking-tight">
            CASE #{caseId}
          </span>
          <span className="hidden sm:inline text-[#888175]">DOCKET RECORD</span>
        </div>

        <div className="flex items-center gap-2">
          {isWinner ? (
            <RevealCountdown className="text-[#C42B2B] font-bold text-[11px]" prefix="EXPIRATION: " />
          ) : (
            <span className="text-[#645E55]">{relativeTime(unsaid.createdAt)}</span>
          )}
        </div>
      </div>

      {/* Quote Confession: Bold, Upright, High-Impact Sans (NO Italics, NO Serif) */}
      <div className="my-2">
        <p className="font-quote font-bold text-[19px] sm:text-[22px] leading-[1.38] text-[#111111] tracking-tight select-text">
          {unsaid.text}
        </p>
      </div>

      {/* Structured Field Data Matrix (Replaces Middle Dots & Soft Badges) */}
      <div className="mt-4 border border-[#D6CDBF] bg-[#E4DACB] p-2.5 font-mono text-[11px] text-[#332E27] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[#777065] font-bold">DEPOSITED BY:</span>
          {unsaid.handle ? (
            <a
              href={getInstagramUrl(unsaid.handle)!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[#111111] underline hover:bg-[#111111] hover:text-[#ECE5D8] px-1 transition-colors"
            >
              <Instagram className="size-3 shrink-0" aria-hidden />
              <span>@{stripHandle(unsaid.handle)}</span>
            </a>
          ) : (
            <span className="text-[#111111] font-bold">[ ANONYMOUS ]</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#777065] font-bold">CLASSIFICATION:</span>
          <span className="text-[#111111] font-bold uppercase">
            #{unsaid.category.toLowerCase().replace(/\s+/g, "")}
          </span>
        </div>
      </div>

      {copied && (
        <p className="text-[#C42B2B] mt-2 font-mono text-xs font-bold animate-fade-in text-center">
          [ COPIED TO CLIPBOARD ]
        </p>
      )}

      {vetoFeedback && (
        <p className="text-[#C42B2B] mt-2 font-mono text-xs font-bold animate-fade-in flex items-center justify-center gap-1">
          <ShieldAlert className="size-3.5" />
          <span>[ {vetoFeedback.toUpperCase()} ]</span>
        </p>
      )}

      {/* Action Row: Sharp Rectangular Evidence Tickets */}
      <div className="mt-4 border-t border-[#D6CDBF] pt-3 flex items-center justify-between flex-wrap gap-2 font-mono text-xs">
        {/* Voting / Reaction Ticket */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => react("heart")}
            aria-label="Cast verdict vote"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 border border-[#111111] font-bold transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]",
              mine.includes("heart")
                ? "bg-[#C42B2B] text-white shadow-[2px_2px_0px_#111111]"
                : "bg-[#F7F3EB] text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8] shadow-[2px_2px_0px_#111111]",
            )}
          >
            <Heart className={cn("size-3.5", mine.includes("heart") && "fill-current")} />
            <span>{isWinner ? "CROWN VERDICT" : "VERDICT"}</span>
            <span className="bg-[#111111] text-[#ECE5D8] px-1 py-0.2 text-[10px] ml-0.5">
              {compactCount(unsaid.reactions.heart)}
            </span>
          </button>

          {/* Additional Quick Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRxPicker((v) => !v)}
              aria-label="More verdict marks"
              className="p-1.5 border border-[#111111] bg-[#F7F3EB] hover:bg-[#111111] hover:text-[#ECE5D8] transition-colors cursor-pointer shadow-[2px_2px_0px_#111111]"
            >
              <SmilePlus className="size-3.5" />
            </button>

            {showRxPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-1 border-2 border-[#111111] bg-[#ECE5D8] p-1.5 shadow-[4px_4px_0px_#111111]">
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
                        "p-1.5 border border-[#111111] transition-all cursor-pointer",
                        active ? "bg-[#C42B2B] text-white" : "bg-[#F7F3EB] text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8]",
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

        {/* Right Action Tickets: Echo, Share, Options */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (unsaid.echoes.length > 0) setOpenEchoes((v) => !v);
              else setEchoOpen((v) => !v);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 border border-[#111111] transition-all cursor-pointer font-bold shadow-[2px_2px_0px_#111111]",
              echoed
                ? "bg-[#111111] text-[#ECE5D8]"
                : "bg-[#F7F3EB] text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8]",
            )}
          >
            <MessageCircle className="size-3.5" />
            <span>ECHOES ({unsaid.echoes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onShare(unsaid)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#111111] bg-[#F7F3EB] text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8] transition-all cursor-pointer font-bold shadow-[2px_2px_0px_#111111]"
            title="Export Evidence Card"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">EXHIBIT</span>
          </button>

          {/* Three-Dot Option Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Docket options"
              className="p-1.5 border border-[#111111] bg-[#F7F3EB] hover:bg-[#111111] hover:text-[#ECE5D8] transition-colors cursor-pointer shadow-[2px_2px_0px_#111111]"
            >
              <MoreHorizontal className="size-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-30 w-48 border-2 border-[#111111] bg-[#ECE5D8] p-1 shadow-[4px_4px_0px_#111111] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copy();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-bold text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8] transition-colors cursor-pointer"
                >
                  <Copy className="size-3.5" />
                  <span>COPY EVIDENCE</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setGiftConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-bold text-[#111111] hover:bg-[#111111] hover:text-[#ECE5D8] transition-colors cursor-pointer border-t border-[#D6CDBF]"
                >
                  <Gift className="size-3.5 text-[#C42B2B]" />
                  <span>TRANSFER 10 WARMTH</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleVeto();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-bold text-[#C42B2B] hover:bg-[#C42B2B] hover:text-white transition-colors cursor-pointer border-t border-[#D6CDBF]"
                >
                  <ShieldAlert className="size-3.5" />
                  <span>FLAG EVIDENCE</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Echo List Foldout */}
      {openEchoes && unsaid.echoes.length > 0 && (
        <div className="mt-3 border-t border-dashed border-[#D6CDBF] pt-2.5 space-y-2 font-mono text-xs">
          <div className="text-[10px] text-[#777065] font-bold uppercase tracking-wider">
            [ RECORDED ECHO LOGS ]
          </div>
          {unsaid.echoes.map((echo) => (
            <div
              key={echo.id}
              className="border border-[#D6CDBF] bg-[#E4DACB] p-2 flex items-center justify-between text-[#111111]"
            >
              <span>{echo.text}</span>
              <span className="text-[10px] font-bold text-[#645E55]">
                {echo.handle ? `@${stripHandle(echo.handle)}` : "@anonymous"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Echo Input Form */}
      {echoOpen && !echoed && (
        <form
          className="mt-3 border-t border-dashed border-[#D6CDBF] pt-2.5 space-y-2 font-mono text-xs"
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
          <div className="flex flex-wrap gap-1">
            {QUICK_VIBES.map((vibe) => (
              <button
                key={vibe}
                type="button"
                onClick={() => setEchoText(vibe)}
                className="border border-[#111111] bg-[#F7F3EB] hover:bg-[#111111] hover:text-[#ECE5D8] px-2 py-0.5 text-[10px] font-bold"
              >
                {vibe}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={echoText}
              onChange={(e) => setEchoText(e.target.value.slice(0, 200))}
              placeholder="Record echo statement..."
              className="w-full border border-[#111111] bg-[#F7F3EB] px-3 py-1.5 text-xs text-[#111111] outline-none placeholder:text-[#888175]"
            />
            <button
              type="submit"
              className="border border-[#111111] bg-[#111111] text-[#ECE5D8] px-4 py-1.5 font-bold uppercase hover:bg-[#C42B2B] transition-colors"
            >
              SUBMIT
            </button>
          </div>
        </form>
      )}

      {/* Gift Confirmation Modal */}
      {giftConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-[300px] border-2 border-[#111111] bg-[#ECE5D8] p-4 text-center shadow-[6px_6px_0px_#111111] text-[#111111] font-mono">
            <div className="mx-auto mb-2 flex size-9 items-center justify-center border border-[#111111] bg-[#C42B2B] text-white">
              <Gift className="size-4" />
            </div>
            <h4 className="text-xs font-bold uppercase">TRANSFER 10 WARMTH?</h4>
            <p className="text-[11px] text-[#645E55] mt-1">Direct transfer to case deposition.</p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGiftConfirmOpen(false)}
                className="w-full border border-[#111111] bg-[#F7F3EB] py-1.5 text-xs font-bold uppercase hover:bg-[#111111] hover:text-[#ECE5D8]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSendGift}
                disabled={totalWarmth < 10}
                className="w-full border border-[#111111] bg-[#C42B2B] text-white py-1.5 text-xs font-bold uppercase hover:bg-[#111111] disabled:opacity-40"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
