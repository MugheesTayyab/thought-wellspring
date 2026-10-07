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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]">
      {/* Click backdrop to dismiss */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-[290px] rounded-3xl border border-white/12 bg-gradient-to-b from-[#1f1712]/95 via-[#17110D]/95 to-[#100b08]/98 p-4 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-[#F5EFE9] font-sans animate-[scaleUp_0.18s_ease-out]">
        <div className="mx-auto mb-2.5 flex size-9 items-center justify-center rounded-xl bg-[#E8552E]/10 border border-[#E8552E]/25 text-[#E8552E]">
          <Bell className="size-4" />
        </div>

        <h3 className="text-sm font-bold text-[#F5EFE9]">
          Get notified?
        </h3>
        <p className="text-[11px] text-[#9C8F87] mt-1 leading-relaxed">
          Alerts when your confessions get replies or the daily winner is crowned.
        </p>

        {isIosBrowser && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-2 text-[10px] text-[#F5EFE9]/80 text-left">
            <Smartphone className="size-3.5 text-[#E8552E] shrink-0" />
            <span>On iPhone: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</span>
          </div>
        )}

        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleDismiss}
            className="w-full rounded-xl border border-white/10 py-1.5 text-xs font-medium text-[#9C8F87] hover:text-[#F5EFE9] hover:bg-white/[0.04] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Later
          </button>
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleAccept}
            className="w-full rounded-xl bg-[#E8552E] py-1.5 text-xs font-semibold text-white shadow-md transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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
