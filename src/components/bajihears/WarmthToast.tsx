import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface WarmthToastEvent {
  amount: number;
  label: string;
  x?: number;
  y?: number;
}

interface WarmthToastProps {
  toast: WarmthToastEvent | null;
  onDone: () => void;
}

export const WarmthToast: React.FC<WarmthToastProps> = ({ toast, onDone }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDone();
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  if (!mounted || !toast) return null;

  return createPortal(
    <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-50 select-none w-auto max-w-sm px-4">
      <div className="relative flex items-center gap-3 rounded-full border border-primary/40 bg-gradient-to-r from-[#1c1212]/95 via-[#120c0c]/95 to-black/95 px-4 py-2.5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(250,84,28,0.45)] border-t-primary/60 animate-[toastSpring_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
        {/* Glowing Flame Badge */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-flame to-ember shadow-[0_0_15px_rgba(250,84,28,0.8)] animate-pulse">
          <span className="text-sm">🔥</span>
        </div>

        {/* Text Details */}
        <div className="flex items-baseline gap-2 font-display">
          <span className="text-sm font-extrabold tracking-tight text-brand-gradient">
            +{toast.amount} WARMTH
          </span>
          <span className="text-xs font-medium text-white/70 tracking-wide font-sans">
            · {toast.label}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
