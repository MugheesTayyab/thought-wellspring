import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Sparkles, Smartphone, Loader2 } from "lucide-react";
import {
  subscribeDeviceToPush,
  markPushPromptShown,
  isIosDevice,
  isStandalonePwa,
} from "@/client/lib/notifications";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { triggerHaptic } from "@/client/lib/haptics";

interface PushPermissionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushPermissionSheet: React.FC<PushPermissionSheetProps> = ({ isOpen, onClose }) => {
  const deviceToken = useDeviceToken();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isIosBrowser = isIosDevice() && !isStandalonePwa();

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      markPushPromptShown();
      onClose();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleAccept = async () => {
    setIsSubscribing(true);
    triggerHaptic("celebration");
    try {
      await subscribeDeviceToPush({ deviceToken });
    } catch (err) {
      console.warn("[PushSheet] Subscription attempt failed:", err);
    } finally {
      setIsSubscribing(false);
      onClose();
    }
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

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Never miss the daily crown.
              </h3>
              <Sparkles className="size-3.5 text-primary shrink-0" />
            </div>
            <p className="font-vibe text-xs text-white/70 leading-relaxed">
              Get an instant ping when the 12-hour winner is crowned or when your confession gets echoed.
            </p>

            {isIosBrowser && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-[11px] text-white/80">
                <Smartphone className="size-3.5 text-primary shrink-0" />
                <span>On iPhone: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to enable instant alerts.</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleDismiss}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleAccept}
            className="inline-flex items-center gap-1.5 bg-brand-gradient text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-[0_0_15px_rgba(250,84,28,0.3)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <span>Yes, notify me</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
