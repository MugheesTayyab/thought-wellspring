import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Settings2, Share2, X } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";

export function CornerMenu({ seed }: { seed: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "BajiHears", text: "Say the unsaid.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* dismissed */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Your Public Corner"
        className="rounded-full"
      >
        <CornerAvatar seed={seed} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="pop-in bg-card/95 border-border shadow-glow w-full max-w-xs rounded-3xl border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CornerAvatar seed={seed} size={40} />
                <p className="font-display truncate text-base">Your Public Corner</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0"
              >
                <X className="text-muted-foreground size-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={share}
              className="border-border bg-secondary/40 mt-5 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
            >
              <Share2 className="text-primary size-4" aria-hidden />
              Share BajiHears
            </button>

            <Link
              to="/corner"
              onClick={() => setOpen(false)}
              className="border-border bg-secondary/40 mt-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
            >
              <Settings2 className="text-primary size-4" aria-hidden />
              Adjust your Corner
            </Link>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
