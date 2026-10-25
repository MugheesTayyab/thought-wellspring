import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { initGoogleAnalytics, trackPageView } from "@/client/lib/analytics";
import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";

/**
 * Shared root analytics tracker component.
 * 1. Initializes Google Tag & Google Consent Mode v2 on mount.
 * 2. Tracks page views on client-side router navigation without duplicate events.
 * 3. Mounts the lightweight AnalyticsConsentBanner for first-time visitors.
 */
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      trackPageView(location.pathname);
    }
  }, [location.pathname]);

  return <AnalyticsConsentBanner />;
}
