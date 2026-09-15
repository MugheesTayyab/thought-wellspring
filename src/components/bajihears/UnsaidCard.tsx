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
  hook,
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
    window.setTimeout(() => setBounced(null), 200);
    onReact(unsaid.id, key);
  };

  // Instagram-style double tap anywhere on the card = heart.
  const onCardPointerUp = () => {
    const t = Date.now();
    if (t - lastTap.current < 320) {
      lastTap.current = 0;
      if (!mine.includes("heart")) onReact(unsaid.id, "heart");
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
      return;
    }
    lastTap.current = t;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${unsaid.text}\n— ${unsaid.handle ?? "anonymous"}, BajiHears`);
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
        "slide-in-card tilt-card relative overflow-hidden rounded-3xl border p-5",
        hero
          ? "bg-hero-gradient border-primary/25 shadow-glow px-5 py-6"
          : "bg-card border-border/80 shadow-soft",
      )}
    >
      {burst && (
        <span className="react-pop pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart className="text-primary size-20 fill-current drop-shadow" aria-hidden />
        </span>
      )}

      {hero && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="bg-brand-gradient text-primary-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">
              Last cycle&apos;s winner
            </span>
            <RevealCountdown />
          </div>
          {hook && <p className="text-primary/90 mt-4 text-center text-sm italic">{hook}</p>}
        </>
      )}

      <p
        className={cn(
          "font-display text-foreground text-balance",
          hero ? "mt-3 text-center text-xl leading-relaxed sm:text-2xl" : "text-base leading-relaxed",
        )}
      >
        {unsaid.text}
      </p>

      <div
        className={cn(
          "text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-wide",
          hero && "justify-center",
        )}
      >
        <span>{unsaid.handle ?? "anonymous"}</span>
        <span aria-hidden>·</span>
        <span>{relativeTime(unsaid.createdAt)}</span>
        <span aria-hidden>·</span>
        <span className="border-border/70 rounded-full border px-2 py-0.5">{unsaid.category}</span>
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
        />
      </div>

      {/* Row 1 — reactions */}
      <div
        className={cn(
          "border-border/50 mt-4 grid grid-cols-4 gap-2 border-t pt-4",
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
                "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl border text-xs tabular-nums transition-colors",
                active
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn("inline-flex shrink-0", bounced === rx.key && "react-pop inline-block")}
              >
                <Icon className={cn("size-4", active && "text-primary fill-current")} aria-hidden />
              </span>
              {compactCount(unsaid.reactions[rx.key])}
            </button>
          );
        })}
      </div>

      {copied && <p className="text-primary mt-2 text-center text-[11px]">Copied.</p>}

      {/* Row 2 — secondary actions */}
      <div className="text-muted-foreground/80 mt-3 flex items-center gap-4 text-[11px]">
        {unsaid.echoes.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenEchoes((v) => !v)}
            className="text-primary/90 min-h-11 shrink-0"
          >
            {openEchoes
              ? "Hide Echoes"
              : `${unsaid.echoes.length} ${unsaid.echoes.length === 1 ? "Echo" : "Echoes"}`}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEchoOpen((v) => !v)}
          disabled={echoed}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-1.5",
            echoed ? "opacity-60" : "hover:text-foreground",
          )}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {echoed ? "Echoed" : "Echo"}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={copy}
            aria-label="Copy text"
            title="Copy"
            className="tap-44 hover:text-foreground grid min-h-11 min-w-9 place-items-center transition-colors"
          >
            <Copy className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onShare(unsaid)}
            aria-label="Share to Instagram Story"
            title="Share"
            className="tap-44 hover:text-primary grid min-h-11 min-w-9 place-items-center transition-colors"
          >
            <Instagram className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onReport(unsaid.id)}
            disabled={reported}
            aria-label={reported ? "Reported" : "Report this Unsaid"}
            title={reported ? "Reported" : "Report"}
            className={cn(
              "tap-44 flex min-h-11 items-center gap-1 transition-colors",
              reported ? "opacity-60" : "hover:text-destructive",
            )}
          >
            <Flag className="size-3.5" aria-hidden />
            <span>{reported ? "Reported" : "Report"}</span>
          </button>
        </div>
      </div>

      {openEchoes && unsaid.echoes.length > 0 && (
        <ul className="border-border/70 mt-3 space-y-2 border-l pl-3">
          {unsaid.echoes.map((echo) => (
            <li key={echo.id} className="text-foreground/80 text-sm">
              {echo.text}
              <span className="text-muted-foreground ml-2 text-[11px]">
                {echo.handle ?? "anonymous"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {echoOpen && !echoed && (
        <form
          className="mt-3 space-y-2"
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
          <div className="flex gap-2">
            <input
              value={echoText}
              onChange={(e) => setEchoText(e.target.value.slice(0, 200))}
              placeholder="Your words matter"
              className="bg-secondary/50 border-border placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-full border px-4 py-2 text-sm outline-none focus:ring-2"
            />
            <button
              type="submit"
              className="bg-brand-gradient text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold"
            >
              Echo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEchoAnon(true)}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-xs font-semibold",
                echoAnon
                  ? "border-primary bg-primary/15 text-foreground"
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
                "min-h-11 rounded-xl border px-3 text-xs font-semibold",
                !echoAnon
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
                !myHandle && "opacity-50",
              )}
            >
              {myHandle ? `As ${myHandle}` : "Post as @handle"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
