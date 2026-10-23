import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bell, Heart, Loader2, Smartphone, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  hasPushPermission,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
  markPushPromptShown,
  subscribeDeviceToPush,
} from "@/client/lib/notifications";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LATER_KEY = "bh:installPromptAfter";
const INSTALLED_KEY = "bh:appInstalled";
const NOTIFY_LATER_KEY = "bh:installNotifyAfter";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Still works without storage. */
  }
}

export function InstallAppPrompt() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const deferred = useRef<InstallEvent | null>(null);
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"install" | "instructions" | "notifications">("install");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const shown = useRef(false);
  const pushConfigured = Boolean(import.meta.env["VITE_VAPID_PUBLIC_KEY"]);

  useEffect(() => {
    setIos(isIosDevice());
    setInstalled(isStandalonePwa() || read(INSTALLED_KEY) === "true");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setAvailable(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      write(INSTALLED_KEY, "true");
      setInstalled(true);
      setAvailable(false);
      setStep("notifications");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/" || shown.current) return;
    const canNotify =
      installed &&
      isPushSupported() &&
      pushConfigured &&
      !hasPushPermission() &&
      Notification.permission === "default";
    if ((!installed && !available && !ios) || (installed && !canNotify)) return;
    const eligibleAt = Date.now() + 8000;
    const timer = window.setInterval(() => {
      if (Date.now() < eligibleAt || document.visibilityState !== "visible") return;
      if (Number(read(installed ? NOTIFY_LATER_KEY : LATER_KEY) || 0) > Date.now()) return;
      // Wait for reading time; never interrupt a composer or another dialog.
      if (
        document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]') ||
        document.activeElement?.matches("input, textarea, select, [contenteditable='true']")
      )
        return;
      shown.current = true;
      setStep(installed ? "notifications" : "install");
      setOpen(true);
      window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pathname, available, installed, ios, pushConfigured]);

  const dismiss = () => {
    write(step === "notifications" ? NOTIFY_LATER_KEY : LATER_KEY, String(Date.now() + WEEK));
    setOpen(false);
  };

  const install = async () => {
    const event = deferred.current;
    if (!event) {
      setStep("instructions");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await event.prompt();
      deferred.current = null;
      setAvailable(false);
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setStep("notifications");
      else dismiss();
    } catch {
      deferred.current = null;
      setAvailable(false);
      setStep("instructions");
      setNotice("Use your browser menu to add BajiHears instead.");
    } finally {
      setBusy(false);
    }
  };

  const enableNotifications = async () => {
    setBusy(true);
    setNotice("");
    try {
      const result = await subscribeDeviceToPush();
      if (result.success) {
        setNotice("You're all set. Community picks can now reach you here.");
      } else {
        setNotice(result.error || "Couldn't enable notifications. Try again from Your Corner.");
      }
    } catch {
      setNotice("Couldn't enable notifications. Try again from Your Corner.");
    } finally {
      setBusy(false);
    }
  };

  const notifications = step === "notifications";
  const canNotify =
    notifications &&
    isPushSupported() &&
    pushConfigured &&
    !hasPushPermission() &&
    Notification.permission === "default" &&
    (!isIosDevice() || isStandalonePwa());

  return (
    <Dialog
      open={open && pathname === "/"}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl border-border-card bg-card p-6 text-center sm:rounded-3xl">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-secondary">
          <img src="/favicon.png" alt="" className="size-12 rounded-xl" />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
            A little space, just for you
          </p>
          <DialogTitle className="font-display text-2xl leading-tight text-foreground">
            {notifications ? "A gentle nudge to come back." : "Keep your quiet corner close."}
          </DialogTitle>
          <DialogDescription className="mt-3 leading-relaxed">
            {notifications
              ? "Get a notification when a new community pick is chosen, so you can return for a thought that might feel like yours."
              : "Some thoughts need a place to land. Put BajiHears on your home screen, ready whenever you need a moment."}
          </DialogDescription>
        </div>
        {!notifications && (
          <div className="space-y-3 rounded-2xl bg-secondary/60 p-4 text-left text-sm">
            <p className="flex items-center gap-3">
              <Smartphone className="size-4 shrink-0 text-primary" aria-hidden />
              Your Wall, one tap away
            </p>
            <p className="flex items-center gap-3">
              <Heart className="size-4 shrink-0 text-primary" aria-hidden />A familiar place to read
              or let it out
            </p>
            <p className="flex items-center gap-3">
              <Zap className="size-4 shrink-0 text-primary" aria-hidden />
              Free to add. No app store needed.
            </p>
          </div>
        )}
        {step === "instructions" && (
          <div className="rounded-2xl border border-border-card p-4 text-left text-sm leading-relaxed">
            {ios ? (
              <>
                <strong>On iPhone or iPad</strong>
                <ol className="mt-2 list-decimal space-y-2 pl-5">
                  <li>Open this page in Safari.</li>
                  <li>Tap Share, then Add to Home Screen.</li>
                  <li>Tap Add, then open BajiHears from its new icon.</li>
                </ol>
              </>
            ) : (
              <p>
                Open your browser menu and choose <strong>Install app</strong> or{" "}
                <strong>Add to Home Screen</strong>, if available.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Open the app from its icon to set up notifications.
            </p>
          </div>
        )}
        {notifications && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isIosDevice() && !isStandalonePwa()
              ? "Open BajiHears from your home screen to enable notifications. "
              : ""}
            Notifications are optional. Sound follows your phone and browser settings; silent mode
            stays in your control.
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-primary">
            {notice}
          </p>
        )}
        {step === "install" && (
          <button
            type="button"
            disabled={busy}
            onClick={install}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Smartphone className="size-4" aria-hidden />
            )}
            {available ? "Add BajiHears to my home screen" : "Show me how to add it"}
          </button>
        )}
        {canNotify && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              markPushPromptShown();
              void enableNotifications();
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Bell className="size-4" aria-hidden />
            )}
            Enable notifications
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {step === "install" ? "Maybe later" : "Done"}
        </button>
        {!notifications && (
          <p className="text-[11px] text-muted-foreground">
            Your next quiet moment is just a tap away.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
