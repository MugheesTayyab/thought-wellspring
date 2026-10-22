import React, { useMemo } from "react";
import { Feather } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-3xl border border-border-card bg-[#FFFDFC] p-5 sm:p-6 shadow-soft text-center transition-all hover:border-primary/40">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent border border-primary/20 text-primary">
          <Feather className="size-5" />
        </div>

        <div className="space-y-1 max-w-sm">
          <h3 className="font-serif text-lg sm:text-xl font-normal text-foreground tracking-tight flex items-center justify-center gap-1.5">
            <span>You've been listening for a while.</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">"{subtext}"</p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition-transform active:scale-[0.98]"
        >
          <span>Write it</span>
          <span className="text-xs" aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
};
