import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, Flame, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { CornerAvatar } from "@/client/components/bajihears/CornerAvatar";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useAuth } from "@/client/stores/auth-context";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { apiFetchUserActivity } from "@/routes/api/wall";
import { randomSeed, relativeTime, stripHandle } from "@/shared/utils";
import type { Category, Unsaid } from "@/shared/types/unsaid";
import {
  readAvatarSeed,
  readAvatarPhoto,
  readHandle,
  readSavedThoughts,
  writeAvatarSeed,
  writeHandle,
} from "@/client/lib/local-storage";

export const Route = createFileRoute("/corner")({
  head: () => ({
    meta: [
      { title: "Your Corner | BajiHears" },
      {
        name: "description",
        content: "Your thoughts, saved notes, identity, and account settings.",
      },
    ],
  }),
  component: CornerPage,
});
type Tab = "thoughts" | "saved" | "settings";
interface ActivityPost {
  id: string;
  text: string;
  category: Category;
  status: string;
  createdAt: number;
  totalLikes: number;
  echoCount: number;
  echoes: Array<{ id: string; text: string; handle: string | null; createdAt: number }>;
}
interface Activity {
  posts: ActivityPost[];
  totalLikesReceived: number;
  totalPosts: number;
  likedPosts: Unsaid[];
}

function CornerPage() {
  const { user, profile, signInWithGoogle, signOut, isLoading: authLoading } = useAuth();
  const { deviceToken } = useDeviceToken();
  const { totalWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const [tab, setTab] = useState<Tab>("thoughts");
  const [seed, setSeed] = useState(() => readAvatarSeed() ?? "baji");
  const [handle, setHandle] = useState(() => readHandle() ?? "");
  const [savedThoughts] = useState(() => readSavedThoughts());
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!deviceToken) return;
    setActivityLoading(true);
    setActivityError(false);
    try {
      const result = await apiFetchUserActivity({
        data: { profileId: user?.id ?? null, deviceToken },
      });
      if (!result.ok) throw new Error(result.error.message);
      setActivity(result.data as Activity);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }, [deviceToken, user?.id]);
  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const saveIdentity = () => {
    const clean = stripHandle(handle);
    setHandle(clean);
    writeHandle(clean || null);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1500);
  };
  const displayName = handle
    ? `@${stripHandle(handle)}`
    : profile?.handle
      ? `@${profile.handle}`
      : "Your Corner";
  const tabs: Array<[Tab, string]> = [
    ["thoughts", "My thoughts"],
    ["saved", "Saved"],
    ["settings", "Settings"],
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-4 pb-32 pt-5 text-foreground">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          className="tap-44 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          The Wall
        </Link>
        <h1 className="font-display text-lg font-bold">Your Corner</h1>
        <span className="w-16" />
      </header>
      <section className="paper-card motion-note-in mt-5 p-5">
        <div className="flex items-center gap-4">
          <CornerAvatar seed={seed} photoUrl={readAvatarPhoto()} size={60} />
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-bold text-ink">{displayName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {user ? "Account connected" : "Guest activity on this device"}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Metric label="Thoughts" value={activity?.totalPosts ?? 0} />
          <Metric label="Responses" value={activity?.totalLikesReceived ?? 0} />
          <Metric label="Saved" value={savedThoughts.length} />
        </div>
        <button
          type="button"
          onClick={openWarmthSheet}
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-butter/70 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-coral" />
            Ember
          </span>
          <span className="font-mono font-bold text-coral">{totalWarmth}</span>
        </button>
      </section>
      <nav
        className="mt-5 grid grid-cols-3 rounded-2xl border border-border bg-paper p-1"
        aria-label="Your Corner sections"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-xl text-xs font-semibold ${tab === key ? "bg-coral text-white" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "thoughts" && (
        <section className="mt-6" aria-labelledby="thoughts-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="thoughts-heading" className="font-display text-xl font-bold">
                My thoughts
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Posts from this device and connected account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadActivity()}
              className="tap-44 grid place-items-center rounded-full"
              aria-label="Refresh activity"
            >
              <RefreshCw className={`size-4 ${activityLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {activityLoading && !activity ? (
            <div className="mt-8 flex justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : activityError ? (
            <div
              className="mt-4 rounded-2xl border border-border bg-paper p-5 text-center text-sm text-muted-foreground"
              role="alert"
            >
              Activity could not load. Your local settings are still available.
            </div>
          ) : activity?.posts.length ? (
            <div className="mt-4 space-y-3">
              {activity.posts.map((post) => (
                <article key={post.id} className="paper-card p-4">
                  <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-coral">{post.category}</span>
                    <span>{relativeTime(post.createdAt)}</span>
                  </div>
                  <p className="mt-3 font-quote text-lg leading-7 text-ink">“{post.text}”</p>
                  <div className="mt-3 flex gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{post.totalLikes} reactions</span>
                    <span>{post.echoCount} Echoes</span>
                    <span className="ml-auto capitalize">{post.status}</span>
                  </div>
                  {post.echoes.length > 0 && (
                    <details className="mt-3 rounded-xl bg-cream/60 p-3">
                      <summary className="cursor-pointer text-xs font-semibold">
                        Read Echoes
                      </summary>
                      <div className="mt-2 space-y-2">
                        {post.echoes.map((echo) => (
                          <p key={echo.id} className="text-sm leading-6 text-ink/80">
                            “{echo.text}”{" "}
                            <span className="text-xs text-muted-foreground">
                              — {echo.handle ? `@${stripHandle(echo.handle)}` : "anonymous"}
                            </span>
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-border bg-paper p-7 text-center">
              <p className="font-display text-lg font-bold">A quiet corner, for now</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Thoughts you share will appear here with their real reactions and Echoes.
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-coral px-4 text-sm font-bold text-white"
              >
                Write on the Wall
              </Link>
            </div>
          )}
        </section>
      )}

      {tab === "saved" && (
        <section className="mt-6">
          <h2 className="font-display text-xl font-bold">Saved thoughts</h2>
          <p className="mt-1 text-xs text-muted-foreground">Saved only in this browser.</p>
          {savedThoughts.length ? (
            <div className="mt-4 space-y-3">
              {savedThoughts.map((item) => (
                <article key={item.id} className="paper-card p-4">
                  <div className="flex gap-2 text-xs font-semibold text-coral">
                    <Bookmark className="size-4" />
                    {item.category}
                  </div>
                  <p className="mt-3 font-quote text-lg leading-7">“{item.text}”</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Save a thought from the Wall and it will wait here.
            </p>
          )}
        </section>
      )}

      {tab === "settings" && (
        <section className="mt-6 space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold">Identity</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your avatar decorates this Corner. Your handle appears only when you deliberately post
              or Echo with it.
            </p>
          </div>
          <div className="paper-card p-5">
            <div className="flex items-center gap-3">
              <CornerAvatar seed={seed} size={50} />
              <button
                type="button"
                onClick={() => {
                  const next = randomSeed();
                  setSeed(next);
                  writeAvatarSeed(next);
                }}
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
              >
                Try another avatar
              </button>
            </div>
            <label
              className="mt-5 block text-xs font-bold text-muted-foreground"
              htmlFor="corner-handle"
            >
              Optional public handle
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="corner-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="yourhandle"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-coral"
              />
              <button
                type="button"
                onClick={saveIdentity}
                className="rounded-xl bg-coral px-4 text-sm font-bold text-white"
              >
                {savedNotice ? "Saved" : "Save"}
              </button>
            </div>
          </div>
          <div className="paper-card p-5">
            <h3 className="font-display text-lg font-bold">Account</h3>
            {authLoading ? (
              <Loader2 className="mt-4 size-4 animate-spin" />
            ) : user ? (
              <>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  Connected as {user.email ?? "your account"}. Server-backed posts and Echoes can be
                  associated with your profile; browser-only drafts and saves stay on this device.
                </p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Continue as a guest, or connect Google so server-backed posts and Echoes can
                  follow your profile. Drafts, saves, and avatar choices remain local.
                </p>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="mt-4 min-h-11 rounded-xl bg-coral px-4 text-sm font-bold text-white"
                >
                  Continue with Google
                </button>
              </>
            )}
          </div>
          <div className="rounded-2xl bg-lilac/60 p-4 text-xs leading-5 text-muted-foreground">
            <Settings2 className="mb-2 size-4 text-ink" />
            No notification preferences are shown until notifications are actually supported.
          </div>
        </section>
      )}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-cream/70 p-3">
      <p className="font-mono text-lg font-bold text-ink">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
