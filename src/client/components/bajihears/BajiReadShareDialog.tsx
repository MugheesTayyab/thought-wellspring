import { useEffect, useRef, useState } from "react";
import { X, Share2, Download } from "lucide-react";
import { cn } from "@/shared/utils";
import { PRESETS, presetByKey } from "@/shared/constants/presets";
import { ArchetypeDefinition, ARCHETYPE_PRESET } from "@/client/lib/bajiRead";

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

export interface BajiReadShareDialogProps {
  archetype: ArchetypeDefinition;
  open: boolean;
  onClose: () => void;
}

export function BajiReadShareDialog({ archetype, open, onClose }: BajiReadShareDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string>(
    ARCHETYPE_PRESET[archetype.key] ?? PRESETS[0]!.key,
  );

  useEffect(() => {
    setPresetKey(ARCHETYPE_PRESET[archetype.key] ?? PRESETS[0]!.key);
  }, [archetype]);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const preset = presetByKey(presetKey);
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, preset.from);
    grad.addColorStop(1, preset.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 0, W, H);

    // Outer framing glow / border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    ctx.textAlign = "center";

    // Header "BAJI READ"
    ctx.font = '700 32px "Outfit", "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText("B A J I   R E A D", W / 2, 140);

    // Archetype Emoji
    ctx.font = "110px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(archetype.emoji, W / 2, 280);

    // Archetype Name
    ctx.font = '800 76px "Outfit", "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(archetype.name, W / 2, 390);

    // Hook line
    ctx.font = 'italic 500 38px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    const hookLines = wrap(ctx, `“${archetype.hookLine}”`, W - 220);
    hookLines.forEach((l, i) => {
      ctx.fillText(l, W / 2, 470 + i * 50);
    });

    // Divider Line
    const dividerY = 490 + hookLines.length * 50;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 160, dividerY);
    ctx.lineTo(W / 2 + 160, dividerY);
    ctx.stroke();

    // Full Paragraph Text
    ctx.font = '400 32px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    const paraLines = wrap(ctx, archetype.opening, W - 240);
    const paraStartY = dividerY + 60;
    const paraLh = 46;
    paraLines.forEach((l, i) => {
      ctx.fillText(l, W / 2, paraStartY + i * paraLh);
    });

    // Footer Watermark
    ctx.font = '700 30px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("BajiHears", W / 2, H - 90);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [open, archetype, presetKey]);

  if (!open) return null;

  const share = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${archetype.key}-read.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My Baji Read: ${archetype.name}`,
          text: `My Baji Read is ${archetype.name} ${archetype.emoji}: "${archetype.hookLine}"`,
        });
        return;
      }
    } catch {
      /* Fallback to direct download */
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${archetype.key}-read.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${archetype.name} to Story`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
    >
      <div className="w-full max-w-[320px] rounded-3xl border border-border-card bg-card p-5 text-foreground shadow-[0_20px_50px_-15px_rgba(62,43,38,0.2)] max-h-[92vh] overflow-y-auto no-scrollbar animate-[scaleUp_0.18s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs font-semibold text-foreground">Share your Baji Read</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-44 grid place-items-center cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview Image */}
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`${archetype.name} share preview`}
            className="mt-3.5 w-full rounded-2xl border border-border-card shadow-sm aspect-[4/5] object-cover"
          />
        ) : (
          <div className="bg-secondary mt-3.5 aspect-[4/5] w-full animate-pulse rounded-2xl border border-border-card" />
        )}

        {/* Preset Selector */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPresetKey(p.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95 cursor-pointer",
                presetKey === p.key
                  ? "border-primary bg-accent text-primary font-semibold"
                  : "border-border-card bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={share}
          className="bg-primary text-white mt-4 w-full min-h-11 rounded-2xl py-2.5 text-sm font-semibold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Share or download</span>
        </button>

        <p className="text-muted-foreground mt-2 text-center text-[11px] leading-tight">
          If direct sharing isn&apos;t supported on your browser, the card will download directly.
        </p>
      </div>
    </div>
  );
}
