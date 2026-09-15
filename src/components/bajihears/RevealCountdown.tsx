import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatShortCountdown, nextRevealAt } from "@/lib/bajihears";

/** Compact pill counting down to the next winner reveal (12h cycles). */
export function RevealCountdown({ className }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className={cn(
        "text-muted-foreground border-border/80 bg-background/50 shrink-0 rounded-full border px-2.5 py-1 text-[10px] tracking-wider whitespace-nowrap uppercase",
        className,
      )}
    >
      {now === null ? "Next reveal soon" : `Next in ${formatShortCountdown(nextRevealAt(now) - now)}`}
    </span>
  );
}
