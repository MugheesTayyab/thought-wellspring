import { ArchetypeDefinition, BAJI_READ_COST, TraitBreakdown } from "@/client/lib/bajiRead";
import { Share2, Check, Copy, Eye, Heart, Sparkles, Flame, ShieldAlert } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BajiReadCardProps {
  archetype: ArchetypeDefinition;
  totalWarmth: number;
  bonusUnlocked: boolean;
  onSpendWarmth: () => void;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
  matchAccuracy?: number;
  traits?: TraitBreakdown;
  vibeSignature?: string;
  evidenceSummary?: string;
}

export function BajiReadCard({
  archetype,
  totalWarmth,
  bonusUnlocked,
  onSpendWarmth,
  onCopy,
  onShare,
  copied,
  matchAccuracy = 96,
  traits,
  vibeSignature,
  evidenceSummary,
}: BajiReadCardProps) {
  const canAffordBonus = totalWarmth >= BAJI_READ_COST;
  const warmthProgressPct = Math.min(100, Math.max(0, (totalWarmth / BAJI_READ_COST) * 100));

  const resolvedTraits: TraitBreakdown = traits ?? archetype.defaultTraits;

  return (
    <article
      role="article"
      aria-label={`Your Baji Read result: ${archetype.name}`}
      className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-[#1c1511] via-[#140e0b] to-[#0d0906] p-5 sm:p-7 backdrop-blur-2xl shadow-2xl animate-[slideUp_0.3s_ease-out] overflow-hidden"
    >
      {/* Top subtle glow matching archetype color */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-56 opacity-25 blur-3xl rounded-full"
        style={{
          background: `radial-gradient(circle, ${archetype.color} 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Header Eyebrow: Archetype Tag + Match Confidence */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[#F5EFE9]">
          <Eye className="size-3 text-[#E8552E]" />
          <span className="font-mono text-[11px] font-bold tracking-wide">
            BAJI PSYCH-READ
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#9C8F87]">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono font-semibold text-emerald-400">
            {matchAccuracy}% Match
          </span>
        </div>
      </div>

      {/* Emoji & Archetype Name */}
      <div className="mt-5 text-center">
        <div className="inline-flex size-16 sm:size-20 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner">
          <span className="text-4xl sm:text-5xl select-none" aria-hidden="true">
            {archetype.emoji}
          </span>
        </div>

        <h2 className="mt-3.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5EFE9]">
          {archetype.name}
        </h2>

        <p className="mt-1 font-sans text-xs sm:text-sm font-medium text-[#E8552E]">
          {archetype.tagline}
        </p>

        {/* Vibe Signature Pill */}
        {vibeSignature && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#F5EFE9]/90 shadow-sm">
            <Flame className="size-3 text-[#E8552E] shrink-0" />
            <span>{vibeSignature}</span>
          </div>
        )}

        {/* Hook Line Quote */}
        <p className="mt-3 font-quote text-sm sm:text-base text-[#F5EFE9]/90 italic px-2 leading-relaxed">
          &ldquo;{archetype.hookLine}&rdquo;
        </p>
      </div>

      {/* Divider */}
      <div className="my-5 h-px w-full bg-white/[0.08]" />

      {/* Deep Psychological Paragraph */}
      <div className="space-y-3 font-sans text-xs sm:text-sm leading-relaxed text-[#F5EFE9]/85">
        <p>{archetype.fullParagraph}</p>
      </div>

      {/* "How Others Secretly Perceive You" — Key Relatable Hook */}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
        <div className="flex items-center gap-2 text-xs font-bold text-[#F5EFE9] mb-1.5">
          <Eye className="size-3.5 text-sky-400 shrink-0" />
          <span>How people secretly think of you</span>
        </div>
        <p className="font-sans text-xs text-[#9C8F87] leading-relaxed">
          {archetype.howOthersSeeYou}
        </p>
      </div>

      {/* "Your Secret Vulnerability" */}
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left">
        <div className="flex items-center gap-2 text-xs font-bold text-[#F5EFE9] mb-1.5">
          <Heart className="size-3.5 text-rose-400 shrink-0" />
          <span>What you secretly hide</span>
        </div>
        <p className="font-sans text-xs text-[#9C8F87] leading-relaxed">
          {archetype.secretVulnerability}
        </p>
      </div>

      {/* Telemetry Accuracy Evidence */}
      {evidenceSummary && (
        <div className="mt-3 rounded-2xl border border-[#E8552E]/20 bg-[#E8552E]/[0.04] p-3 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E8552E] mb-1">
            <Flame className="size-3 shrink-0" />
            <span>Telemetry Verification</span>
          </div>
          <p className="font-sans text-[11px] text-[#9C8F87] leading-relaxed">
            {evidenceSummary}
          </p>
        </div>
      )}

      {/* Vibe Trait Breakdown (Empathy, Intuition, Chaos, Depth) */}
      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-[#F5EFE9] mb-2">
          <span>Unspoken Vibe Breakdown</span>
          <span className="text-[10px] text-[#9C8F87] font-normal">telemetry derived</span>
        </div>

        <div className="space-y-2 text-xs font-sans">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#9C8F87]">Empathy Radar</span>
              <span className="font-mono text-[#F5EFE9]">{resolvedTraits.empathy}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full transition-all duration-700"
                style={{ width: `${resolvedTraits.empathy}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#9C8F87]">Intuition / Perception</span>
              <span className="font-mono text-[#F5EFE9]">{resolvedTraits.intuition}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-700"
                style={{ width: `${resolvedTraits.intuition}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#9C8F87]">Chaos / Main Character Energy</span>
              <span className="font-mono text-[#F5EFE9]">{resolvedTraits.chaos}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${resolvedTraits.chaos}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#9C8F87]">Emotional Depth</span>
              <span className="font-mono text-[#F5EFE9]">{resolvedTraits.depth}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-700"
                style={{ width: `${resolvedTraits.depth}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warmth Bonus Section (Deeper cut) */}
      <div className="mt-5">
        {bonusUnlocked ? (
          <div className="rounded-2xl border border-[#E8552E]/40 bg-[#E8552E]/10 p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#E8552E]">
              <Flame className="size-3.5 fill-current" />
              <span>Baji's rawest deeper cut:</span>
            </div>
            <p className="mt-1.5 font-quote text-xs sm:text-sm text-[#F5EFE9] italic leading-relaxed">
              &ldquo;{archetype.bonusLine}&rdquo;
            </p>
          </div>
        ) : canAffordBonus ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-bold text-[#F5EFE9] flex items-center gap-1.5">
                <Flame className="size-3.5 text-[#E8552E]" />
                <span>Unlock Baji&apos;s deepest cut</span>
              </span>
              <span className="font-mono text-xs text-[#E8552E] font-bold">{totalWarmth} 🔥</span>
            </div>
            <p className="font-sans text-xs text-[#9C8F87] leading-relaxed">
              Spend 30 Warmth to unlock the most brutally accurate line Baji has on you.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("celebration");
                onSpendWarmth();
              }}
              className="w-full py-2.5 rounded-xl bg-[#E8552E] text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Reveal deeper cut (30 🔥)</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F5EFE9]">
              <span className="flex items-center gap-1.5">
                <Flame className="size-3.5 text-[#E8552E]" />
                <span>Deeper cut locked</span>
              </span>
              <span className="font-mono text-xs text-[#9C8F87]">
                {totalWarmth} / {BAJI_READ_COST} 🔥
              </span>
            </div>
            <p className="font-sans text-xs text-[#9C8F87]">
              React on the Wall to reach {BAJI_READ_COST} Warmth and reveal your deeper cut.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#E8552E] transition-all duration-500"
                style={{ width: `${warmthProgressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-5 h-px w-full bg-white/[0.08]" />

      {/* Sharing & Copy Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onCopy();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2.5 text-xs font-semibold text-[#F5EFE9] transition-all cursor-pointer"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          <span>{copied ? "Copied" : "Copy Vibe"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onShare();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#E8552E] hover:opacity-95 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-md cursor-pointer"
        >
          <Share2 className="size-3.5" />
          <span>Share Story</span>
        </button>
      </div>
    </article>
  );
}
