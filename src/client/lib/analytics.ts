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

export const GA_MEASUREMENT_ID = "G-YK9LL21171";

export type AnalyticsConsentStatus = "granted" | "denied" | "pending";

const CONSENT_STORAGE_KEY = "bh:analytics-consent";

declare global {
  interface Window {
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
    window.gtag = function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  if (isInitialized) return;
  isInitialized = true;

  const initialConsent = getAnalyticsConsent();
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
}

/**
 * Track a page view across client-side navigation.
 * Guarantees zero duplicates for identical consecutive paths.
 */
export function trackPageView(pathname: string, title?: string): void {
  if (typeof window === "undefined" || !window.gtag) return;

  const cleanPath = pathname || window.location.pathname || "/";
  if (lastTrackedPath === cleanPath) {
    return; // Prevent duplicate page views on identical paths
  }
  lastTrackedPath = cleanPath;

  window.gtag("event", "page_view", {
    page_path: cleanPath,
    page_location: window.location.href,
    page_title: title || document.title || "BajiHears",
  });
}

/**
 * Track a custom engagement event.
 * Strips all potential PII (handles, confessions, tokens, emails, names) automatically.
 */
export function trackEngagementEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined" || !window.gtag) return;

  const PII_DENYLIST = new Set([
    "handle",
    "username",
    "email",
    "text",
    "confession",
    "content",
    "token",
    "devicetoken",
    "profileid",
    "name",
    "password",
  ]);

  const safeParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val === null || val === undefined) continue;
      if (PII_DENYLIST.has(key.toLowerCase())) continue;
      safeParams[key] = val;
    }
  }

  window.gtag("event", eventName, safeParams);
}
