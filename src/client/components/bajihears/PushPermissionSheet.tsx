import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Sparkles } from "lucide-react";
import { requestPushPermission, markPushPromptShown } from "@/client/lib/notifications";
import { triggerHaptic } from "@/client/lib/haptics";

interface PushPermissionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushPermissionSheet: React.FC<PushPermissionSheetProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      markPushPromptShown();
      onClose();
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleAccept = async () => {
    triggerHaptic("celebration");
    await requestPushPermission();
    onClose();
  };

  const handleDismiss = () => {
    triggerHaptic("selection");
    markPushPromptShown();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs px-3 pb-4">
      {/* Click backdrop to dismiss */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-[#140e0e]/95 p-5 shadow-[0_-10px_40px_rgba(250,84,28,0.2)] backdrop-blur-2xl animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 size-36 rounded-full bg-primary/20 blur-2xl" />

        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-[0_0_15px_rgba(250,84,28,0.3)]">
            <Bell className="size-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Get notified when someone echoes yours.
              </h3>
              <Sparkles className="size-3.5 text-primary shrink-0" />
            </div>
            <p className="font-vibe text-xs text-white/70 leading-relaxed">
              No feeds. No noise. Just that one moment someone felt your confession.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="bg-brand-gradient text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-[0_0_15px_rgba(250,84,28,0.3)] transition-all active:scale-95"
          >
            Yes, tell me
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
