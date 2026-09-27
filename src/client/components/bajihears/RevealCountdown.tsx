import { useEffect, useState } from "react";
import { cn, formatShortCountdown, nextRevealAt } from "@/shared/utils";

export function RevealCountdown({
  className,
  prefix = "Posting to Instagram in ",
}: {
  className?: string;
  prefix?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return <span className={className}>Posting to Instagram soon</span>;
  }

  const timeLeft = nextRevealAt(now) - now;
  return (
    <span className={className}>
      {prefix}
      <span className="tabular-nums font-medium">{formatShortCountdown(timeLeft)}</span>
    </span>
  );
}
