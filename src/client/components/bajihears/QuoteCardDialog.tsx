import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn, stripHandle } from "@/shared/utils";
import { PRESETS, presetByKey } from "@/shared/constants/presets";
import { SITE_HOST } from "@/shared/constants/site";
import { CARD_FORMATS, fitQuote, type CardFormatKey } from "@/shared/lib/quote-card";
import type { Unsaid } from "@/shared/types/unsaid";

const QUOTE_FONT = '"Fraunces", Georgia, serif';
const LABEL_FONT = '"DM Sans", system-ui, sans-serif';

// Canvas text doesn't trigger font loading, so ask for the fonts first. A slow or
// blocked font shouldn't hold the card up: it falls back to the system font.
function fontsReady(): Promise<unknown> {
  return Promise.race([
    Promise.all([
      document.fonts.load(`600 64px ${QUOTE_FONT}`),
      document.fonts.load(`600 38px ${LABEL_FONT}`),
    ]).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 1500)),
  ]);
}

function attributionFor(post: CardPost): string {
  if (post.sourceType === "editorial") return "BajiHears Original · Fictional Story";
  return post.handle ? `@${stripHandle(post.handle)}` : "Anonymous";
}

export type CardPost = Pick<Unsaid, "text" | "handle" | "sourceType" | "preset">;

export function QuoteCardDialog({
  unsaid,
  onClose,
}: {
  unsaid: CardPost | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string>(unsaid?.preset ?? PRESETS[0]!.key);
  const [formatKey, setFormatKey] = useState<CardFormatKey>("reel");
  const format = CARD_FORMATS[formatKey];

  useEffect(() => {
    if (unsaid) setPresetKey(unsaid.preset);
  }, [unsaid]);

  useEffect(() => {
    if (!unsaid) return;
    let cancelled = false;

    void fontsReady().then(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (cancelled || !canvas || !ctx) return;

      const { width, height } = format;
      const preset = presetByKey(presetKey);
      canvas.width = width;
      canvas.height = height;

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, preset.from);
      grad.addColorStop(1, preset.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = "center";
      ctx.fillStyle = preset.ink;

      const quoteFont = (size: number) => `600 ${size}px ${QUOTE_FONT}`;
      const fitted = fitQuote(unsaid.text, format, (value, size) => {
        ctx.font = quoteFont(size);
        return ctx.measureText(value).width;
      });
      ctx.font = quoteFont(fitted.fontSize);
      fitted.lines.forEach((line, index) =>
        ctx.fillText(line, width / 2, fitted.firstBaseline + index * fitted.lineHeight),
      );

      ctx.globalAlpha = 0.85;
      ctx.font = `600 36px ${LABEL_FONT}`;
      ctx.fillText(attributionFor(unsaid), width / 2, format.attributionY);
      ctx.globalAlpha = 0.9;
      ctx.font = `700 46px ${LABEL_FONT}`;
      ctx.fillText(SITE_HOST, width / 2, format.brandY);
      ctx.globalAlpha = 1;

      setDataUrl(canvas.toDataURL("image/png"));
    });

    return () => {
      cancelled = true;
    };
  }, [unsaid, presetKey, format]);

  if (!unsaid) return null;

  const download = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = format.fileName;
    link.click();
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) return;
    // toBlob rather than fetch(dataUrl): the site's security policy blocks fetching data: URLs.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      const file = new File([blob], format.fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (error) {
          // Backing out of the share sheet isn't a request to download instead.
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
    }
    download();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this thought as an image"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[340px] overflow-y-auto rounded-3xl border border-border-card bg-card p-5 text-foreground shadow-[0_20px_50px_-15px_rgba(62,43,38,0.2)] animate-[scaleUp_0.18s_ease-out]"
      >
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-semibold text-foreground">Share as an image</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-44 grid cursor-pointer place-items-center p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(CARD_FORMATS) as CardFormatKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={formatKey === key}
              onClick={() => setFormatKey(key)}
              className={cn(
                "min-h-11 cursor-pointer rounded-xl border px-2 text-xs font-medium transition-colors",
                formatKey === key
                  ? "border-primary bg-accent font-semibold text-primary"
                  : "border-border-card bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {CARD_FORMATS[key].label}
            </button>
          ))}
        </div>

        <canvas ref={canvasRef} className="hidden" />
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Preview of the image"
            className="mx-auto mt-3 max-h-[46dvh] w-auto rounded-2xl border border-border-card shadow-sm"
          />
        ) : (
          <div className="mx-auto mt-3 h-[46dvh] w-full animate-pulse rounded-2xl border border-border-card bg-secondary" />
        )}

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={presetKey === p.key}
              onClick={() => setPresetKey(p.key)}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
                presetKey === p.key
                  ? "border-primary bg-accent font-semibold text-primary"
                  : "border-border-card bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={share}
          disabled={!dataUrl}
          className="mt-4 min-h-11 w-full cursor-pointer rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:bg-secondary disabled:text-muted-foreground"
        >
          Share or download
        </button>
        <p className="mt-2 text-center text-[11px] leading-tight text-muted-foreground">
          If nothing happens, press and hold the image to save it. Some in-app browsers block
          downloads.
        </p>
      </div>
    </div>
  );
}
