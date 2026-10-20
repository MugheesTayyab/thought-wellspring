import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Lock, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { getOrCreateIdentity } from "@/client/lib/identity";

interface Props {
  type: "read" | "duel" | null;
  onClose: () => void;
  onUnlocked?: () => void;
}

export const LockedTabModal = ({ type, onClose }: Props) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!type) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [type, onClose]);
  if (!type) return null;
  const current = getOrCreateIdentity().totalActions ?? 0;
  const target = type === "duel" ? 3 : 5;
  const needed = Math.max(0, target - current);
  const label = type === "duel" ? "Duel" : "Baji Read";
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-title"
        onClick={(event) => event.stopPropagation()}
        className="motion-panel-in relative w-full max-w-sm rounded-3xl border border-border bg-paper p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap-44 absolute right-3 top-3 grid place-items-center"
        >
          <X className="size-4" />
        </button>
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-butter">
          <Lock className="size-4" />
        </div>
        <h2 id="locked-title" className="mt-4 text-center font-display text-2xl font-bold">
          {label} is still forming
        </h2>
        <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          Explore the Wall naturally first. This gives the feature enough real activity to respond
          without inventing a result.
        </p>
        <div className="mt-5 rounded-2xl bg-cream/70 p-4">
          <div className="flex justify-between text-xs font-semibold">
            <span>Activity gathered</span>
            <span>
              {Math.min(current, target)} of {target}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="motion-progress h-full rounded-full bg-coral"
              style={{ width: `${Math.min(100, (current / target) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {needed} more {needed === 1 ? "activity" : "activities"} needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate({ to: "/" });
          }}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-coral text-sm font-bold text-white"
        >
          Explore the Wall <ArrowRight className="size-4" />
        </button>
      </section>
    </div>,
    document.body,
  );
};
