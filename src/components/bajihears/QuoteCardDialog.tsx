import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESETS, presetByKey, type Unsaid } from "@/lib/bajihears";

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
  unsaid,
  onClose,
}: {
  unsaid: Unsaid | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string>(unsaid?.preset ?? PRESETS[0]!.key);

  useEffect(() => {
    if (unsaid) setPresetKey(unsaid.preset);
  }, [unsaid]);

  useEffect(() => {
    if (!unsaid) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const preset = presetByKey(presetKey);
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, preset.from);
    grad.addColorStop(1, preset.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, W, H);

    const size = unsaid.text.length > 160 ? 60 : unsaid.text.length > 90 ? 72 : 88;
    ctx.font = `700 ${size}px "Archivo Black", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = preset.ink;
    const lines = wrap(ctx, unsaid.text, W - 200);
    const lh = size * 1.28;
    const start = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, start + i * lh));

    ctx.globalAlpha = 0.82;
    ctx.font = '500 38px "Hind", system-ui, sans-serif';
    ctx.fillText(unsaid.handle ?? "anonymous", W / 2, H - 190);
    ctx.globalAlpha = 0.65;
    ctx.font = '600 34px "Hind", system-ui, sans-serif';
    ctx.fillText("BajiHears", W / 2, H - 110);
    ctx.globalAlpha = 1;

    setDataUrl(canvas.toDataURL("image/png"));
  }, [unsaid, presetKey]);

  if (!unsaid) return null;

  const share = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "bajihears.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: unsaid.text });
        return;
      }
    } catch {
      /* fall through to download */
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "bajihears.png";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Share to your story</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        {dataUrl ? (
          <img src={dataUrl} alt="Shareable quote card preview" className="mt-3 w-full rounded-xl" />
        ) : (
          <div className="bg-muted mt-3 aspect-[4/5] w-full animate-pulse rounded-xl" />
        )}

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPresetKey(p.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                presetKey === p.key
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={share}
          className="bg-brand-gradient text-primary-foreground mt-3 w-full rounded-xl py-3 text-sm font-semibold"
        >
          Share to Instagram Story
        </button>
        <p className="text-muted-foreground mt-2 text-center text-[11px]">
          If sharing isn&apos;t available, the image saves to your photos instead.
        </p>
      </div>
    </div>
  );
}
