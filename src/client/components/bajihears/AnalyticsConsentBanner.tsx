import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsentStatus } from "@/client/lib/analytics";

export function AnalyticsConsentBanner() {
  const [status, setStatus] = useState<AnalyticsConsentStatus>("granted");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const current = getAnalyticsConsent();
    setStatus(current);
    if (current === "pending") {
      // Gentle delay before showing so page content settles gracefully
      const timer = window.setTimeout(() => setIsVisible(true), 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<AnalyticsConsentStatus>).detail;
      setStatus(detail);
      if (detail !== "pending") {
        setIsVisible(false);
      }
    };
    window.addEventListener("bh:analytics-consent-changed", handleConsentChange);
    return () => window.removeEventListener("bh:analytics-consent-changed", handleConsentChange);
  }, []);

  if (!isVisible || status !== "pending") {
    return null;
  }

  const handleAccept = () => {
    setAnalyticsConsent("granted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setAnalyticsConsent("denied");
    setIsVisible(false);
  };

  return (
    <aside
      aria-label="Cookie and Analytics Consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-[#E3B8B1] bg-[#FFFDFB] p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-300 sm:bottom-6 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FBE6E4] text-[#7D3028]">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-sm font-semibold text-foreground">
              Privacy &amp; Analytics
            </h3>
            <button
              type="button"
              onClick={handleDecline}
              aria-label="Close analytics prompt"
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            BajiHears uses anonymous Google Analytics (IP anonymized) to understand readership trends. We never track confession contents, handles, or personal identities. Learn more in our{" "}
            <Link to="/privacy" className="text-primary underline hover:text-primary/80">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex min-h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              Accept Analytics
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95 cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
