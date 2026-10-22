import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function HeroIntro() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const returning = localStorage.getItem("bh:wall-visited") === "1";
    setCollapsed(returning || localStorage.getItem("bh:hero-collapsed") === "1");
    localStorage.setItem("bh:wall-visited", "1");
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("bh:hero-collapsed", next ? "1" : "0");
    } catch {
      // The intro still works when storage is unavailable.
    }
  };

  if (collapsed) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
        <span>Good to see you around. Read for a while.</span>
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex min-h-11 shrink-0 items-center gap-1 font-semibold text-primary"
        >
          About <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#E3B8B1] bg-[#FBE6E4] px-4.5 py-4 sm:px-6 sm:py-5 shadow-xs">
      <div className="absolute -right-4 -top-5 size-20 rounded-full bg-white/40 pointer-events-none" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3B8B1]/70 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#7D3028]">
            <span className="listening-mark scale-75" aria-hidden /> The Wall
          </span>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Collapse introduction"
            className="flex size-9 items-center justify-center rounded-full text-[#7D3028]/70 hover:bg-white/60 transition-colors"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>

        <h2 className="mt-2 font-serif text-[22px] sm:text-[26px] leading-[1.2] tracking-[-0.015em] text-foreground font-normal">
          For the thoughts you keep to yourself.
        </h2>
        <p className="mt-1 text-xs sm:text-sm leading-5 text-muted-foreground">
          Read what others are thinking. Share when you feel like it.
        </p>
        <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[#7D3028]">
          <span className="block h-px w-5 bg-primary/40" aria-hidden />
          Just here to read? That&apos;s welcome too.
        </p>
      </div>
    </section>
  );
}
