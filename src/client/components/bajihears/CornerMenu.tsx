import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  Settings2,
  Share2,
  X,
  LogIn,
  LogOut,
  CheckCircle2,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";
import { useAuth } from "@/client/stores/auth-context";
import { readAvatarPhoto, writeAvatarPhoto } from "@/client/lib/local-storage";
import { triggerHaptic } from "@/client/lib/haptics";
import { toast } from "sonner";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_PIXELS = 16_000_000;

function hasSupportedImageSignature(bytes: Uint8Array): boolean {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
    (value, index) => bytes[index] === value,
  );
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return jpeg || png || webp;
}

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
      toast.error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      e.target.value = "";
      return;
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasSupportedImageSignature(header)) {
      toast.error("That file is not a supported JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!img.width || !img.height || img.width * img.height > MAX_AVATAR_PIXELS) {
          toast.error("That image is too large to process safely.");
          return;
        }
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
      img.onerror = () => toast.error("That image could not be decoded.");
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-[310px] rounded-3xl border border-border-card bg-card p-5 text-foreground shadow-[0_20px_50px_-15px_rgba(62,43,38,0.2)] animate-[scaleUp_0.18s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CornerAvatar seed={seed} photoUrl={customPhoto} size={42} />
                  <div className="min-w-0">
                    <p className="font-display truncate text-base font-bold text-foreground">
                      {profile?.handle ||
                        (user?.email ? user.email.split("@")[0] : "Your Public Corner")}
                    </p>
                    <p className="font-sans text-[11px] text-muted-foreground flex items-center gap-1">
                      {user ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" />
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
                  className="shrink-0 cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Avatar Quick Switch: Choose from Gallery */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-card bg-secondary/60 hover:bg-secondary px-3 py-2 text-[11px] font-sans font-semibold text-foreground transition cursor-pointer">
                  <ImageIcon className="size-3.5 text-primary" />
                  <span>Choose from Gallery</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Google Sign In / Account Status */}
              {!user ? (
                <div className="mt-3.5 rounded-2xl border border-border-card bg-secondary/40 p-3.5 text-center">
                  <p className="font-sans text-xs text-muted-foreground mb-3 leading-snug">
                    Keep your Corner across devices. Posts and Echoes you share can sync with your
                    profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      signInWithGoogle();
                    }}
                    disabled={isLoading}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border-card bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition hover:bg-secondary active:scale-[0.98] cursor-pointer"
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
                    Continue with Google
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-border-card bg-secondary/50 p-3 text-left">
                  <p className="font-vibe text-[11px] text-muted-foreground">Connected Email</p>
                  <p className="font-vibe text-xs font-medium text-foreground truncate">
                    {user.email}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={share}
                className="mt-3 flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-border-card bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary cursor-pointer"
              >
                <Share2 className="text-primary size-3.5" aria-hidden />
                <span>Share BajiHears</span>
              </button>

              <Link
                to="/corner"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-accent px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-accent/80 cursor-pointer"
              >
                <MessageCircle className="text-primary size-3.5" aria-hidden />
                <span>My Whispers &amp; Corner</span>
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                >
                  <LogOut className="size-3.5" aria-hidden />
                  <span>Sign Out</span>
                </button>
              )}

              {/* Legal & About links */}
              <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-center gap-2.5 text-[11px] text-muted-foreground font-medium">
                <Link
                  to="/about"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground transition"
                >
                  About
                </Link>
                <span>&middot;</span>
                <Link
                  to="/privacy"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground transition"
                >
                  Privacy
                </Link>
                <span>&middot;</span>
                <Link
                  to="/terms"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground transition"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
