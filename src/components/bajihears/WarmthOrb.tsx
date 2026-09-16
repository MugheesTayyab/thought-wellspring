import React from "react";
import { getTier, getNextTier } from "../../lib/warmth";

interface WarmthOrbProps {
  totalWarmth: number;
  isFlashing?: boolean;
  mini?: boolean;
  onClick?: () => void;
  className?: string;
}

export const WarmthOrb: React.FC<WarmthOrbProps> = ({
  totalWarmth,
  isFlashing = false,
  mini = false,
  onClick,
  className = "",
}) => {
  const currentTier = getTier(totalWarmth);
  const { progressPct } = getNextTier(totalWarmth);

  if (mini) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={`group relative flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-[#181010]/80 to-[#120c0c]/90 px-3 py-1.5 backdrop-blur-xl transition-all duration-300 shadow-[0_2px_12px_rgba(250,84,28,0.2)] hover:border-primary/60 hover:shadow-[0_4px_20px_rgba(250,84,28,0.35)] active:scale-95 ${className}`}
        aria-label="View Warmth Points"
      >
        <div className="relative flex items-center justify-center">
          <div
            className={`h-3.5 w-3.5 rounded-full transition-transform duration-300 group-hover:scale-125 ${
              isFlashing ? "animate-ping" : "animate-pulse"
            }`}
            style={{
              backgroundColor: currentTier.colorCss,
              boxShadow: currentTier.glowCss,
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 font-display text-xs font-bold tracking-tight text-white">
          <span className="text-sm font-extrabold text-brand-gradient">{totalWarmth.toLocaleString()}</span>
          <span className="text-[11px] font-semibold text-amber-400 font-sans tracking-wide">
            {currentTier.name}
          </span>
        </div>
      </button>
    );
  }

  // Full orb for bottom nav or standalone presentation
  const sizePx = currentTier.orbSizePx;
  const radius = (sizePx - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className={`group relative flex cursor-pointer flex-col items-center justify-center p-2 focus:outline-none ${className}`}
    >
      {/* Dynamic Background Glow Aura */}
      <div
        className={`absolute rounded-full transition-all duration-700 ease-out ${
          isFlashing ? "scale-150 opacity-90" : "scale-100 opacity-60 group-hover:opacity-100"
        }`}
        style={{
          width: `${sizePx * 1.5}px`,
          height: `${sizePx * 1.5}px`,
          background: `radial-gradient(circle, ${currentTier.colorCss} 0%, transparent 70%)`,
          filter: "blur(12px)",
        }}
      />

      {/* SVG Progress Ring & Inner Sphere */}
      <div className="relative flex items-center justify-center" style={{ width: sizePx, height: sizePx }}>
        <svg className="-rotate-90" width={sizePx} height={sizePx}>
          {/* Track */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2.5"
            fill="transparent"
          />
          {/* Progress */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            stroke={currentTier.colorCss}
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Core Glowing Sphere */}
        <div
          className={`absolute rounded-full transition-all duration-300 ${
            isFlashing ? "scale-125 brightness-125" : "animate-pulse group-hover:scale-105"
          }`}
          style={{
            width: sizePx - 10,
            height: sizePx - 10,
            background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${currentTier.colorCss} 50%, #000 100%)`,
            boxShadow: currentTier.glowCss,
          }}
        />
      </div>

      {/* Tier Label */}
      <span className="mt-1 font-mono text-[11px] font-bold tracking-wider text-white/90 group-hover:text-primary">
        {totalWarmth} 🔥
      </span>
    </div>
  );
};
