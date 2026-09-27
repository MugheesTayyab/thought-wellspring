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
    }, 2000);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  if (!mounted || !toast) return null;

  const isPositive = toast.amount > 0;

  return createPortal(
    <div className="pointer-events-none fixed top-5 left-1/2 -translate-x-1/2 z-50 select-none">
      <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-[#221610]/95 via-[#18110D]/95 to-[#221610]/95 px-3.5 py-1.5 text-xs text-[#F5EFE9] shadow-[0_8px_28px_rgba(232,85,46,0.35)] ring-1 ring-white/10 backdrop-blur-2xl font-sans animate-[slideDown_0.25s_cubic-bezier(0.16,1,0.3,1)]">
        <span className="text-xs shrink-0 select-none drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">🔥</span>
        <span className="font-mono font-bold tabular-nums text-amber-400">
          {isPositive ? `+${toast.amount}` : toast.amount}
        </span>
        <span className="text-[#9C8F87] text-[11px] font-normal truncate max-w-[170px]">
          {toast.label}
        </span>
      </div>
    </div>,
    document.body,
  );
};
