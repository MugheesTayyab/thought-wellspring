import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface BajiIntroSplashProps {
  onComplete?: () => void;
}

export const BajiIntroSplash: React.FC<BajiIntroSplashProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const played = sessionStorage.getItem("bh:introPlayed");
    if (played) {
      onComplete?.();
      return undefined;
    }
    sessionStorage.setItem("bh:introPlayed", "1");
    setVisible(true);

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, 2200);

    const endTimer = window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2800);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0808] transition-opacity duration-700 select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Radial Glow */}
      <div className="absolute size-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
        {/* Animated Brand Emblem */}
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-brand-gradient text-3xl shadow-[0_0_50px_rgba(250,84,28,0.6)] animate-bounce-once">
          🧕
          <Sparkles className="absolute -top-1 -right-1 size-5 text-amber-300 animate-spin" />
        </div>

        <div className="space-y-1.5 animate-fade-in">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-gradient drop-shadow-md">
            BajiHears
          </h1>
          <p className="font-vibe text-xs sm:text-sm font-medium tracking-wide text-white/70">
            Say the unsaid. We're listening.
          </p>
        </div>

        {/* Subtle Loading Dots */}
        <div className="mt-4 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="size-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
};
