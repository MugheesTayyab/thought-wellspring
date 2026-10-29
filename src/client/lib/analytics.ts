/**
 * Google Analytics 4 (GA4) Integration for BajiHears
 * Measurement ID: G-YK9LL21171
 *
 * Privacy & Architectural Invariants:
 * 1. Strict zero-PII policy: Never transmits handles, usernames, emails, post texts, or device tokens.
 * 2. Anonymized IP addresses enforced by default.
 * 3. Client-side navigation deduplication: Page views track deterministically on route change without duplicates.
 * 4. Google Consent Mode v2: Respects user consent with persistent localStorage storage and runtime updates.
 */

import { CATEGORIES } from "@/shared/constants/categories";

export const GA_MEASUREMENT_ID = "G-YK9LL21171";

export type AnalyticsConsentStatus = "granted" | "denied" | "pending";

const CONSENT_STORAGE_KEY = "bh:analytics-consent";

declare global {
  interface Window {
    "ga-disable-G-YK9LL21171"?: boolean;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let isInitialized = false;
let lastTrackedPath: string | null = null;

/**
 * Read the user's stored consent preference.
 * Defaults to "pending" if the user has not yet decided.
 */
export function getAnalyticsConsent(): AnalyticsConsentStatus {
  if (typeof window === "undefined") return "pending";
  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "granted" || val === "denied") return val;
  } catch {
    /* localStorage inaccessible */
  }
  return "pending";
}

/**
 * Update the user's consent preference and notify Google Tag.
 */
export function setAnalyticsConsent(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  window["ga-disable-G-YK9LL21171"] = status !== "granted";
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    /* localStorage inaccessible */
  }

  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: status,
    });
  }
  if (status === "granted") {
    initGoogleAnalytics();
    loadAnalyticsScript();
    lastTrackedPath = null;
    trackPageView(window.location.pathname);
  }

  // Trigger custom event so reactive components (e.g., banner, settings) update immediately
  window.dispatchEvent(new CustomEvent("bh:analytics-consent-changed", { detail: status }));
}

export function _resetAnalyticsForTesting(): void {
  isInitialized = false;
  lastTrackedPath = null;
}

/**
 * Initialize Google Analytics dataLayer, Consent Mode v2, and initial config.
 * Safe to call multiple times (idempotent).
 */
export function initGoogleAnalytics(): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      // gtag.js consumes the Arguments command format from Google's bootstrap.
      // Plain arrays are dataLayer values, not this documented command format.
      // eslint-disable-next-line prefer-rest-params -- Google's gtag command protocol requires Arguments.
      window.dataLayer?.push(arguments);
    };
  }

  if (isInitialized) {
    if (getAnalyticsConsent() === "granted") loadAnalyticsScript();
    return;
  }
  isInitialized = true;

  // A privacy choice applies to every open BajiHears tab, including the loaded
  // Google SDK's automatic engagement events, not only our explicit events.
  window.addEventListener?.("storage", (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
      setAnalyticsConsent(event.newValue === "granted" ? "granted" : "denied");
    }
  });

  const initialConsent = getAnalyticsConsent();
  window["ga-disable-G-YK9LL21171"] = initialConsent !== "granted";
  const consentState = initialConsent === "granted" ? "granted" : "denied";

  // Google Consent Mode v2 default declaration
  window.gtag("consent", "default", {
    analytics_storage: consentState,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  window.gtag("js", new Date());

  // Configure GA4 with explicit page view management disabled so SPA router handles it cleanly
  const configOptions: Record<string, string | number | boolean> = {
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: safePageLocation(window.location.pathname),
    page_referrer: "",
  };

  // Enable debug mode if query parameter or localhost is present
  try {
    if (
      window.location.search.includes("debug_mode=true") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      configOptions["debug_mode"] = true;
    }
  } catch {
    /* ignore URL parsing errors */
  }

  window.gtag("config", GA_MEASUREMENT_ID, configOptions);
  if (initialConsent === "granted") loadAnalyticsScript();
}

function safePageLocation(pathname: string): string {
  return new URL(pathname.split(/[?#]/)[0] || "/", new URL(window.location.href).origin).href;
}

function loadAnalyticsScript(): void {
  if (typeof document === "undefined" || window.location.pathname === "/auth/callback") return;
  if (document.getElementById("bh-analytics")) return;
  const script = document.createElement("script");
  script.id = "bh-analytics";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Track a page view across client-side navigation.
 * Guarantees zero duplicates for identical consecutive paths.
 */
export function trackPageView(pathname: string, title?: string): void {
  if (typeof window === "undefined" || !window.gtag || getAnalyticsConsent() !== "granted") return;

  const cleanPath = (pathname || window.location.pathname || "/").split(/[?#]/)[0] || "/";
  if (cleanPath === "/auth/callback") return;
  if (lastTrackedPath === cleanPath) {
    return; // Prevent duplicate page views on identical paths
  }
  lastTrackedPath = cleanPath;

  window.gtag("event", "page_view", {
    page_path: cleanPath,
    page_location: safePageLocation(cleanPath),
    page_referrer: "",
    page_title: title || window.document?.title || "BajiHears",
  });
}

/**
 * Track a custom engagement event.
 * Accept only known event names, bounded metrics and enumerated labels.
 */
export function trackEngagementEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined" || !window.gtag || getAnalyticsConsent() !== "granted") return;

  if (!["thought_reaction", "thought_posted", "echo_sent", "duel_vote", "share", "bookmark", "pwa_install"].includes(eventName)) return;

  const safeParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (key === "category" && typeof val === "string" && (CATEGORIES as readonly string[]).includes(val)) safeParams[key] = val;
      if (key === "reaction" && typeof val === "string" && ["heart", "sad", "fire", "hug"].includes(val)) safeParams[key] = val;
      if (["value", "duration_ms", "safe_metric"].includes(key) && typeof val === "number" && Number.isFinite(val) && val >= 0 && val <= 1e9) safeParams[key] = val;
    }
  }

  window.gtag("event", eventName, safeParams);
}
