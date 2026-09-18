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
    <span className={className}>
      {now === null
        ? "Will be posting on Instagram soon"
        : `Will be posting on Instagram in ${formatShortCountdown(nextRevealAt(now) - now)}`}
    </span>
  );
}
