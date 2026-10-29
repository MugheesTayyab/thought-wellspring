import { describe, it, expect } from "vitest";
import { embeddedAuthBrowserName, BROWSER_SIGNIN_URL } from "@/client/lib/embedded-browser";

describe("Embedded-browser Google sign-in handoff", () => {
  it("recognizes Instagram and Facebook webviews", () => {
    expect(embeddedAuthBrowserName("Mozilla/5.0 iPhone Instagram 400.0.0")).toBe("Instagram");
    expect(embeddedAuthBrowserName("Mozilla/5.0 Android [FBAN/FB4A;FBAV/500]")).toBe("Facebook");
  });
  it("recognizes Android WebView without blocking standalone Chrome or Safari", () => {
    expect(embeddedAuthBrowserName("Mozilla/5.0 (Linux; Android 16; Pixel; wv) Chrome/156.0")).toBe(
      "this app",
    );
    expect(
      embeddedAuthBrowserName(
        "Mozilla/5.0 (Linux; Android 16; Pixel) Chrome/156.0 Mobile Safari/537.36",
      ),
    ).toBeNull();
    expect(
      embeddedAuthBrowserName("Mozilla/5.0 iPhone Version/19.0 Mobile Safari/605.1.15"),
    ).toBeNull();
  });
  it("hands off only a clean canonical URL, with no identity or callback token", () => {
    expect(BROWSER_SIGNIN_URL).toBe("https://bajihears.app/corner");
  });
});
