import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Info, PencilLine } from "lucide-react";
import { UnsaidCard } from "@/client/components/bajihears/UnsaidCard";
import { FeedSkeleton } from "@/client/components/bajihears/FeedSkeleton";
import { WritingBox } from "@/client/components/bajihears/WritingBox";
import { CornerMenu } from "@/client/components/bajihears/CornerMenu";
import { Logo } from "@/client/components/bajihears/Logo";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { HeroIntro } from "@/client/components/bajihears/HeroIntro";
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
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
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
  const [feedSort, setFeedSort] = useState<"most-reacted" | "recent">(() => {
    if (typeof window === "undefined") return "most-reacted";
    return sessionStorage.getItem("bh:wall-sort") === "recent" ? "recent" : "most-reacted";
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
    const unhidden = posts.filter((u) => !hiddenIds.includes(u.id));
    if (feedSort === "most-reacted") {
      return [...unhidden].sort((a, b) => {
        const aTotal = Object.values(a.reactions).reduce((sum, count) => sum + count, 0);
        const bTotal = Object.values(b.reactions).reduce((sum, count) => sum + count, 0);
        return bTotal - aTotal;
      });
    }
    return [...unhidden].sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, hiddenIds, feedSort]);

  useEffect(() => {
    if (!window.location.hash.startsWith("#thought-")) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView({ block: "center" });
  }, [visiblePosts.length]);

  const openComposer = () => {
    setShowComposer(true);
    triggerHaptic("selection");
  };

  return (
    <div className="relative min-h-screen">
      <div ref={backdrop} className="wall-backdrop" aria-hidden />

      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:px-5">
        <header className="bg-background/92 border-b border-border sticky top-0 z-30 -mx-4 sm:-mx-5 flex items-center justify-between px-4 sm:px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <span className="font-display text-primary text-lg tracking-tight font-bold">
              BajiHears
            </span>
            <span className="listening-mark" aria-hidden />
          </div>

          <CornerMenu seed={seed} />
        </header>

        <h1 className="sr-only">BajiHears: The Wall of Unsaids</h1>

        <div className="mt-3 space-y-4 sm:space-y-5">
          {/* 5-Second Comprehension Hero Banner */}
          <HeroIntro />

          {/* Winner Card */}
          {winner && (
            <UnsaidCard
              unsaid={winner}
              hero
              isWinner
              hook={winnerHook}
              mine={winnerUserReaction ? [winnerUserReaction] : (myReactions[winner.id] ?? [])}
              echoed={myEchoedIds.includes(winner.id)}
              reported={myReports.includes(winner.id)}
              saved={savedThoughts.some((thought) => thought.id === winner.id)}
              myHandle={handle}
              onReact={(_id, key) => onWinnerReact(key)}
              onEcho={handleEcho}
              onReport={handleReport}
              onReportEcho={handleReportEcho}
              onSave={handleSave}
              onShare={handleShareTarget}
            />
          )}

          <section aria-labelledby="wall-heading" className="pt-2">
            <h2
              id="wall-heading"
              className="text-[28px] font-semibold tracking-tight text-foreground"
            >
              The Wall
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Different lives. Familiar thoughts.
            </p>
          </section>

          <button
            type="button"
            onClick={openComposer}
            className="paper-card flex min-h-16 w-full items-center gap-3 px-4 text-left transition-colors hover:border-primary/35"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <PencilLine className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Got something on your mind?
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Start a private draft. Share only if you want to.
              </span>
            </span>
          </button>

          {/* Honest sort and category controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Browse</span>
              <div className="flex items-center justify-center gap-1 rounded-2xl border border-border bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("most-reacted");
                  }}
                  className={cn(
                    "flex min-h-9 items-center rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer",
                    feedSort === "most-reacted"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Most reacted</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("recent");
                  }}
                  className={cn(
                    "flex min-h-9 items-center rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer",
                    feedSort === "recent"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Recent</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-3 px-1 mb-2 font-vibe">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide">
                Find a familiar thought
              </span>
              {filters.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-primary hover:underline shrink-0 text-xs font-medium cursor-pointer"
                >
                  Clear all ({filters.length})
                </button>
              )}
            </div>
            <div
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5"
              aria-label="Filter the Wall by category"
            >
              <button
                type="button"
                aria-pressed={filters.length === 0}
                onClick={clearFilters}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
                  filters.length === 0
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                All
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
                      "min-h-10 shrink-0 rounded-full border px-4 text-xs font-medium transition-all active:scale-[.97] cursor-pointer",
                      on
                        ? "border-primary bg-accent text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
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
                myHandle={handle}
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

          {/* Initial Loading State */}
          {isFeedLoading && visiblePosts.length === 0 && <FeedSkeleton count={3} />}

          {/* Error State */}
          {isFeedError && visiblePosts.length === 0 && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center font-vibe">
              <p className="font-display text-lg">Couldn&apos;t load the Wall just now.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Your place is still here. Try the connection again.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="bg-brand-gradient text-primary-foreground mt-4 rounded-2xl px-5 py-2.5 text-sm font-semibold cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {/* Honest empty state */}
          {!isFeedLoading && !isFeedError && visiblePosts.length === 0 && (
            <div className="paper-card space-y-4 p-6 text-center">
              <p className="font-display text-xl font-bold text-foreground">A little quiet here.</p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                {filters.length > 0
                  ? "No thoughts in this corner yet. Want to look around somewhere else?"
                  : "No thoughts have reached the Wall yet. You can check back, or leave one when you feel like it."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {filters.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
                  >
                    See all thoughts
                  </button>
                )}
                <button
                  type="button"
                  onClick={openComposer}
                  className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
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
                myHandle={handle}
                onReact={handleReact}
                onEcho={handleEcho}
                onReport={handleReport}
                onReportEcho={handleReportEcho}
                onSave={handleSave}
                onShare={handleShareTarget}
              />
              {index === 1 && (
                <aside className="rounded-3xl border border-[#D8CCEA] bg-[#EEE8FA] p-5 text-sm text-[#51436A]">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Info className="size-4 text-primary" aria-hidden />
                    <h3>A few things worth knowing</h3>
                  </div>
                  <ul className="mt-3 space-y-2 leading-5">
                    <li>Wall posts can be read by other visitors.</li>
                    <li>You choose whether your handle appears when you post.</li>
                    <li>You can report a post from its options menu.</li>
                  </ul>
                </aside>
              )}
            </Fragment>
          ))}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-10 w-full" />

          {/* Loading next page indicator */}
          {isFetchingNextPage && <FeedSkeleton count={1} />}

          {/* End of Wall */}
          {!hasNextPage && visiblePosts.length > 0 && (
            <p className="text-muted-foreground/80 py-6 text-center text-xs font-semibold font-vibe tracking-wide">
              You&apos;re caught up for now. Come back whenever you feel like it.
            </p>
          )}
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

      <button
        type="button"
        onClick={openComposer}
        aria-controls="wall-composer"
        className="spring-press fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(80,43,38,.55)]"
      >
        <PencilLine className="size-4" aria-hidden />
        Write a thought
      </button>

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="spring-press fixed bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] right-5 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:text-primary cursor-pointer"
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
    </div>
  );
}
