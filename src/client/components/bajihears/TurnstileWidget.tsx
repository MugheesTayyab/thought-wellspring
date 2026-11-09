import { useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env["VITE_TURNSTILE_SITE_KEY"];

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

let scriptLoad: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error("Turnstile could not load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/**
 * Bot check for the composer. Most people never see it; it only shows a challenge
 * when Cloudflare is unsure. Change `key` on the element to get a fresh token,
 * since each token works only once.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const latestOnToken = useRef(onToken);
  latestOnToken.current = onToken;

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    const turnstile = () => (window as unknown as { turnstile: Turnstile }).turnstile;

    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current) return;
        widgetId = turnstile().render(container.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: (token) => latestOnToken.current(token),
          "expired-callback": () => latestOnToken.current(null),
          "error-callback": () => latestOnToken.current(null),
        });
      })
      .catch((error: unknown) => console.error("[turnstile]", error));

    return () => {
      cancelled = true;
      if (widgetId) turnstile().remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={container} className="mt-4 flex justify-center" />;
}
