import { useEffect, useState } from "react";
import { formatShortCountdown, nextRevealAt } from "@/lib/bajihears";

/** Countdown to the next winner reveal (12h cycles). */
export function RevealCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="text-muted-foreground border-border bg-secondary/40 rounded-full border px-4 py-2 text-center text-xs">
      {now === null
        ? "Next reveal soon."
        : `Next reveal in ${formatShortCountdown(nextRevealAt(now) - now)}.`}
    </p>
  );
}
