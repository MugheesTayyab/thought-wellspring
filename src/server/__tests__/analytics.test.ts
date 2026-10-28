import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  GA_MEASUREMENT_ID,
  getAnalyticsConsent,
  setAnalyticsConsent,
  initGoogleAnalytics,
  trackPageView,
  trackEngagementEvent,
  _resetAnalyticsForTesting,
} from "@/client/lib/analytics";

describe("Google Analytics 4 & Consent Mode v2", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    _resetAnalyticsForTesting();
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };

    (globalThis as any).window = {
      location: {
        pathname: "/duel",
        search: "",
        href: "https://bajihears.app/duel",
        hostname: "bajihears.app",
      },
      document: {
        title: "The Duel | BajiHears",
      },
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
    };
    (globalThis as any).localStorage = mockStorage;
  });

  it("exports the required Measurement ID G-YK9LL21171", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-YK9LL21171");
  });

  it("defaults to pending consent and updates when consented", () => {
    expect(getAnalyticsConsent()).toBe("pending");
    setAnalyticsConsent("granted");
    expect(getAnalyticsConsent()).toBe("granted");
    setAnalyticsConsent("denied");
    expect(getAnalyticsConsent()).toBe("denied");
  });

  it("configures Google Consent Mode v2 and GA4 configuration on initialization", () => {
    setAnalyticsConsent("denied");
    initGoogleAnalytics();

    expect(window.dataLayer).toBeDefined();
    expect(typeof window.gtag).toBe("function");

    const consentCalls = (window.dataLayer || []).filter(
      (args) => Array.isArray(args) && args[0] === "consent",
    ) as unknown[][];
    expect(consentCalls.length).toBeGreaterThan(0);
    expect(consentCalls[0]?.[1]).toBe("default");
    expect(consentCalls[0]?.[2]).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
    });

    const configCalls = (window.dataLayer || []).filter(
      (args) => Array.isArray(args) && args[0] === "config",
    ) as unknown[][];
    expect(configCalls.length).toBe(1);
    expect(configCalls[0]?.[1]).toBe("G-YK9LL21171");
    expect((configCalls[0]?.[2] as Record<string, unknown>)?.[
      "send_page_view"
    ]).toBe(false);
    expect((configCalls[0]?.[2] as Record<string, unknown>)?.[
      "anonymize_ip"
    ]).toBe(true);
  });

  it("tracks page views and deduplicates consecutive duplicate paths", () => {
    initGoogleAnalytics();
    localStorage.setItem("bh:analytics-consent", "granted");
    const gtagSpy = vi.spyOn(window, "gtag");

    trackPageView("/duel", "The Duel | BajiHears");
    expect(gtagSpy).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({
      page_path: "/duel",
      page_title: "The Duel | BajiHears",
    }));

    // Calling again with the same path must be ignored
    gtagSpy.mockClear();
    trackPageView("/duel", "The Duel | BajiHears");
    expect(gtagSpy).not.toHaveBeenCalled();

    // Calling with a different path must track
    trackPageView("/corner", "Your Corner | BajiHears");
    expect(gtagSpy).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({
      page_path: "/corner",
      page_title: "Your Corner | BajiHears",
    }));
  });

  it("strictly filters PII from custom engagement events", () => {
    initGoogleAnalytics();
    localStorage.setItem("bh:analytics-consent", "granted");
    const gtagSpy = vi.spyOn(window, "gtag");

    trackEngagementEvent("thought_reaction", {
      category: "Silent Thoughts",
      reaction: "heart",
      handle: "secret_user",
      username: "john_doe",
      email: "user@example.com",
      confession: "My secret confession text that should never leak",
      deviceToken: "0123456789abcdef",
      safe_metric: 42,
    });

    expect(gtagSpy).toHaveBeenCalledWith("event", "thought_reaction", {
      category: "Silent Thoughts",
      reaction: "heart",
      safe_metric: 42,
    });
  });
  it("rejects unknown event names, arbitrary text parameters, and nonfinite metrics", () => {
    initGoogleAnalytics();
    localStorage.setItem("bh:analytics-consent", "granted");
    const spy = vi.spyOn(window, "gtag");
    trackEngagementEvent("private@example.test", { value: 1 });
    expect(spy).not.toHaveBeenCalled();
    trackEngagementEvent("thought_reaction", { category: "private@example.test", extra: "private text", value: Infinity, reaction: "heart" });
    expect(spy).toHaveBeenCalledWith("event", "thought_reaction", { reaction: "heart" });
  });
  it("does not emit page views or engagement before consent or after withdrawal", () => {
    initGoogleAnalytics();
    const spy = vi.spyOn(window, "gtag");
    trackPageView("/");
    trackEngagementEvent("thought_reaction", { reaction: "heart" });
    expect(spy).not.toHaveBeenCalled();
    setAnalyticsConsent("denied");
    spy.mockClear();
    trackPageView("/corner");
    expect(spy).not.toHaveBeenCalled();
  });
  it("excludes callback credentials and strips query strings and fragments", () => {
    window.location.href = "https://bajihears.app/?email=private@example.test#access_token=secret";
    localStorage.setItem("bh:analytics-consent", "granted");
    initGoogleAnalytics();
    const spy = vi.spyOn(window, "gtag");
    trackPageView("/auth/callback");
    expect(spy).not.toHaveBeenCalled();
    trackPageView("/duel?email=private@example.test#secret");
    expect(spy).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({
      page_path: "/duel", page_location: "https://bajihears.app/duel", page_referrer: "",
    }));
    expect(JSON.stringify(window.dataLayer)).not.toContain("private@example");
    expect(JSON.stringify(window.dataLayer)).not.toContain("access_token");
  });
  it("loads exactly once after leaving a cold callback with stored consent", () => {
    localStorage.setItem("bh:analytics-consent", "granted");
    window.location.pathname = "/auth/callback";
    window.location.href = "https://bajihears.app/auth/callback?code=private";
    let loaded = false;
    const appendChild = vi.fn(() => { loaded = true; });
    vi.stubGlobal("document", {
      getElementById: () => loaded ? {} : null,
      createElement: () => ({}), head: { appendChild },
    });
    initGoogleAnalytics();
    expect(appendChild).not.toHaveBeenCalled();
    window.location.pathname = "/";
    window.location.href = "https://bajihears.app/";
    initGoogleAnalytics();
    initGoogleAnalytics();
    expect(appendChild).toHaveBeenCalledOnce();
  });
});
