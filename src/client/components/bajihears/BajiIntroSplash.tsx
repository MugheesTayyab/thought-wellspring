import React, { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface BajiIntroSplashProps {
  onComplete?: () => void;
}

export const BajiIntroSplash: React.FC<BajiIntroSplashProps> = ({ onComplete }) => {
  // Initialize to true during SSR and on fresh session so the splash is visible from frame 0
  const [visible, setVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("bh:introPlayed");
    }
    return true;
  });

  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const played = sessionStorage.getItem("bh:introPlayed");
    if (played) {
      setVisible(false);
      onComplete?.();
      return undefined;
    }

    sessionStorage.setItem("bh:introPlayed", "1");

    // Phase 1: Reveal 3-4 words value-prop copy after logo settles
    const textTimer = window.setTimeout(() => {
      setTextVisible(true);
    }, 450);

    // Phase 2: Begin smooth dissolve
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, 1900);

    // Phase 3: Complete and unmount
    const endTimer = window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2400);

    return () => {
      window.clearTimeout(textTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0604] transition-opacity duration-500 ease-out select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Welcome to BajiHears"
    >
      {/* Intimate candlelit background hearth glow */}
      <div
        className="pointer-events-none absolute size-[460px] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, #E8552E 0%, #fa541c 30%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        {/* Animated Brand Mascot Emblem */}
        <div className="relative flex items-center justify-center p-1">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#E8552E]/30 to-amber-500/20 blur-xl animate-pulse" />
          <div className="relative drop-shadow-[0_12px_36px_rgba(232,85,46,0.4)] transition-transform duration-700 hover:scale-105">
            <Logo size={84} />
          </div>
        </div>

        {/* Brand Name & Distinctive Value Prop */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-gradient drop-shadow-md">
            BajiHears
          </h1>

          {/* 3-4 words of copy communicating what the app is for and how to use it */}
          <p
            className={`font-sans text-xs sm:text-sm font-medium tracking-wide text-[#F5EFE9]/90 transition-all duration-500 ${
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
            }`}
          >
            Whisper your truth. Read the unsaid.
          </p>
        </div>

        {/* Minimal Ember Hairline Progress Bar */}
        <div className="mt-4 w-36 h-[2px] rounded-full bg-white/[0.08] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 via-[#E8552E] to-[#fa541c] rounded-full animate-[progress_1.7s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
        </div>
      </div>
    </div>
  );
};
