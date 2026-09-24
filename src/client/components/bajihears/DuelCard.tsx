import React, { useState } from "react";
import { Instagram } from "lucide-react";
import type { Duel, DuelOption } from "@/shared/types/duel";
import { stripHandle, getInstagramUrl } from "@/shared/utils";
import { triggerHaptic } from "@/client/lib/haptics";

interface DuelCardProps {
  duel: Duel;
  answeredState?: { choiceIndex: 0 | 1; pctA: number; pctB: number } | null;
  onAnswer: (choiceIndex: 0 | 1) => void;
  onNext: () => void;
}

export const DuelCard: React.FC<DuelCardProps> = ({
  duel,
  answeredState = null,
  onAnswer,
  onNext,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isAnswered = Boolean(answeredState);
  const selectedIndex = answeredState?.choiceIndex;
  const pctA = answeredState?.pctA ?? 50;
  const pctB = answeredState?.pctB ?? 50;

  const handleSelect = (idx: 0 | 1) => {
    if (isAnswered) return;
    triggerHaptic("impactMedium");
    onAnswer(idx);
  };

  const renderOption = (opt: DuelOption, idx: 0 | 1, pct: number) => {
    const isSelected = selectedIndex === idx;
    const isHovered = hoveredIdx === idx && !isAnswered;
    const badgeLetter = idx === 0 ? "A" : "B";

    return (
      <button
        key={opt.id}
        type="button"
        disabled={isAnswered}
        onClick={() => handleSelect(idx)}
        onMouseEnter={() => setHoveredIdx(idx)}
        onMouseLeave={() => setHoveredIdx(null)}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 active:scale-[0.98] ${
          isAnswered
            ? isSelected
              ? "border-primary/80 bg-primary/10 shadow-[0_0_25px_rgba(250,84,28,0.3)] scale-[1.01]"
              : "border-white/10 bg-black/40 opacity-70"
            : isHovered
              ? "border-primary/50 bg-white/[0.06] -translate-y-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        {/* Percentage Bar Overlay (on answer) */}
        {isAnswered && (
          <div
            className={`absolute bottom-0 left-0 top-0 transition-all duration-700 ease-out ${
              isSelected ? "bg-primary/20" : "bg-white/5"
            }`}
            style={{ width: `${pct}%` }}
          />
        )}

        <div className="relative z-10 space-y-2.5">
          {/* Header Tag / Handle */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-white/80">
                {badgeLetter}
              </span>
              {opt.category && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white/70">
                  {opt.category}
                </span>
              )}
            </div>
            {opt.handle && (
              <a
                href={getInstagramUrl(opt.handle)!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                title={`Visit Instagram @${stripHandle(opt.handle)}`}
              >
                <Instagram className="size-3 text-primary shrink-0" aria-hidden />
                <span>@{stripHandle(opt.handle)}</span>
              </a>
            )}
          </div>

          {/* Unsaid Text */}
          <p className="font-vibe text-sm sm:text-base leading-relaxed text-white/90">
            "{opt.text}"
          </p>
        </div>

        {/* Footer Action / Reveal */}
        <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
          {!isAnswered ? (
            <span className="text-xs font-medium text-white/50 group-hover:text-primary transition-colors flex items-center gap-1">
              This is me <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          ) : (
            <div className="flex items-center justify-between w-full font-mono text-xs">
              <span className={isSelected ? "font-bold text-primary" : "text-white/40"}>
                {isSelected ? "Your Pick ✓" : ""}
              </span>
              <span
                className={`text-xs sm:text-sm font-bold ${isSelected ? "text-primary font-extrabold" : "text-white/70"}`}
              >
                {pct}% felt this
              </span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
      {/* Format Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-[11px] font-mono font-bold text-primary tracking-wide">
          <span>⚔️</span>
          <span className="uppercase">
            {duel.format === "self-relate" ? "Which One Is You?" : "Head to Head"}
          </span>
        </div>
        {duel.prompt && (
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">{duel.prompt}</h2>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {renderOption(duel.optionA, 0, pctA)}
        {renderOption(duel.optionB, 1, pctB)}
      </div>

      {/* Answered State Footer Action */}
      {isAnswered && (
        <div className="flex flex-col items-center gap-2.5 pt-2 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
            <span>🔥</span>
            <span>+2 Warmth Earned!</span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onNext();
            }}
            className="spring-press group flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary via-flame to-ember px-7 font-bold text-sm text-white shadow-[0_0_25px_rgba(250,84,28,0.4)] transition-all hover:scale-105"
          >
            <span>Next Duel</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      )}
    </div>
  );
};
