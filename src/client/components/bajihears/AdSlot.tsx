import { useEffect, useRef } from "react";
import { ADSENSE } from "@/shared/constants/site";

const AD_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// Injected from trusted code, so the CSP's 'strict-dynamic' allows it. Loading it
// here rather than in <head> keeps ad code off pages with no ad unit, which is
// also why Auto ads are not used: they could appear next to unreviewed posts.
function ensureAdScript() {
  if (document.querySelector(`script[src="${AD_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = AD_SCRIPT_SRC;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

/** Renders nothing until ads are switched on and a unit id exists. */
export function AdSlot({ slot }: { slot: string }) {
  const requested = useRef(false);
  const active = ADSENSE.adsEnabled && slot.length > 0;

  useEffect(() => {
    if (!active || requested.current) return;
    requested.current = true;
    ensureAdScript();
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  }, [active]);

  if (!active) return null;

  return (
    <aside className="my-8 min-h-[280px] border-y border-border/60 py-3">
      <p className="mb-2 text-center text-[11px] text-muted-foreground">Advertisement</p>
      <ins
        className="adsbygoogle block"
        data-ad-client={ADSENSE.client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
