import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Dices, CheckCircle2 } from "lucide-react";
import { CornerAvatar } from "@/client/components/bajihears/CornerAvatar";
import { randomSeed, stripHandle } from "@/shared/utils";
import { useAuth } from "@/client/stores/auth-context";
import {
  readAvatarSeed,
  readHandle,
  writeAvatarSeed,
  writeHandle,
} from "@/client/lib/local-storage";

export const Route = createFileRoute("/corner")({
  head: () => ({
    meta: [
      { title: "Adjust your Corner — BajiHears" },
      {
        name: "description",
        content:
          "Your Public Corner on BajiHears: pick your avatar, set your handle, choose what reaches your inbox.",
      },
      { property: "og:title", content: "Adjust your Corner — BajiHears" },
      {
        property: "og:description",
        content: "Pick your avatar, set your handle, choose what reaches your inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CornerPage,
});

function CornerPage() {
  const { user, signInWithGoogle, signOut, isLoading } = useAuth();
  const [seed, setSeed] = useState("baji");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [notify, setNotify] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSeed(readAvatarSeed() ?? "baji");
    setHandle(readHandle() ?? "");
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  const reroll = () => {
    const next = randomSeed();
    setSeed(next);
    writeAvatarSeed(next);
  };

  const save = () => {
    const clean = stripHandle(handle);
    setHandle(clean);
    writeHandle(clean || null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
      <Link
        to="/"
        className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to The Wall
      </Link>

      <h1 className="font-display mt-5 text-2xl font-bold">Adjust your Corner</h1>
      <p className="text-muted-foreground mt-1 text-sm font-vibe">
        This is yours. Nobody sees more than you let them.
      </p>

      {/* Account Backup Section */}
      <section className="border-border bg-card mt-6 rounded-2xl border p-4 font-vibe">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Cloud Identity Backup</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {user ? "Your whispers, warmth, and unlocked tabs are backed up." : "Sign in to keep your streak & badges across browsers."}
            </p>
          </div>
          {user && <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />}
        </div>

        {user ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="text-xs text-foreground truncate">{user.email}</span>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-rose-400 hover:underline font-semibold shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={isLoading}
            className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm transition hover:bg-neutral-100 active:scale-95 cursor-pointer"
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
        )}
      </section>

      <section className="border-border bg-card mt-4 flex items-center gap-4 rounded-2xl border p-4">
        <CornerAvatar seed={seed} size={64} />
        <div>
          <p className="text-sm font-semibold">Your face here isn&apos;t your face</p>
          <button
            type="button"
            onClick={reroll}
            className="text-primary mt-1 inline-flex items-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <Dices className="size-4" aria-hidden />
            Roll a new one
          </button>
        </div>
      </section>

      <section className="border-border bg-card mt-4 space-y-4 rounded-2xl border p-4">
        <label className="block">
          <span className="text-sm font-semibold">Your handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourname"
            className="border-border bg-secondary/40 mt-2 w-full rounded-xl border px-3 py-2 text-base sm:text-sm outline-none"
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            Only shown when you choose to post as yourself.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="so we can tell you if you win"
            className="border-border bg-secondary/40 mt-2 w-full rounded-xl border px-3 py-2 text-base sm:text-sm outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setNotify((v) => !v)}
          className="border-border bg-secondary/40 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold cursor-pointer"
        >
          Tell me when my Unsaid is picked
          <span
            className={`h-6 w-11 rounded-full p-1 transition-colors ${notify ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`bg-background block size-4 rounded-full transition-transform ${notify ? "translate-x-5" : ""}`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={save}
          className="bg-primary text-primary-foreground w-full rounded-xl px-4 py-3 text-sm font-bold cursor-pointer transition hover:opacity-95"
        >
          {saved ? "Saved." : "Save my Corner"}
        </button>
      </section>

      <button
        type="button"
        className="text-muted-foreground mt-6 w-full text-sm underline cursor-pointer hover:text-foreground"
        onClick={() => {
          writeHandle(null);
          setHandle("");
          setEmail("");
        }}
      >
        Delete my Corner
      </button>
    </main>
  );
}
