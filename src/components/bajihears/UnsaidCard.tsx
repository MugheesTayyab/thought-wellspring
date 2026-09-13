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
    window.setTimeout(() => setBounced(null), 320);
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
        "pop-in tilt-card relative overflow-hidden rounded-3xl border p-4 shadow-soft",
        hero ? "bg-hero-gradient border-primary/40 shadow-glow px-4 py-6" : "bg-card border-border",
      )}
    >
      {burst && (
        <span className="bounce-once pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart className="text-primary size-20 fill-current drop-shadow" aria-hidden />
        </span>
      )}

      {hero && (
        <>
          <span className="bg-brand-gradient text-primary-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Last cycle&apos;s winner
          </span>
          {hook && (
            <p className="text-primary mt-4 text-center text-sm italic">{hook}</p>
          )}
        </>
      )}

      <p
        className={cn(
          "font-display text-balance",
          hero ? "mt-2 text-center text-xl leading-snug sm:text-2xl" : "text-base leading-snug",
        )}
      >
        {unsaid.text}
      </p>

      <div
        className={cn(
          "text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs",
          hero && "justify-center",
        )}
      >
        <span>{unsaid.handle ?? "anonymous"}</span>
        <span aria-hidden>·</span>
        <span>{relativeTime(unsaid.createdAt)}</span>
        <span aria-hidden>·</span>
        <span className="border-border rounded-full border px-2 py-0.5">{unsaid.category}</span>
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
        />
      </div>

      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2",
          hero && "justify-center gap-x-2 px-1",
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
                "flex min-w-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs tabular-nums transition-colors",
                active
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex shrink-0",
                  bounced === rx.key && "bounce-once inline-block",
                )}
              >
                <Icon
                  className={cn("size-3.5", active && "text-primary fill-current")}
                  aria-hidden
                />
              </span>
              {compactCount(unsaid.reactions[rx.key])}
            </button>
          );
        })}

      </div>

      {copied && <p className="text-primary mt-2 text-center text-[11px]">Copied.</p>}

      <div
        className={cn(
          "mt-3 flex items-center gap-3 text-[11px]",
          hero && "justify-center gap-4",
        )}
      >
        {unsaid.echoes.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenEchoes((v) => !v)}
            className="text-primary shrink-0"
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
            "flex shrink-0 items-center gap-1",
            echoed ? "text-muted-foreground/60" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {echoed ? "Echoed" : "Echo"}
        </button>

        <div className={cn("flex items-center gap-1", !hero && "ml-auto")}>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy text"
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            <Copy className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onShare(unsaid)}
            aria-label="Share to Instagram Story"
            className="text-muted-foreground hover:text-primary p-1 transition-colors"
          >
            <Instagram className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onReport(unsaid.id)}
            disabled={reported}
            aria-label={reported ? "Reported" : "Report"}
            className={cn(
              "p-1 transition-colors",
              reported ? "text-muted-foreground/60" : "text-muted-foreground hover:text-destructive",
            )}
          >
            <Flag className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {openEchoes && unsaid.echoes.length > 0 && (
        <ul className="border-border/70 mt-3 space-y-2 border-l pl-3">
          {unsaid.echoes.map((echo) => (
            <li key={echo.id} className="text-muted-foreground text-sm">
              {echo.text}
              <span className="ml-2 text-xs opacity-70">{echo.handle ?? "anonymous"}</span>
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
                "rounded-lg border px-3 py-2 text-xs font-semibold",
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
                "rounded-lg border px-3 py-2 text-xs font-semibold",
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
