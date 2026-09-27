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
          A quiet space where anonymous thoughts reach thousands.
        </span>
        <button
          type="button"
          onClick={toggleCollapse}
          className="text-[#E8552E] hover:underline font-medium text-xs flex items-center gap-1 cursor-pointer"
        >
          <span>How it works</span>
          <ChevronDown className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#17110D] border border-white/[0.08] p-4 sm:p-5 shadow-xs transition-all animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-sans font-medium text-[#E8552E]">
            <span>Quiet Sanctuary</span>
          </div>

          <h2 className="font-quote text-xl sm:text-2xl font-bold tracking-tight text-[#F5EFE9] leading-snug">
            For introverts with a loud mind and a quiet voice.
          </h2>

          <p className="font-sans text-xs sm:text-[13px] text-[#9C8F87] leading-relaxed max-w-md">
            This is where an anonymous confession can reach thousands of kindred people without ever exposing who you are. No followers required. No identity attached.
          </p>

          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <p className="text-[12px] font-sans font-medium text-[#F5EFE9]">
              The Path to Bajislays
            </p>
            <p className="text-[11px] font-sans text-[#9C8F87] leading-relaxed">
              Every cycle, one post chosen by both community resonance and our editorial curators is crowned Cycle Champion and featured on Bajislays (@bajihears).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-sans">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[11px] font-semibold text-amber-300 block">
                  What curators look for
                </span>
                <span className="text-[10.5px] text-[#9C8F87] leading-normal block mt-0.5">
                  Raw authenticity, craft of writing, and honest emotional weight.
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="text-[11px] font-semibold text-[#E8552E] block">
                  What the audience votes on
                </span>
                <span className="text-[10.5px] text-[#9C8F87] leading-normal block mt-0.5">
                  Relatability, emotional resonance, and shared human truth.
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Minimize intro"
          title="Minimize"
          className="text-[#9C8F87] hover:text-[#F5EFE9] p-1.5 rounded-full hover:bg-white/[0.05] transition shrink-0 cursor-pointer"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>
    </div>
  );
};
