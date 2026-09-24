import { ArchetypeDefinition, BAJI_READ_COST } from "@/client/lib/bajiRead";
import { Share2, Check, Copy } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BajiReadCardProps {
  archetype: ArchetypeDefinition;
  totalWarmth: number;
  bonusUnlocked: boolean;
  onSpendWarmth: () => void;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
}

export function BajiReadCard({
  archetype,
  totalWarmth,
  bonusUnlocked,
  onSpendWarmth,
  onCopy,
  onShare,
  copied,
}: BajiReadCardProps) {
  const canAffordBonus = totalWarmth >= BAJI_READ_COST;
  const warmthProgressPct = Math.min(100, Math.max(0, (totalWarmth / BAJI_READ_COST) * 100));

  return (
    <article
      role="article"
      aria-label={`Your Baji Read result: ${archetype.name}`}
      className="shimmer-card relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-[#161010]/80 to-transparent p-6 sm:p-8 backdrop-blur-xl shadow-soft animate-[slideUp_0.35s_ease-out] border-l-4 overflow-hidden"
      style={{ borderLeftColor: archetype.color }}
    >
      {/* Top subtle glow with archetype color */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-28 opacity-15 blur-2xl"
        style={{
          background: `radial-gradient(ellipse at top, ${archetype.color}, transparent)`,
        }}
      />

      {/* Header Tag */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/90">
          BAJI READ
        </span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: archetype.color }}
          aria-hidden="true"
        />
      </div>

      {/* Archetype Emoji with pop-in reveal */}
      <div className="mt-4 flex justify-center">
        <span className="text-5xl select-none inline-block archetype-reveal" aria-hidden="true">
          {archetype.emoji}
        </span>
      </div>

      {/* Archetype Name */}
      <h2
        className="mt-3 text-center font-display text-3xl sm:text-4xl font-extrabold tracking-tight"
        style={{
          background: `linear-gradient(135deg, #ffffff 20%, ${archetype.color} 80%, #ff8533 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {archetype.name}
      </h2>

      {/* Hook Line */}
      <p className="mt-2 text-center font-vibe text-sm sm:text-base text-white/80 italic px-2 leading-snug">
        &ldquo;{archetype.hookLine}&rdquo;
      </p>

      {/* Divider */}
      <div className="my-5 h-px w-full bg-white/10" />

      {/* Full Paragraph */}
      <p className="font-vibe text-sm sm:text-[15px] leading-relaxed text-white/90">
        {archetype.fullParagraph}
      </p>

      {/* Warmth Bonus Section */}
      <div className="mt-6">
        {bonusUnlocked ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
              <span>🔥</span>
              <span>Your deeper cut:</span>
            </div>
            <p className="mt-1.5 font-vibe text-xs sm:text-sm text-white/90 italic leading-relaxed">
              &ldquo;{archetype.bonusLine}&rdquo;
            </p>
          </div>
        ) : canAffordBonus ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                <span>🔥</span>
                <span>Unlock a deeper line</span>
              </span>
              <span className="font-mono text-[11px] text-primary">{totalWarmth} 🔥</span>
            </div>
            <p id="bonus-desc" className="font-vibe text-xs text-white/70 leading-normal">
              Spend 30 Warmth to reveal a more specific (and maybe a little savage) extra line about
              your type.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("celebration");
                onSpendWarmth();
              }}
              aria-describedby="bonus-desc"
              className="spring-press w-full py-2.5 rounded-xl bg-brand-gradient text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
            >
              Spend 30 Warmth
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <span>🔥</span>
                <span>Deeper line locked</span>
              </span>
              <span className="font-mono text-[11px] text-white/50">
                {totalWarmth} / {BAJI_READ_COST}
              </span>
            </div>
            <p className="font-vibe text-xs text-white/50">
              Earn {BAJI_READ_COST - totalWarmth} more Warmth by reacting or dueling to unlock your
              deeper cut.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary/70 transition-all duration-500"
                style={{ width: `${warmthProgressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-6 h-px w-full bg-white/10" />

      {/* Sharing & Copy Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onCopy();
          }}
          className="spring-press flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-3 text-xs font-semibold text-white transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 font-mono">Copied ✓</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-white/80" />
              <span>Copy text</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onShare();
          }}
          className="spring-press flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-brand-gradient hover:opacity-95 px-4 py-3 text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Share to Story</span>
        </button>
      </div>
    </article>
  );
}
