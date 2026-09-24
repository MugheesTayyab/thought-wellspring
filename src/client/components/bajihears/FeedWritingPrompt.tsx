import React, { useMemo } from "react";
import { Feather, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

const PROMPT_SUBTEXTS = [
  "Anything you've been afraid to say out loud?",
  "Someone on this wall probably said something you needed to hear.",
  "The one thing you'd post if no one knew it was you.",
  "What's a secret you're tired of keeping to yourself?",
  "If you could tell them one last thing with zero consequences...",
  "What made you smile today that nobody asked about?",
  "A truth you've only admitted in your notes app.",
  "The apology you never received, or never gave.",
  "What's keeping you awake at 2 AM lately?",
  "Leave a piece of your heart here. The wall listens.",
];

interface FeedWritingPromptProps {
  onWriteClick?: () => void;
}

export const FeedWritingPrompt: React.FC<FeedWritingPromptProps> = ({ onWriteClick }) => {
  const subtext = useMemo(() => {
    return PROMPT_SUBTEXTS[Math.floor(Math.random() * PROMPT_SUBTEXTS.length)]!;
  }, []);

  const handleClick = () => {
    triggerHaptic("selection");
    if (onWriteClick) {
      onWriteClick();
    } else {
      // Default: scroll to writing box and focus textarea
      const composer = document.querySelector("textarea");
      if (composer) {
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        composer.focus();
      }
    }
  };

  return (
    <div className="slide-in-card relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-[#170e0e]/95 to-black/80 p-5 sm:p-6 shadow-[0_4px_25px_rgba(250,84,28,0.15)] text-center transition-all hover:border-primary/50">
      {/* Ambient Radial Accent */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 size-40 rounded-full bg-primary/15 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 border border-primary/40 text-primary shadow-[0_0_15px_rgba(250,84,28,0.3)]">
          <Feather className="size-5" />
        </div>

        <div className="space-y-1 max-w-sm">
          <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>You've been listening for a while.</span>
            <Sparkles className="size-3.5 text-primary shrink-0" />
          </h3>
          <p className="font-vibe text-xs sm:text-sm text-white/75 leading-relaxed">"{subtext}"</p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(250,84,28,0.35)] transition-all active:scale-95 hover:shadow-[0_0_25px_rgba(250,84,28,0.5)]"
        >
          <span>Write it</span>
          <span className="font-mono text-xs">→</span>
        </button>
      </div>
    </div>
  );
};
