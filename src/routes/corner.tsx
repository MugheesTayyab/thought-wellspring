import { useHydrated } from "@/client/hooks/use-hydrated";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Flame,
  Loader2,
  RefreshCw,
  Settings2,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Compass,
  PenLine,
  Smartphone,
} from "lucide-react";
import { CornerAvatar } from "@/client/components/bajihears/CornerAvatar";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useAuth } from "@/client/stores/auth-context";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { apiFetchUserActivity } from "@/routes/api/wall";
import { authHeaders } from "@/client/lib/auth-headers";
import { isPushSupported, subscribeDeviceToPush } from "@/client/lib/notifications";
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
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "@/client/lib/analytics";

export const Route = createFileRoute("/corner")({
  head: () => ({
    meta: [
      { title: "Your Corner · A Quiet Space | BajiHears" },
      {
        name: "description",
        content:
          "A spot for the things you choose to keep close. Your thoughts, saved notes, identity, and settings.",
      },
      { property: "og:url", content: "https://bajihears.app/corner" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/corner" }],
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
  const hydrated = useHydrated();
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
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [analyticsConsent, setLocalAnalyticsConsent] = useState<AnalyticsConsentStatus>("pending");

  useEffect(() => {
    setLocalAnalyticsConsent(getAnalyticsConsent());
    const handleConsentChange = (e: Event) => {
      setLocalAnalyticsConsent((e as CustomEvent<AnalyticsConsentStatus>).detail);
    };
    window.addEventListener("bh:analytics-consent-changed", handleConsentChange);
    return () => window.removeEventListener("bh:analytics-consent-changed", handleConsentChange);
  }, []);

  const loadActivity = useCallback(async () => {
    if (!deviceToken) return;
    setActivityLoading(true);
    setActivityError(false);
    try {
      const result = await apiFetchUserActivity({
        data: { profileId: user?.id ?? null, deviceToken },
        headers: await authHeaders(),
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
    ["saved", "Saved notes"],
    ["settings", "Settings"],
  ];

  if (!hydrated)
    return (
      <main className="min-h-screen p-6">
        <p role="status">Loading your Corner…</p>
        <BottomNav />
      </main>
    );
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-4 pb-32 pt-5 text-foreground sm:px-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-border/80 pb-4">
        <Link
          to="/"
          className="tap-44 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="size-4" />
          The Wall
        </Link>
        <div className="text-center px-2">
          <h1 className="font-display text-lg font-bold text-ink">Your Corner</h1>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            A spot for the things you choose to keep close.
          </p>
        </div>
        <span className="w-16 shrink-0" aria-hidden />
      </header>

      {/* Identity Summary Card */}
      <section className="paper-card motion-note-in mt-5 p-5 sm:p-6" aria-label="Identity summary">
        <div className="flex items-center gap-3.5 min-w-0">
          <CornerAvatar seed={seed} photoUrl={readAvatarPhoto()} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-bold text-ink">{displayName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
              {user ? (
                <>
                  <UserCheck className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Google account connected</span>
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">Guest activity on this device</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Activity Metric Counter */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Metric label="Thoughts" value={activity?.totalPosts ?? 0} />
          <Metric label="Responses" value={activity?.totalLikesReceived ?? 0} />
          <Metric label="Saved notes" value={savedThoughts.length} />
        </div>

        {/* Compact Ember Link */}
        <button
          type="button"
          onClick={openWarmthSheet}
          className="mt-3.5 flex w-full items-center justify-between rounded-2xl border border-amber-300/70 bg-butter/60 px-4 py-3 text-left transition hover:bg-butter/80 active:scale-[0.99] cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-ink">
            <Flame className="size-4 text-coral" />
            <span>Ember balance</span>
          </span>
          <div className="flex items-center gap-1.5 text-coral">
            <span className="font-sans font-bold tabular-nums text-sm">{totalWarmth}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">· View details</span>
          </div>
        </button>
      </section>

      {/* Navigation Segmented Tabs */}
      <nav
        className="mt-5 grid grid-cols-3 rounded-2xl border border-border bg-paper p-1 shadow-2xs"
        aria-label="Your Corner sections"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-xl text-xs font-bold transition ${
              tab === key ? "bg-coral text-white shadow-xs" : "text-muted-foreground hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Tab: Thoughts */}
      {tab === "thoughts" && (
        <section className="mt-6" aria-labelledby="thoughts-heading">
          <h2 id="thoughts-heading" className="sr-only">
            My thoughts
          </h2>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Thoughts you&apos;ve shared from this device and connected account.
            </p>
            <button
              type="button"
              onClick={() => void loadActivity()}
              className="tap-44 shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-ink hover:bg-cream transition cursor-pointer"
              aria-label="Refresh activity"
            >
              <RefreshCw className={`size-3.5 ${activityLoading ? "animate-spin text-coral" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {activityLoading && !activity ? (
            <div className="mt-8 flex justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-coral" />
            </div>
          ) : activityError ? (
            <div
              className="mt-4 rounded-2xl border border-border bg-paper p-5 text-center text-sm text-muted-foreground"
              role="alert"
            >
              Activity could not load right now. Your local settings are still safe.
            </div>
          ) : activity?.posts.length ? (
            <div className="mt-4 space-y-3">
              {activity.posts.map((post) => (
                <article key={post.id} className="paper-card p-4 sm:p-5">
                  <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-coral">{post.category}</span>
                    <span>{relativeTime(post.createdAt)}</span>
                  </div>
                  <p className="mt-3 font-quote text-lg leading-relaxed text-ink">“{post.text}”</p>
                  <div className="mt-3 flex gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span>{post.totalLikes} reactions</span>
                    <span>{post.echoCount} Echoes</span>
                    <span className="ml-auto capitalize text-ink/70">{post.status}</span>
                  </div>
                  {post.echoes.length > 0 && (
                    <details className="mt-3 rounded-xl bg-cream/70 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-ink">
                        Read Echoes ({post.echoes.length})
                      </summary>
                      <div className="mt-2.5 space-y-2">
                        {post.echoes.map((echo) => (
                          <p key={echo.id} className="text-sm leading-relaxed text-ink/80">
                            “{echo.text}”{" "}
                            <span className="text-xs text-muted-foreground">
                              · {echo.handle ? `@${stripHandle(echo.handle)}` : "anonymous"}
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
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-cream text-coral">
                <PenLine className="size-5" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-ink">
                A quiet corner, for now
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                No thoughts from you yet. You can write whenever you're ready. Reading along is
                completely good too.
              </p>
              <Link
                to="/"
                className="mt-4 tap-44 inline-flex items-center justify-center gap-1.5 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs hover:bg-coral-dark"
              >
                <span>Write on the Wall</span>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Tab: Saved Notes */}
      {tab === "saved" && (
        <section className="mt-6" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="font-display text-xl font-bold text-ink">
            Saved thoughts
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kept safely in this browser for quiet revisiting.
          </p>

          {savedThoughts.length ? (
            <div className="mt-4 space-y-3">
              {savedThoughts.map((item) => (
                <article key={item.id} className="paper-card p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-coral">
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="size-3.5" />
                      <span>{item.category}</span>
                    </div>
                    {item.sourceType === "editorial" && (
                      <span className="text-[11px] font-medium text-[#7D3028] bg-[#FBE6E4] px-2 py-0.5 rounded-full border border-[#E3B8B1]">
                        BajiHears Original · Fictional Story
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-quote text-lg leading-relaxed text-ink">“{item.text}”</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-border bg-paper p-7 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-cream text-coral">
                <Bookmark className="size-5" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-ink">
                Nothing saved just yet
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                If a thought stays with you on the Wall, tap its bookmark to save it for later.
              </p>
              <Link
                to="/"
                className="mt-4 tap-44 inline-flex items-center justify-center gap-1.5 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs hover:bg-coral-dark"
              >
                <Compass className="size-3.5" />
                <span>Browse the Wall</span>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Tab: Settings */}
      {tab === "settings" && (
        <section className="mt-6 space-y-4" aria-labelledby="settings-heading">
          <div>
            <h2 id="settings-heading" className="font-display text-xl font-bold text-ink">
              Identity &amp; Settings
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              What shows up when you post, and how your Corner connects across devices.
            </p>
          </div>

          {/* Identity Box */}
          <div className="paper-card p-5">
            <h3 className="font-display text-base font-bold text-ink">Corner Avatar</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Decorates your personal Corner on this device.
            </p>
            <div className="mt-3.5 flex items-center gap-3">
              <CornerAvatar seed={seed} size={50} />
              <button
                type="button"
                onClick={() => {
                  const next = randomSeed();
                  setSeed(next);
                  writeAvatarSeed(next);
                }}
                className="tap-44 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-cream"
              >
                Try another avatar
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-border/70">
              <label className="block text-xs font-bold text-ink" htmlFor="corner-handle">
                Optional Public Handle
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Shown publicly only when you deliberately choose "With a handle" while posting or
                echoing.
              </p>
              <div className="mt-2.5 flex gap-2">
                <input
                  id="corner-handle"
                  maxLength={39}
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="yourhandle"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none focus:border-coral focus:ring-1 focus:ring-coral/20"
                />
                <button
                  type="button"
                  onClick={saveIdentity}
                  className="tap-44 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs hover:bg-coral-dark"
                >
                  {savedNotice ? "Saved" : "Save handle"}
                </button>
              </div>
            </div>
          </div>

          {/* Account Sync Card */}
          <div className="paper-card p-5">
            <h3 className="font-display text-base font-bold text-ink">Account Sync</h3>
            <p className="mt-1 text-xs text-muted-foreground">Keep your Corner across devices.</p>

            {authLoading ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-coral" />
                <span>Checking account status…</span>
              </div>
            ) : user ? (
              <div className="mt-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Connected as{" "}
                  <span className="font-semibold text-ink">{user.email ?? "your account"}</span>.
                  Server-backed thoughts and Echoes stay attached to your profile.
                </p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-4 tap-44 inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-cream"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Continue as a guest, or connect Google so your thoughts and Echoes can follow you
                  across devices. Drafts and saves remain safely on this device.
                </p>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="mt-4 tap-44 inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs hover:bg-coral-dark"
                >
                  <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Privacy & Notification Reassurance */}
          <div className="paper-card p-5">
            <h3 className="font-display text-base font-bold text-ink">Notifications</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional alerts for the community pick. You can turn them off in your browser
              settings.
            </p>
            <button
              type="button"
              disabled={enablingNotifications}
              className="mt-3 tap-44 rounded-xl border border-border px-4 text-xs font-semibold disabled:opacity-50"
              onClick={async () => {
                if (!isPushSupported()) {
                  setNotificationNotice(
                    "This browser does not support push notifications. On iPhone, add the app to your Home Screen first.",
                  );
                  return;
                }
                setEnablingNotifications(true);
                try {
                  const result = await subscribeDeviceToPush({ deviceToken });
                  setNotificationNotice(
                    result.success
                      ? "Notifications are enabled for this browser."
                      : result.error || "Notifications could not be enabled.",
                  );
                } finally {
                  setEnablingNotifications(false);
                }
              }}
            >
              {enablingNotifications ? "Enabling…" : "Enable notifications"}
            </button>
            {notificationNotice && (
              <p role="status" className="mt-2 text-xs text-muted-foreground">
                {notificationNotice}
              </p>
            )}
          </div>

          {/* Analytics & Privacy Preference */}
          <div className="paper-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-coral shrink-0" />
              <h3 className="font-display text-base font-bold text-ink">
                Analytics &amp; Transparency
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Help improve BajiHears by anonymously sharing page view and feature performance metrics via Google Analytics 4 (<code>G-YK9LL21171</code>).
            </p>
            <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-cream/40 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Anonymous Site Analytics</p>
                <p className="text-[11px] text-muted-foreground">
                  {analyticsConsent === "granted"
                    ? "Enabled — IP anonymized, zero personal content tracking."
                    : "Disabled — Google Consent Mode v2 enforces denied storage."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = analyticsConsent === "granted" ? "denied" : "granted";
                  setAnalyticsConsent(next);
                  setLocalAnalyticsConsent(next);
                }}
                className={`tap-44 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  analyticsConsent === "granted"
                    ? "bg-primary text-white shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {analyticsConsent === "granted" ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          {/* Install App & Offline Access */}
          <div className="paper-card p-5">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4.5 text-coral shrink-0" />
              <h3 className="font-display text-base font-bold text-ink">
                Install App &amp; Offline Access
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Keep BajiHears on your home screen. An internet connection is needed to read and participate.
            </p>

            <div className="mt-4 space-y-3">
              {/* Option 1: Live Web App (PWA) */}
              <div className="rounded-2xl border border-border/80 bg-cream/50 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">Live Web App (Recommended)</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Auto-Updates
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Gets updates when you reconnect and reopen the app. If you lose connection, a reconnect page helps you return safely.
                </p>
                <div className="mt-2 text-xs text-ink/80 flex items-center gap-2">
                  <span className="text-coral font-bold">&bull;</span>
                  <span><strong>iPhone:</strong> Tap Safari Share <span className="font-mono text-[11px]">&uarr;</span> &rarr; <em>Add to Home Screen</em></span>
                </div>
                <div className="mt-1 text-xs text-ink/80 flex items-center gap-2">
                  <span className="text-coral font-bold">&bull;</span>
                  <span><strong>Android:</strong> Tap browser menu ⋮ &rarr; <em>Install App</em></span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A standalone Android APK is not available yet. Use the home screen app above.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-paper/60 p-4 text-xs leading-relaxed text-muted-foreground flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-coral shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="font-semibold text-ink">Quiet defaults &amp; privacy</p>
              <p className="mt-0.5">
                Notifications announce community picks when you opt in. Your email stays private.
                Choosing Anonymous hides your account link from public posts. Drafts, saved notes,
                avatars, and Ember remain in this browser.
              </p>
              <div className="mt-2.5 flex items-center gap-3 pt-2 border-t border-border/60 text-[11px] font-medium">
                <Link to="/about" className="text-primary hover:underline">
                  About BajiHears
                </Link>
                <span>&middot;</span>
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                <span>&middot;</span>
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </div>
            </div>
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
    <div className="rounded-2xl border border-border/80 bg-cream/70 p-3 shadow-2xs">
      <p className="font-sans text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
