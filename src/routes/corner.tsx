import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Dices,
  CheckCircle2,
  Award,
  Heart,
  Flame,
  MessageCircle,
  Settings2,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
  Smile,
  RefreshCw,
} from "lucide-react";
import { CornerAvatar } from "@/client/components/bajihears/CornerAvatar";
import { PublicProfileModal } from "@/client/components/bajihears/PublicProfileModal";
import { randomSeed, stripHandle, cn, relativeTime } from "@/shared/utils";
import { STREAK_MILESTONES } from "@/shared/constants/identity";
import { useAuth } from "@/client/stores/auth-context";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { apiFetchUserActivity } from "@/routes/api/wall";
import { triggerHaptic } from "@/client/lib/haptics";
import type { Category, Unsaid } from "@/shared/types/unsaid";
import {
  readAvatarSeed,
  readHandle,
  writeAvatarSeed,
  writeHandle,
} from "@/client/lib/local-storage";

export const Route = createFileRoute("/corner")({
  head: () => ({
    meta: [
      { title: "Your Corner | BajiHears" },
      {
        name: "description",
        content:
          "Your personal haven on BajiHears: view your posted thoughts, reactions received, liked whispers, and manage your profile.",
      },
      { property: "og:title", content: "Your Corner | BajiHears" },
      {
        property: "og:description",
        content: "View your posted thoughts, reactions received, and liked whispers on BajiHears.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CornerPage,
});

type TabType = "whispers" | "liked" | "settings";

interface UserActivityPost {
  id: string;
  text: string;
  category: Category;
  preset: string;
  handle: string | null;
  status: string;
  createdAt: number;
  reactions: { heart: number; sad: number; fire: number; hug: number };
  totalLikes: number;
  echoCount: number;
  echoes: Array<{
    id: string;
    text: string;
    handle: string | null;
    createdAt: number;
  }>;
}

interface UserActivityData {
  posts: UserActivityPost[];
  totalLikesReceived: number;
  totalPosts: number;
  likedPosts: Unsaid[];
}

function CornerPage() {
  const { user, profile, signInWithGoogle, signOut, isLoading: isAuthLoading } = useAuth();
  const { deviceToken } = useDeviceToken();

  const [activeTab, setActiveTab] = useState<TabType>("whispers");
  const [seed, setSeed] = useState("baji");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [notify, setNotify] = useState(true);
  const [saved, setSaved] = useState(false);

  // Activity state
  const [activity, setActivity] = useState<UserActivityData | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [selectedProfileModal, setSelectedProfileModal] = useState<string | null>(null);
  const [expandedEchoesPostId, setExpandedEchoesPostId] = useState<string | null>(null);

  useEffect(() => {
    setSeed(readAvatarSeed() ?? "baji");
    setHandle(readHandle() ?? "");
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  // Load user's activity (their thoughts, reactions received, who echoed, and liked posts)
  const loadActivity = () => {
    if (!deviceToken) return;
    setIsLoadingActivity(true);
    apiFetchUserActivity({
      data: {
        profileId: user?.id ?? null,
        deviceToken,
      },
    })
      .then((res) => {
        if (res.ok && res.data) {
          setActivity(res.data);
        }
      })
      .catch((err) => {
        console.error("[Corner] Failed to load activity:", err);
      })
      .finally(() => {
        setIsLoadingActivity(false);
      });
  };

  useEffect(() => {
    loadActivity();
  }, [user?.id, deviceToken]);

  const reroll = () => {
    triggerHaptic("selection");
    const next = randomSeed();
    setSeed(next);
    writeAvatarSeed(next);
  };

  const save = () => {
    triggerHaptic("selection");
    const clean = stripHandle(handle);
    setHandle(clean);
    writeHandle(clean || null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const myPostsCount = activity?.posts.length ?? 0;
  const likedPostsCount = activity?.likedPosts.length ?? 0;
  const totalLikes = activity?.totalLikesReceived ?? 0;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-32 pt-5">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          onClick={() => triggerHaptic("selection")}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span>The Wall</span>
        </Link>

        {handle && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setSelectedProfileModal(user?.id ?? handle);
            }}
            className="text-xs font-semibold text-[#E8552E] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Public View</span>
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>

      {/* Header Profile Identity Banner */}
      <div className="mt-5 flex items-center gap-4 bg-gradient-to-b from-[#1f1612] to-[#17110D] border border-white/[0.08] p-4 rounded-3xl shadow-lg">
        <div className="relative">
          <CornerAvatar seed={seed} size={58} />
          {user && (
            <span
              className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-[#17110D]"
              title="Google Account Connected"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display truncate text-xl font-bold text-[#F5EFE9]">
              {handle ? `@${stripHandle(handle)}` : user?.email ? user.email.split("@")[0] : "Your Corner"}
            </h1>
            {user && (
              <CheckCircle2
                className="size-4 text-emerald-400 shrink-0"
                title="Verified Account"
              />
            )}
          </div>
          <p className="text-[#9C8F87] text-xs font-sans mt-0.5">
            {user ? "Cloud linked and synchronized" : "Local guest: sign in to sync across devices"}
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-sans">
        <div className="bg-[#17110D] border border-white/[0.06] rounded-2xl p-2.5">
          <p className="text-[11px] text-[#9C8F87]">Whispers</p>
          <p className="text-base font-bold text-[#F5EFE9] font-mono mt-0.5">{myPostsCount}</p>
        </div>
        <div className="bg-[#17110D] border border-white/[0.06] rounded-2xl p-2.5">
          <p className="text-[11px] text-[#9C8F87]">Reactions</p>
          <p className="text-base font-bold text-[#E8552E] font-mono mt-0.5">❤️ {totalLikes}</p>
        </div>
        <div className="bg-[#17110D] border border-white/[0.06] rounded-2xl p-2.5">
          <p className="text-[11px] text-[#9C8F87]">Liked Tea</p>
          <p className="text-base font-bold text-[#F5EFE9] font-mono mt-0.5">{likedPostsCount}</p>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08] font-sans">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setActiveTab("whispers");
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "whispers"
              ? "bg-[#E8552E] text-white shadow-sm"
              : "text-[#9C8F87] hover:text-[#F5EFE9]",
          )}
        >
          <MessageCircle className="size-3.5" />
          <span>My Whispers</span>
          {myPostsCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeTab === "whispers" ? "bg-black/20 text-white" : "bg-white/10 text-[#9C8F87]",
              )}
            >
              {myPostsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setActiveTab("liked");
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "liked"
              ? "bg-[#E8552E] text-white shadow-sm"
              : "text-[#9C8F87] hover:text-[#F5EFE9]",
          )}
        >
          <Heart className="size-3.5" />
          <span>Liked Tea</span>
          {likedPostsCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeTab === "liked" ? "bg-black/20 text-white" : "bg-white/10 text-[#9C8F87]",
              )}
            >
              {likedPostsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setActiveTab("settings");
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "settings"
              ? "bg-[#E8552E] text-white shadow-sm"
              : "text-[#9C8F87] hover:text-[#F5EFE9]",
          )}
        >
          <Settings2 className="size-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* TAB 1: MY WHISPERS & REACTIONS BREAKDOWN */}
      {activeTab === "whispers" && (
        <section className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F5EFE9] flex items-center gap-1.5">
              <span>Your Posted Thoughts</span>
              <span className="text-xs text-[#9C8F87] font-normal">({myPostsCount})</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                loadActivity();
              }}
              title="Refresh your activity"
              className="text-[#9C8F87] hover:text-[#F5EFE9] transition-colors p-1"
            >
              <RefreshCw className={cn("size-3.5", isLoadingActivity && "animate-spin")} />
            </button>
          </div>

          {isLoadingActivity && !activity ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          ) : myPostsCount === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#17110D] p-6 text-center">
              <p className="text-2xl mb-2">☕</p>
              <h3 className="font-display text-base font-bold text-[#F5EFE9]">No whispers yet</h3>
              <p className="text-xs text-[#9C8F87] mt-1 max-w-xs mx-auto">
                Spill something you could never say out loud. When people react or echo, their responses appear right here.
              </p>
              <Link
                to="/"
                onClick={() => triggerHaptic("selection")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E8552E] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#fa541c] active:scale-95"
              >
                Go to The Wall
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activity?.posts.map((post) => {
                const rx = post.reactions;
                const isEchoesOpen = expandedEchoesPostId === post.id;
                return (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#17110D] p-4.5 sm:p-5 shadow-sm transition-all"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between text-xs text-[#9C8F87] mb-2 font-sans">
                      <span className="font-semibold text-[#E8552E] bg-[#E8552E]/10 px-2 py-0.5 rounded-full text-[11px]">
                        {post.category}
                      </span>
                      <span className="text-[11px]">{relativeTime(post.createdAt)}</span>
                    </div>

                    {/* Whisper Quote */}
                    <p className="font-quote text-base sm:text-lg text-[#F5EFE9] leading-relaxed">
                      "{post.text}"
                    </p>

                    {/* Reactions Breakdown Grid */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F5EFE9]"
                          title="Hearts received"
                        >
                          <span>❤️</span>
                          <span className="font-mono font-medium">{rx.heart || 0}</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F5EFE9]"
                          title="Fire reactions"
                        >
                          <span>🔥</span>
                          <span className="font-mono font-medium">{rx.fire || 0}</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F5EFE9]"
                          title="Hugs sent"
                        >
                          <span>🫂</span>
                          <span className="font-mono font-medium">{rx.hug || 0}</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F5EFE9]"
                          title="Soft tears"
                        >
                          <span>🥺</span>
                          <span className="font-mono font-medium">{rx.sad || 0}</span>
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-[#9C8F87] font-semibold">
                        {post.totalLikes} {post.totalLikes === 1 ? "reaction" : "reactions"}
                      </span>
                    </div>

                    {/* Community Echoes / Interaction Thread */}
                    {post.echoes && post.echoes.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setExpandedEchoesPostId(isEchoesOpen ? null : post.id);
                          }}
                          className="w-full flex items-center justify-between text-xs font-semibold text-[#E8552E] hover:underline cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="size-3.5" />
                            <span>
                              {post.echoes.length} {post.echoes.length === 1 ? "echo from community" : "echoes from community"}
                            </span>
                          </span>
                          <span className="text-[10px] text-[#9C8F87]">
                            {isEchoesOpen ? "Hide" : "View"}
                          </span>
                        </button>

                        {isEchoesOpen && (
                          <div className="mt-2.5 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                            {post.echoes.map((echo) => (
                              <div
                                key={echo.id}
                                className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-xs font-sans"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  {echo.handle ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerHaptic("selection");
                                        setSelectedProfileModal(echo.handle);
                                      }}
                                      className="font-medium text-[#E8552E] hover:underline cursor-pointer"
                                    >
                                      @{stripHandle(echo.handle)}
                                    </button>
                                  ) : (
                                    <span className="text-[#9C8F87]">anonymous</span>
                                  )}
                                  <span className="text-[10px] text-[#9C8F87]">
                                    {relativeTime(echo.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[#F5EFE9]/90 italic">"{echo.text}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2.5 text-[11px] text-[#9C8F87] italic font-sans">
                        No echoes yet. Your tea is steeping on the wall.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: LIKED WHISPERS */}
      {activeTab === "liked" && (
        <section className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F5EFE9] flex items-center gap-1.5">
              <span>Whispers You Liked</span>
              <span className="text-xs text-[#9C8F87] font-normal">({likedPostsCount})</span>
            </h2>
          </div>

          {likedPostsCount === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#17110D] p-6 text-center">
              <p className="text-2xl mb-2">❤️</p>
              <h3 className="font-display text-base font-bold text-[#F5EFE9]">No liked tea yet</h3>
              <p className="text-xs text-[#9C8F87] mt-1 max-w-xs mx-auto">
                Double-tap or react to any whispers on the wall. The ones that resonate will be saved here for you.
              </p>
              <Link
                to="/"
                onClick={() => triggerHaptic("selection")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E8552E] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#fa541c] active:scale-95"
              >
                Browse The Wall
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activity?.likedPosts.map((post) => {
                const total =
                  (post.reactions.heart || 0) +
                  (post.reactions.fire || 0) +
                  (post.reactions.hug || 0) +
                  (post.reactions.sad || 0);

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#17110D] p-4 text-xs font-sans shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[#9C8F87] mb-1.5">
                      <span className="font-medium text-[#E8552E]">{post.category}</span>
                      {post.handle ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setSelectedProfileModal(post.profileId || post.handle);
                          }}
                          className="hover:text-[#F5EFE9] transition-colors cursor-pointer"
                        >
                          @{stripHandle(post.handle)}
                        </button>
                      ) : (
                        <span>anonymous</span>
                      )}
                    </div>
                    <p className="font-quote text-base text-[#F5EFE9] leading-relaxed my-2">
                      "{post.text}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#9C8F87] pt-2 border-t border-white/[0.05]">
                      <span>{relativeTime(post.createdAt)}</span>
                      <span className="font-mono text-[#E8552E]">❤️ {total} reactions</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SETTINGS & PERKS */}
      {activeTab === "settings" && (
        <section className="mt-5 space-y-4">
          {/* Public Profile View Preview Button */}
          {handle && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setSelectedProfileModal(user?.id ?? handle);
              }}
              className="flex w-full items-center justify-between p-3.5 rounded-2xl border border-[#E8552E]/30 bg-[#E8552E]/10 text-xs font-semibold text-[#F5EFE9] hover:bg-[#E8552E]/15 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#E8552E]" />
                <span>Preview how others see your Public Profile</span>
              </div>
              <ExternalLink className="size-3.5 text-[#E8552E]" />
            </button>
          )}

          {/* Account Backup Section */}
          <div className="border border-white/[0.08] bg-[#17110D] rounded-2xl p-4 font-sans">
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
                disabled={isAuthLoading}
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
          </div>

          {/* Daily Streak & Perks */}
          <div className="border border-white/[0.08] bg-[#17110D] rounded-2xl p-4 font-sans">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-[#F5EFE9] flex items-center gap-1.5">
                  <Award className="size-4 text-[#E8552E]" />
                  <span>Daily Streaks & Rewards</span>
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">Post tea consistently to unlock exclusive perks.</p>
              </div>
              <span className="text-xs font-mono font-bold text-[#E8552E] bg-[#E8552E]/10 px-2 py-0.5 rounded-full">Perks</span>
            </div>

            <div className="mt-3 space-y-2">
              {STREAK_MILESTONES.map((m) => (
                <div
                  key={m.days}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border text-xs gap-2",
                    m.days === 10
                      ? "border-[#E8552E]/40 bg-[#E8552E]/10 text-foreground font-medium"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  <span className="font-semibold text-foreground shrink-0">{m.days} Days</span>
                  <span className="text-right text-[11px] text-[#9C8F87]">{m.reward}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avatar Customization */}
          <div className="border border-white/[0.08] bg-[#17110D] flex items-center gap-4 rounded-2xl p-4 font-sans">
            <CornerAvatar seed={seed} size={56} />
            <div>
              <p className="text-sm font-semibold text-[#F5EFE9]">Your anonymous avatar</p>
              <button
                type="button"
                onClick={reroll}
                className="text-[#E8552E] mt-1 inline-flex items-center gap-2 text-xs font-semibold cursor-pointer hover:underline"
              >
                <Dices className="size-3.5" aria-hidden />
                Roll a new one
              </button>
            </div>
          </div>

          {/* Form Settings */}
          <div className="border border-white/[0.08] bg-[#17110D] space-y-4 rounded-2xl p-4 font-sans">
            <label className="block">
              <span className="text-xs font-semibold text-[#F5EFE9]">Your handle</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourname"
                className="border-white/10 bg-white/[0.03] text-[#F5EFE9] mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#E8552E]"
              />
              <span className="text-muted-foreground mt-1 block text-[11px]">
                Only shown when you choose to post with your handle instead of anonymous.
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#F5EFE9]">Email (Optional)</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="so we can notify you if you win"
                className="border-white/10 bg-white/[0.03] text-[#F5EFE9] mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#E8552E]"
              />
            </label>

            <button
              type="button"
              onClick={() => setNotify((v) => !v)}
              className="border-white/10 bg-white/[0.03] flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold text-[#F5EFE9] cursor-pointer"
            >
              <span>Tell me when my Unsaid is picked as Winner</span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition-colors ${notify ? "bg-[#E8552E]" : "bg-white/20"}`}
              >
                <span
                  className={`bg-white block size-4 rounded-full transition-transform ${notify ? "translate-x-4" : ""}`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={save}
              className="bg-[#E8552E] text-white w-full rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer transition hover:bg-[#fa541c] active:scale-95"
            >
              {saved ? "Saved." : "Save my Corner"}
            </button>
          </div>

          <button
            type="button"
            className="text-muted-foreground mt-4 w-full text-xs underline cursor-pointer hover:text-foreground text-center"
            onClick={() => {
              writeHandle(null);
              setHandle("");
              setEmail("");
            }}
          >
            Clear Corner details
          </button>
        </section>
      )}

      {/* Public Profile Modal Inspector (opens when clicking any handle or own preview) */}
      <PublicProfileModal
        identifier={selectedProfileModal}
        isOpen={Boolean(selectedProfileModal)}
        onClose={() => setSelectedProfileModal(null)}
      />
    </main>
  );
}
