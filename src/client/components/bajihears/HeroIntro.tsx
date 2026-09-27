import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const HeroIntro: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("bh:hero-collapsed") === "1";
      if (isDismissed) setCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("bh:hero-collapsed", next ? "1" : "0");
    } catch {}
  };

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#17110D] px-4 py-2.5 text-xs text-[#9C8F87]">
        <span className="font-sans text-xs">
          Spill the unsaid. 100% anonymous, zero footprints.
        </span>
        <button
          type="button"
          onClick={toggleCollapse}
          className="text-[#E8552E] hover:underline font-medium text-xs flex items-center gap-1 cursor-pointer"
        >
          <span>What's this?</span>
          <ChevronDown className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#17110D] border border-white/[0.06] p-4 sm:p-5 shadow-xs transition-all animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-quote text-xl sm:text-2xl font-bold tracking-tight text-[#F5EFE9] leading-snug">
            Spill the tea. Baji won't tell.
          </h2>
          <p className="font-sans text-xs sm:text-[13px] text-[#9C8F87] leading-relaxed max-w-sm">
            The late-night rants, secret crushes, and unsaid truths you could never say out loud. Zero log in. Purely anonymous.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Minimize intro"
          title="Minimize"
          className="text-[#9C8F87] hover:text-[#F5EFE9] p-1 rounded-full hover:bg-white/[0.05] transition shrink-0 cursor-pointer"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>
    </div>
  );
};
