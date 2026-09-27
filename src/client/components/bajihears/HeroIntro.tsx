import React, { useState, useEffect } from "react";
import { ShieldCheck, MessageCircleHeart, Share2, X, ChevronDown, ChevronUp } from "lucide-react";

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
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white/70">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>100% Anonymous Confessions & Secrets</span>
        </span>
        <button
          type="button"
          onClick={toggleCollapse}
          className="text-primary hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <span>What is this?</span>
          <ChevronDown className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-[#1f1210] via-[#140c0b] to-[#0a0606] p-5 sm:p-6 shadow-[0_8px_32px_rgba(250,84,28,0.18)] transition-all animate-[fadeIn_0.3s_ease-out]">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-56 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Anonymous Confessions
          </span>

          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Collapse intro banner"
            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <ChevronUp className="size-4" />
          </button>
        </div>

        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Say what you couldn't say out loud.
          </h2>
          <p className="mt-1.5 font-vibe text-xs sm:text-sm text-white/75 leading-relaxed">
            A public sanctuary for secret confessions, late-night truths, and unspoken thoughts.
            Zero accounts required. Zero identity tracking. No judgment.
          </p>
        </div>

        {/* 3 Clear Pillars for 5-Second Comprehension */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-white/8">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/8 p-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white leading-none">Total Anonymity</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-tight truncate">No accounts or names</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/8 p-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30 shrink-0">
              <MessageCircleHeart className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white leading-none">Unfiltered Thoughts</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-tight truncate">Read what people hide</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/8 p-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
              <Share2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white leading-none">1-Tap Story Card</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-tight truncate">Share to Instagram / WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
