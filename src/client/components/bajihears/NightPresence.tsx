import React, { useState, useEffect } from "react";

export const NightPresence: React.FC = () => {
  const [soulsCount, setSoulsCount] = useState<number>(54);

  useEffect(() => {
    // Generate organic presence based on hour of day (peaks during late night 11pm - 3am)
    const hour = new Date().getHours();
    const isLateNight = hour >= 22 || hour <= 4;
    const base = isLateNight ? 68 : 34;
    setSoulsCount(base + Math.floor(Math.random() * 15));

    // Subtle natural fluctuation every 18 seconds
    const interval = window.setInterval(() => {
      setSoulsCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(28, prev + delta);
      });
    }, 18_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 py-1 select-none animate-fade-in font-sans">
      <span className="relative flex size-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#E8552E] opacity-75 animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[#E8552E]" />
      </span>
      <span className="text-[12px] text-[#9C8F87] tracking-normal font-normal">
        <strong className="text-[#F5EFE9] font-medium font-mono tabular-nums">{soulsCount}</strong>{" "}
        whispering in the dark right now
      </span>
    </div>
  );
};
