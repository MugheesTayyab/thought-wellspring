import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Settings2, Share2, X, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";
import { useAuth } from "@/client/stores/auth-context";

export function CornerMenu({ seed }: { seed: string }) {
  const [open, setOpen] = useState(false);
  const { user, profile, signInWithGoogle, signOut, isLoading } = useAuth();

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
        className="relative rounded-full ring-2 ring-primary/40 hover:ring-primary shadow-[0_0_12px_rgba(250,84,28,0.25)] hover:shadow-[0_0_20px_rgba(250,84,28,0.45)] transition-all duration-300 p-0.5 active:scale-95 cursor-pointer"
      >
        <CornerAvatar seed={seed} size={32} />
        {user && (
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0F0A0A]" />
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <div
              className="pop-in bg-card/95 border-border shadow-glow w-full max-w-xs rounded-3xl border p-5 text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CornerAvatar seed={seed} size={40} />
                  <div className="min-w-0">
                    <p className="font-display truncate text-base font-bold">
                      {profile?.handle || (user?.email ? user.email.split("@")[0] : "Your Public Corner")}
                    </p>
                    <p className="font-vibe text-[11px] text-muted-foreground flex items-center gap-1">
                      {user ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-400" />
                          <span>Google Linked</span>
                        </>
                      ) : (
                        "Anonymous Guest"
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="shrink-0 cursor-pointer"
                >
                  <X className="text-muted-foreground size-5 hover:text-foreground" />
                </button>
              </div>

              {/* Google Sign In / Account Status */}
              {!user ? (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="font-vibe text-xs text-muted-foreground mb-2.5">
                    Save your streaks, unlocked tabs, and tea across all devices.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      signInWithGoogle();
                    }}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black shadow-sm transition hover:bg-neutral-100 active:scale-95 cursor-pointer"
                  >
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                  <p className="font-vibe text-[11px] text-muted-foreground">Connected Email</p>
                  <p className="font-vibe text-xs font-medium text-foreground truncate">{user.email}</p>
                </div>
              )}

              <button
                type="button"
                onClick={share}
                className="border-border bg-secondary/40 mt-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary/70 cursor-pointer"
              >
                <Share2 className="text-primary size-4" aria-hidden />
                Share BajiHears
              </button>

              <Link
                to="/corner"
                onClick={() => setOpen(false)}
                className="border-border bg-secondary/40 mt-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary/70 cursor-pointer"
              >
                <Settings2 className="text-primary size-4" aria-hidden />
                Adjust your Corner
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/20 cursor-pointer"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign Out
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
