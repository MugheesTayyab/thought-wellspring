import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Settings2, Share2, X } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";

export function CornerMenu({ seed }: { seed: string }) {
  const [open, setOpen] = useState(false);

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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border-border w-full max-w-sm rounded-2xl border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CornerAvatar seed={seed} size={44} />
                <p className="font-display text-lg">Your Public Corner</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="text-muted-foreground size-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={share}
              className="border-border bg-secondary/40 mt-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
            >
              <Share2 className="text-primary size-4" aria-hidden />
              Share BajiHears
            </button>

            <Link
              to="/corner"
              onClick={() => setOpen(false)}
              className="border-border bg-secondary/40 mt-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
            >
              <Settings2 className="text-primary size-4" aria-hidden />
              Adjust your Corner
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
