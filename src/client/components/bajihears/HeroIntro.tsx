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
    <section className="relative overflow-hidden rounded-3xl border border-[#F1D7D2] bg-[#FBE6E4] px-5 py-6 sm:px-6 sm:py-7">
      <div className="absolute -right-4 -top-5 size-24 rounded-full bg-white/40" aria-hidden />
      <div className="relative max-w-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#7D3028]">
            <span className="listening-mark" aria-hidden /> The Wall
          </span>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Collapse introduction"
            className="flex size-11 items-center justify-center rounded-full text-[#665A60] hover:bg-white/60"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>

        <h2 className="max-w-[18rem] font-quote text-[34px] leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[38px]">
          For the thoughts you keep to yourself.
        </h2>
        <p className="mt-3 max-w-[21rem] text-[15px] leading-6 text-muted-foreground">
          Read what others are thinking. Share when you feel like it.
        </p>
        <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#7D3028]">
          <span className="block h-px w-6 bg-[#D65A49]" aria-hidden />
          Just here to read? That&apos;s welcome too.
        </p>
      </div>
    </section>
  );
}
