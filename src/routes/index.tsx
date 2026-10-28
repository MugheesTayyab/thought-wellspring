import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchPostById } from "@/routes/api/wall";
import { queryKeys } from "@/client/lib/query-keys";
import { ArrowUp, Info, PencilLine, Sparkles, X } from "lucide-react";
import { UnsaidCard } from "@/client/components/bajihears/UnsaidCard";
import { FeedSkeleton } from "@/client/components/bajihears/FeedSkeleton";
import { WritingBox } from "@/client/components/bajihears/WritingBox";
import { CornerMenu } from "@/client/components/bajihears/CornerMenu";
import { Logo } from "@/client/components/bajihears/Logo";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { HeroIntro } from "@/client/components/bajihears/HeroIntro";

import { FeedWritingPrompt } from "@/client/components/bajihears/FeedWritingPrompt";
import { PushPermissionSheet } from "@/client/components/bajihears/PushPermissionSheet";
import { shouldShowPushPrompt } from "@/client/lib/notifications";
import { useWarmth } from "@/client/stores/warmth-context";
import { useAuth } from "@/client/stores/auth-context";
import { useWall } from "@/client/hooks/use-wall";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { useWinner } from "@/client/hooks/use-winner";
import { apiReportEcho, apiReportPost } from "@/routes/api/moderation";
import { triggerHaptic } from "@/client/lib/haptics";
import { cn, randomSeed } from "@/shared/utils";
import { CATEGORIES } from "@/shared/constants/categories";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";
import {
  appendMyPostCategory,
  readAvatarSeed,
  readHandle,
  readLastSubmit,
  readMyReports,
  readSavedThoughts,
  writeAvatarSeed,
  writeLastSubmit,
  writeMyReports,
  writeSavedThoughts,
} from "@/client/lib/local-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BajiHears | Say the unsaid" },
      {
        name: "description",
        content:
          "The Wall: anonymous Unsaids, one per cycle. Read what people never got to say, react, echo, and share the ones that hit.",
      },
      { property: "og:title", content: "BajiHears | Say the unsaid" },
      {
        property: "og:description",
        content:
          "Anonymous Unsaids, one per cycle. Read, react, echo, and share the ones that hit.",
      },
      { property: "og:url", content: "https://bajihears.app/" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/" }],
  }),
  component: Home,
});

function Home() {
  const { user, profile } = useAuth();
  const { deviceToken } = useDeviceToken();
  const { totalWarmth, awardWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const {
    posts,
    isLoading: isFeedLoading,
    isFetchingNextPage,
    isError: isFeedError,
    hasNextPage,
    sentinelRef,
    filters,
    toggleFilter,
    clearFilters,
    submitPost,
    isSubmitting,
    submitError,
    reactionError,
    onReact: onWallReact,
    onEcho: onWallEcho,
    myReactions,
    myEchoedIds,
    refetch,
  } = useWall();

  const {
    winner,
    hook: winnerHook,
    onReact: onWinnerReact,
    userReaction: winnerUserReaction,
    isFallback: winnerIsFallback,
    isLoading: winnerIsLoading,
  } = useWinner();

  const [myReports, setMyReports] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [handle, setHandle] = useState<string | null>(null);
  const [seed, setSeed] = useState("baji");
  const [lastSubmitAt, setLastSubmitAt] = useState<number | null>(null);
  const [savedThoughts, setSavedThoughts] = useState<Unsaid[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPushSheet, setShowPushSheet] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [sharedPostId, setSharedPostId] = useState("");
  useEffect(() => {
    const readTarget = () => {
      const id =
        new URLSearchParams(window.location.search).get("unsaid") ||
        window.location.hash.replace(/^#thought-/, "");
      setSharedPostId(/^[0-9a-f-]{36}$/i.test(id) ? id : "");
    };
    readTarget();
    window.addEventListener("hashchange", readTarget);
    return () => window.removeEventListener("hashchange", readTarget);
  }, []);
  const { data: sharedPost, isError: sharedPostError } = useQuery({
    queryKey: queryKeys.posts.detail(sharedPostId),
    enabled: Boolean(sharedPostId),
    queryFn: async () => {
      const result = await apiFetchPostById({ data: { id: sharedPostId } });
      if (!result.ok) throw new Error(result.error.message);
      return result.data.post;
    },
    retry: 1,
  });

  type FeedSortOption = "for-you" | "latest" | "most-loved";
  const [feedSort, setFeedSort] = useState<FeedSortOption>(() => {
    if (typeof window === "undefined") return "for-you";
    const saved = sessionStorage.getItem("bh:wall-sort");
    if (saved === "recent" || saved === "latest") return "latest";
    if (saved === "most-reacted" || saved === "most-loved") return "most-loved";
    if (saved === "for-you") return "for-you";
    return "for-you";
  });
  const [showTipsCard, setShowTipsCard] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bh:tips-dismissed") !== "1";
  });

  const backdrop = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMyReports(readMyReports());
      setSavedThoughts(readSavedThoughts());
      setLastSubmitAt(readLastSubmit());
      setHandle(readHandle());
      const existing = readAvatarSeed();
      if (existing) {
        setSeed(existing);
      } else {
        const next = randomSeed();
        writeAvatarSeed(next);
        setSeed(next);
      }
    }
  }, []);

  useEffect(() => {
    const savedScroll = Number(sessionStorage.getItem("bh:wall-scroll") ?? 0);
    if (savedScroll > 0) requestAnimationFrame(() => window.scrollTo({ top: savedScroll }));

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      sessionStorage.setItem("bh:wall-scroll", String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("bh:wall-sort", feedSort);
  }, [feedSort]);

  const scrollToTop = () => {
    triggerHaptic("selection");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReact = (id: string, key: ReactionKey) => {
    const already = (myReactions[id] ?? []).includes(key);
    onWallReact(id, key);
    if (!already) {
      awardWarmth("react", "Reacted to tea");
      const totalReactions = Object.values(myReactions).flat().length + 1;
      if (totalReactions >= 3 && shouldShowPushPrompt()) {
        window.setTimeout(() => setShowPushSheet(true), 1200);
      }
    }
  };

  const handleEcho = async (id: string, text: string, echoHandle: string | null) => {
    await onWallEcho(id, text, echoHandle);
    awardWarmth("echo", "Added an echo");
  };

  const showNotice = (message: string) => {
    setActionNotice(message);
    window.setTimeout(() => setActionNotice(null), 2600);
  };

  const handleShareTarget = async (unsaid: Unsaid) => {
    const url = `${window.location.origin}${window.location.pathname}#thought-${unsaid.id}`;
    const shareData = { title: "A thought from BajiHears", text: unsaid.text, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        awardWarmth("share", "Shared a thought");
        return;
      }
      await navigator.clipboard.writeText(url);
      showNotice("Link copied. Public links can be shared outside BajiHears.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        showNotice("Link copied. Public links can be shared outside BajiHears.");
      } catch {
        showNotice("Couldn't open sharing just now.");
      }
    }
  };

  const handleSave = (unsaid: Unsaid) => {
    const exists = savedThoughts.some((thought) => thought.id === unsaid.id);
    const next = exists
      ? savedThoughts.filter((thought) => thought.id !== unsaid.id)
      : [unsaid, ...savedThoughts];
    setSavedThoughts(next);
    writeSavedThoughts(next);
    showNotice(exists ? "Removed from saved thoughts." : "Saved on this device in Your Corner.");
  };

  const handleReport = async (id: string) => {
    if (myReports.includes(id)) return "You already reported this post.";
    if (!deviceToken) throw new Error("Your device identity is not ready. Try again.");
    const response = await apiReportPost({
      data: { postId: id, reason: "Community safety concern", deviceToken },
    });
    if (!response.ok) throw new Error(response.error.message);
    const next = [...myReports, id];
    setMyReports(next);
    writeMyReports(next);
    showNotice(response.data.message);
    setHiddenIds((prev) => [...prev, id]);
    return response.data.message;
  };

  const handleReportEcho = async (echoId: string) => {
    if (!deviceToken) throw new Error("Your device identity is not ready. Try again.");
    const response = await apiReportEcho({
      data: { echoId, reason: "Community safety concern", deviceToken },
    });
    if (!response.ok) throw new Error(response.error.message);
    return response.data.message;
  };

  const visiblePosts = useMemo(() => {
    const combined =
      sharedPost && !posts.some((post) => post.id === sharedPost.id)
        ? [sharedPost, ...posts]
        : posts;
    const unhidden = combined.filter((u) => !hiddenIds.includes(u.id));
    const now = Date.now();

    if (feedSort === "latest") {
      return [...unhidden].sort((a, b) => {
        const aPinned = a.pinnedUntil && a.pinnedUntil > now ? 1 : 0;
        const bPinned = b.pinnedUntil && b.pinnedUntil > now ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return b.createdAt - a.createdAt;
      });
    }

    if (feedSort === "most-loved") {
      return [...unhidden].sort((a, b) => {
        const aPinned = a.pinnedUntil && a.pinnedUntil > now ? 1 : 0;
        const bPinned = b.pinnedUntil && b.pinnedUntil > now ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        const aTotal =
          Object.values(a.reactions).reduce((sum, count) => sum + count, 0) + (a.echoes?.length ?? 0);
        const bTotal =
          Object.values(b.reactions).reduce((sum, count) => sum + count, 0) + (b.echoes?.length ?? 0);
        if (bTotal !== aTotal) return bTotal - aTotal;
        return b.createdAt - a.createdAt;
      });
    }

    // "for-you" algorithm: Freshness decay + genuine engagement + fair exposure for new posts
    return [...unhidden].sort((a, b) => {
      const aPinned = a.pinnedUntil && a.pinnedUntil > now ? 1 : 0;
      const bPinned = b.pinnedUntil && b.pinnedUntil > now ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const score = (post: Unsaid) => {
        const reactionsCount = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
        const echoesCount = post.echoes?.length ?? 0;
        const ageHours = Math.max(0, (now - post.createdAt) / (1000 * 60 * 60));
        // Echoes represent high emotional resonance; reactions are warm signals
        const engagement = reactionsCount * 1.0 + echoesCount * 2.0;
        // Freshness decay factor (half-life of gentle relevance)
        const freshness = 1 / Math.pow(ageHours + 2, 1.15);
        // Exploration boost for brand new posts (< 24h) to guarantee fair exposure
        const newPostBoost = ageHours < 12 ? 0.35 : ageHours < 24 ? 0.15 : 0;
        return (engagement + 1.2) * freshness + newPostBoost;
      };

      const scoreA = score(a);
      const scoreB = score(b);
      return scoreB - scoreA;
    });
  }, [posts, sharedPost, hiddenIds, feedSort]);

  useEffect(() => {
    if (!sharedPostId) return;
    const target = document.getElementById(`thought-${sharedPostId}`);
    if (target) target.scrollIntoView({ block: "center" });
  }, [visiblePosts.length, sharedPostId]);

  const openComposer = () => {
    setShowComposer(true);
    triggerHaptic("selection");
  };

  return (
    <main className="relative min-h-screen">
      <div ref={backdrop} className="wall-backdrop" aria-hidden />

      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:px-5">
        <header className="bg-background/92 border-b border-border sticky top-0 z-30 -mx-4 sm:-mx-5 flex items-center justify-between px-4 sm:px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <span className="font-display text-primary text-lg tracking-tight font-bold">
              BajiHears
            </span>
          </div>

          <CornerMenu seed={seed} />
        </header>

        <h1 className="sr-only">BajiHears: The Wall of Unsaids</h1>

        <div className="mt-3 space-y-4 sm:space-y-5">
          {/* 5-Second Comprehension Hero Banner */}
          <HeroIntro />


              {sharedPostId && (sharedPostError || sharedPost === null) && (
                <p
                  role="status"
                  className="rounded-xl border border-border p-3 text-sm text-muted-foreground"
                >
                  That shared thought is unavailable. It may have been removed or sent for review.
                </p>
              )}

              {/* Winner Card */}
              {winnerIsLoading && <FeedSkeleton count={1} />}
              {winner && !winnerIsFallback && (
                <UnsaidCard
                  unsaid={winner}
                  hero
                  isWinner
                  hook={winnerHook}
                  mine={winnerUserReaction ? [winnerUserReaction] : (myReactions[winner.id] ?? [])}
                  echoed={myEchoedIds.includes(winner.id)}
                  reported={myReports.includes(winner.id)}
                  saved={savedThoughts.some((thought) => thought.id === winner.id)}
                  myHandle={user ? profile?.handle ?? handle : null}
                  onReact={(_id, key) => onWinnerReact(key)}
                  onEcho={handleEcho}
                  onReport={handleReport}
                  onReportEcho={handleReportEcho}
                  onSave={handleSave}
                  onShare={handleShareTarget}
                />
              )}

          {/* Text/Input bar with overlapping Baji mascot cutout */}
          <div
            onClick={openComposer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openComposer();
              }
            }}
            className="group relative mt-5 cursor-pointer select-none transition-transform active:scale-[0.99]"
            aria-label="What's something you've been keeping to yourself?"
          >
            {/* Mascot overlapping upper border with clean cutout effect */}
            <div className="absolute -top-6 left-4 z-10 pointer-events-none sm:-top-7 sm:left-5 transition-transform duration-200 group-hover:scale-105">
              <img
                src="/assets/brand/baji-mascot.png"
                alt="Baji"
                className="h-11 sm:h-13 w-auto object-contain drop-shadow-[0_4px_12px_rgba(80,43,38,0.14)]"
                loading="eager"
                decoding="sync"
              />
            </div>

            <div className="flex min-h-13 sm:min-h-14 items-center justify-between gap-3 rounded-2xl border border-border-card bg-card px-4 py-3 pl-19 sm:pl-22 shadow-xs transition-colors group-hover:border-primary/50 group-hover:bg-accent/15">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors truncate">
                What's something you've been keeping to yourself?
              </span>
              <span className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-2xs group-hover:bg-primary/90 transition-all">
                Write
              </span>
            </div>
          </div>

          {/* Streamlined sort and category controls */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center justify-center gap-0.5 sm:gap-1 rounded-2xl border border-border/80 bg-secondary/80 p-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("for-you");
                  }}
                  className={cn(
                    "flex min-h-8 items-center rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    feedSort === "for-you"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>For You</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("latest");
                  }}
                  className={cn(
                    "flex min-h-8 items-center rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    feedSort === "latest"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Latest</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("most-loved");
                  }}
                  className={cn(
                    "flex min-h-8 items-center rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    feedSort === "most-loved"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Most Loved</span>
                </button>
              </div>

              {filters.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-primary hover:underline shrink-0 text-xs font-semibold cursor-pointer"
                >
                  Clear filter ({filters.length})
                </button>
              )}
            </div>

            <div
              className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1.5 sm:-mx-5 sm:px-5 touch-pan-x"
              aria-label="Filter the Wall by category"
            >
              <button
                type="button"
                aria-pressed={filters.length === 0}
                onClick={clearFilters}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer",
                  filters.length === 0
                    ? "border-primary/80 bg-accent text-primary font-bold shadow-2xs"
                    : "border-border-card bg-card text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
              >
                All thoughts
              </button>
              {CATEGORIES.map((c) => {
                const on = filters.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      triggerHaptic("selection");
                      toggleFilter(c);
                    }}
                    className={cn(
                      "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer",
                      on
                        ? "border-primary/80 bg-accent text-primary font-bold shadow-2xs"
                        : "border-border-card bg-card text-muted-foreground hover:text-foreground hover:border-primary/30",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {showComposer && (
            <div id="wall-composer">
              <WritingBox
                lastSubmitAt={lastSubmitAt}
                myHandle={user ? profile?.handle ?? handle : null}
                isSubmitting={isSubmitting}
                submitError={submitError}
                onClose={() => setShowComposer(false)}
                onSeePost={(id) => {
                  setShowComposer(false);
                  void refetch().then(() => {
                    window.setTimeout(
                      () =>
                        document
                          .getElementById(`thought-${id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                      100,
                    );
                  });
                }}
                onSubmit={async ({ text, handle: postHandle, category, preset }) => {
                  const result = await submitPost({
                    text,
                    handle: postHandle,
                    category,
                    preset,
                    profileId: user?.id ?? null,
                  });
                  const ts = Date.now();
                  writeLastSubmit(ts);
                  setLastSubmitAt(ts);
                  awardWarmth("post", "Shared a thought");
                  appendMyPostCategory(category);
                  if (shouldShowPushPrompt()) {
                    window.setTimeout(() => setShowPushSheet(true), 1500);
                  }
                  return result;
                }}
              />
            </div>
          )}

          {reactionError && (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              That reaction didn&apos;t save. Your previous choice was restored. Try again?
            </p>
          )}

          <div className="min-h-[320px] space-y-4">
          {/* Initial Loading State */}
          {isFeedLoading && visiblePosts.length === 0 && <FeedSkeleton count={3} />}

          {/* Error State */}
          {isFeedError && visiblePosts.length === 0 && (
            <div className="bg-card border-border-card rounded-3xl border p-6 text-center font-sans shadow-soft">
              <p className="font-serif text-xl text-foreground">
                Couldn&apos;t load the Wall just now.
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Your place is still here. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="bg-primary text-white mt-4 rounded-2xl min-h-11 px-5 text-sm font-semibold cursor-pointer active:scale-[0.98]"
              >
                Try again
              </button>
            </div>
          )}

          {/* Honest empty state */}
          {!isFeedLoading && !isFeedError && visiblePosts.length === 0 && (
            <div className="paper-card space-y-4 p-7 text-center">
              <p className="font-serif text-2xl font-normal text-foreground">
                A little quiet here.
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                {filters.length > 0
                  ? "No thoughts in this corner yet. Want to look around somewhere else?"
                  : "No thoughts have reached the Wall yet. You can check back, or leave one when you feel like it."}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {filters.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-white active:scale-[0.98]"
                  >
                    See all thoughts
                  </button>
                )}
                <button
                  type="button"
                  onClick={openComposer}
                  className="min-h-11 rounded-2xl border border-border-card bg-card px-5 text-sm font-semibold text-foreground active:scale-[0.98]"
                >
                  Write something
                </button>
              </div>
            </div>
          )}

          {/* Feed List with Interspersed Elements */}
          {visiblePosts.map((u, index) => (
            <Fragment key={u.id}>
              <UnsaidCard
                unsaid={u}
                mine={myReactions[u.id] ?? []}
                echoed={myEchoedIds.includes(u.id)}
                reported={myReports.includes(u.id)}
                saved={savedThoughts.some((thought) => thought.id === u.id)}
                myHandle={user ? profile?.handle ?? handle : null}
                onReact={handleReact}
                onEcho={handleEcho}
                onReport={handleReport}
                onReportEcho={handleReportEcho}
                onSave={handleSave}
                onShare={handleShareTarget}
              />
              {showTipsCard && index === 2 && (
                <aside className="relative rounded-3xl border border-[#E3B8B1]/70 bg-[#FFF8F5] p-4.5 sm:p-5 text-sm text-[#7D3028] shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Info className="size-4 text-primary shrink-0" aria-hidden />
                      <h3 className="font-serif text-sm font-bold text-foreground">
                        A few things worth knowing
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTipsCard(false);
                        try {
                          localStorage.setItem("bh:tips-dismissed", "1");
                        } catch {
                          /* Still works without localStorage */
                        }
                      }}
                      aria-label="Dismiss helpful tips"
                      className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-[#E3B8B1]/30 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">&bull;</span>
                      <span>Wall posts can be read by other visitors anonymously.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">&bull;</span>
                      <span>You choose whether your handle appears when you post.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">&bull;</span>
                      <span>You can report a post anytime from its options menu.</span>
                    </li>
                  </ul>
                </aside>
              )}
              {index === 4 && <FeedWritingPrompt onWriteClick={openComposer} />}
            </Fragment>
          ))}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-10 w-full" />

          {/* Loading next page indicator */}
          {isFetchingNextPage && <FeedSkeleton count={1} />}

              {/* End of Wall */}
              {!hasNextPage && visiblePosts.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground/80 text-xs font-semibold font-vibe tracking-wide">
                    You&apos;re caught up for now. Come back whenever you feel like it.
                  </p>
                </div>
              )}
          </div>

          {/* Shared Site Footer */}
          <footer className="mt-8 pt-4 pb-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground font-medium border-t border-border/40">
            <Link to="/about" className="hover:text-foreground transition">
              About
            </Link>
            <span>&middot;</span>
            <Link to="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-foreground transition">
              Terms of Service
            </Link>
          </footer>
        </div>
      </div>

      <PushPermissionSheet isOpen={showPushSheet} onClose={() => setShowPushSheet(false)} />

      {actionNotice && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-foreground shadow-lg"
        >
          {actionNotice}
        </div>
      )}

      {/* Floating Write Button - anchored to bottom-right for natural thumb reach, never blocking reading center */}
      <button
        type="button"
        onClick={openComposer}
        aria-label="Write a thought"
        className="spring-press fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-30 flex min-h-11 items-center gap-2 rounded-full bg-primary/95 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(80,43,38,.5)] backdrop-blur-md transition-all duration-200 active:scale-95 hover:bg-primary cursor-pointer"
      >
        <PencilLine className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Write a thought</span>
        <span className="inline sm:hidden">Write</span>
      </button>

      {/* Floating Back to Top Button - stacked neatly above the Write button without conflict */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="spring-press fixed bottom-[calc(8.0rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-30 flex size-10 items-center justify-center rounded-full border border-border bg-card/95 backdrop-blur-md text-muted-foreground shadow-sm transition-all hover:text-primary active:scale-95 cursor-pointer"
        >
          <ArrowUp className="size-4" />
        </button>
      )}

      {/* Shared bottom navigation */}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </main>
  );
}
