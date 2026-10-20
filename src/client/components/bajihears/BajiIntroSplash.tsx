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
    }, 1100);

    // Phase 3: Complete and unmount
    const endTimer = window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1450);

    return () => {
      window.clearTimeout(textTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF7F3] transition-opacity duration-300 ease-out select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Welcome to BajiHears"
    >
      {/* Warm paper welcome wash */}
      <div
        className="pointer-events-none absolute size-[460px] rounded-full opacity-70 blur-3xl"
        style={{
          background: "radial-gradient(circle, #FBE6E4 0%, #FFF0C9 38%, transparent 72%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        {/* Animated Brand Mascot Emblem */}
        <div className="relative flex items-center justify-center p-1">
          <div className="absolute inset-0 rounded-full bg-[#FBE6E4] blur-xl" />
          <div className="relative transition-transform duration-500">
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
            className={`font-sans text-sm font-medium text-[#665A60] transition-all duration-500 ${
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
            }`}
          >
            Say the unsaid.
          </p>
        </div>

        <div className="mt-4 h-[2px] w-28 overflow-hidden rounded-full bg-[#E8DFDC]">
          <div className="h-full rounded-full bg-[#AE4335] animate-[progress_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]" />
        </div>
      </div>
    </div>
  );
};
