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
    }, 1800);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  if (!mounted || !toast) return null;

  // Default to bottom right area near warmth orb if coords not given
  const x = toast.x ?? (typeof window !== "undefined" ? window.innerWidth - 120 : 300);
  const y = toast.y ?? (typeof window !== "undefined" ? window.innerHeight - 100 : 600);

  return createPortal(
    <div
      style={{ left: `${x}px`, top: `${y}px` }}
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full select-none"
    >
      <div className="flex animate-[floatUpParticle_1.8s_ease-out_forwards] items-center gap-1.5 rounded-full border border-primary/40 bg-black/80 px-3 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(250,84,28,0.5)]">
        <span className="animate-bounce text-sm">🔥</span>
        <span className="font-mono text-xs font-extrabold text-primary">+{toast.amount} Warmth</span>
        <span className="text-[11px] text-white/70">· {toast.label}</span>
      </div>
    </div>,
    document.body
  );
};
