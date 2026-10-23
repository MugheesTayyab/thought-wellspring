import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Smartphone, Loader2 } from "lucide-react";
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
  const { deviceToken } = useDeviceToken();
  const [error, setError] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isIosBrowser = isIosDevice() && !isStandalonePwa();

  useEffect(() => {
    if (!isOpen || isSubscribing) return;
    const timer = window.setTimeout(() => {
      markPushPromptShown();
      onClose();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [isOpen, onClose, isSubscribing]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleAccept = async () => {
    setIsSubscribing(true);
    setError(null);
    triggerHaptic("celebration");
    try {
      const result = await subscribeDeviceToPush({ deviceToken });
      if (!result.success) {
        setError(result.error || "Notifications could not be enabled.");
        return;
      }
      onClose();
    } catch (err) {
      console.warn("[PushSheet] Subscription attempt failed:", err);
      setError("Notifications could not be enabled. Try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    triggerHaptic("selection");
    markPushPromptShown();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      {/* Click backdrop to dismiss */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-[300px] rounded-3xl border border-border-card bg-card p-5 text-center shadow-[0_20px_50px_-15px_rgba(62,43,38,0.2)] text-foreground font-sans animate-[scaleUp_0.18s_ease-out]">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-2xl bg-accent border border-primary/20 text-primary">
          <Bell className="size-4" />
        </div>

        <h3 className="text-base font-bold text-foreground">Get notified?</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Get a notification when a new community pick is selected.
        </p>

        {isIosBrowser && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 border border-border-card p-2 text-[11px] text-foreground text-left">
            <Smartphone className="size-3.5 text-primary shrink-0" />
            <span>
              On iPhone: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleDismiss}
            className="w-full min-h-10 rounded-xl border border-border-card py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
          >
            Later
          </button>
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleAccept}
            className="w-full min-h-10 rounded-xl bg-primary py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <span>Notify me</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
