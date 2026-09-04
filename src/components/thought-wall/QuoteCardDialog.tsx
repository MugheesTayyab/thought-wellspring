import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Thought } from "@/lib/thought-wall";

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function QuoteCardDialog({
  thought,
  onClose,
}: {
  thought: Thought | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!thought) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#ff9a2b");
    grad.addColorStop(1, "#e0192b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, W, H);

    const size = thought.text.length > 160 ? 60 : thought.text.length > 90 ? 72 : 88;
    ctx.font = `700 ${size}px "Archivo Black", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff8f2";
    const lines = wrap(ctx, thought.text, W - 200);
    const lh = size * 1.28;
    const start = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, start + i * lh));

    ctx.font = '500 38px "Hind", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255,248,242,0.82)";
    ctx.fillText(thought.handle ?? "anonymous", W / 2, H - 190);
    ctx.font = '600 34px "Hind", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255,248,242,0.65)";
    ctx.fillText("thoughtwall", W / 2, H - 110);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [thought]);

  if (!thought) return null;

  const share = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "thoughtwall.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: thought.text });
        return;
      }
    } catch {
      /* fall through to download */
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "thoughtwall.png";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Share this to your story</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Shareable quote card preview"
            className="mt-3 w-full rounded-xl"
          />
        ) : (
          <div className="bg-muted mt-3 aspect-[4/5] w-full animate-pulse rounded-xl" />
        )}

        <button
          type="button"
          onClick={share}
          className="bg-brand-gradient text-primary-foreground mt-3 w-full rounded-xl py-3 text-sm font-semibold"
        >
          Share it
        </button>
        <p className="text-muted-foreground mt-2 text-center text-[11px]">
          If sharing isn&apos;t available, the image saves to your photos instead.
        </p>
      </div>
    </div>
  );
}
