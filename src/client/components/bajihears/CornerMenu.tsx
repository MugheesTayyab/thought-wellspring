import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Settings2, Share2, X, LogIn, LogOut, CheckCircle2, MessageCircle, Image as ImageIcon } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";
import { useAuth } from "@/client/stores/auth-context";
import { readAvatarPhoto, writeAvatarPhoto } from "@/client/lib/local-storage";
import { triggerHaptic } from "@/client/lib/haptics";

export function CornerMenu({ seed }: { seed: string }) {
  const [open, setOpen] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => readAvatarPhoto());
  const { user, profile, signInWithGoogle, signOut, isLoading } = useAuth();

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setCustomPhoto(dataUrl);
          writeAvatarPhoto(dataUrl);
          triggerHaptic("selection");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
        <CornerAvatar seed={seed} photoUrl={customPhoto} size={32} />
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-[310px] rounded-3xl border border-white/12 bg-gradient-to-b from-[#1f1712]/95 via-[#17110D]/95 to-[#100b08]/98 p-5 text-[#F5EFE9] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-[scaleUp_0.18s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CornerAvatar seed={seed} photoUrl={customPhoto} size={42} />
                  <div className="min-w-0">
                    <p className="font-display truncate text-base font-bold">
                      {profile?.handle || (user?.email ? user.email.split("@")[0] : "Your Public Corner")}
                    </p>
                    <p className="font-sans text-[11px] text-muted-foreground flex items-center gap-1">
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
                  <X className="text-[#9C8F87] size-4 hover:text-[#F5EFE9] transition-colors" />
                </button>
              </div>

              {/* Avatar Quick Switch: Choose from Gallery */}
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-sans font-medium text-[#F5EFE9] transition cursor-pointer">
                  <ImageIcon className="size-3 text-[#E8552E]" />
                  <span>Choose from Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Google Sign In / Account Status */}
              {!user ? (
                <div className="mt-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <p className="font-sans text-xs text-[#F5EFE9]/80 mb-2.5 leading-snug">
                    Sign in to secure your Corner and keep your streak safe. <span className="text-[#E8552E] font-medium">10-day streak gets followed by Baji! 👑</span>
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
                className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-[#F5EFE9] transition hover:bg-white/[0.07] cursor-pointer"
              >
                <Share2 className="text-[#E8552E] size-3.5" aria-hidden />
                <span>Share BajiHears</span>
              </button>

              <Link
                to="/corner"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-[#E8552E]/30 bg-[#E8552E]/10 px-3.5 py-2.5 text-xs font-semibold text-[#F5EFE9] transition hover:bg-[#E8552E]/20 cursor-pointer"
              >
                <MessageCircle className="text-[#E8552E] size-3.5" aria-hidden />
                <span>My Whispers & Corner</span>
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 cursor-pointer"
                >
                  <LogOut className="size-3.5" aria-hidden />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
