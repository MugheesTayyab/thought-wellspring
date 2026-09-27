import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { UnsaidCard } from "@/client/components/bajihears/UnsaidCard";
import { sortPostsByPsychologicalIntrigue } from "@/shared/lib/psychological-ranking";
import { FeedSkeleton } from "@/client/components/bajihears/FeedSkeleton";
import { WritingBox } from "@/client/components/bajihears/WritingBox";
import { QuoteCardDialog } from "@/client/components/bajihears/QuoteCardDialog";
import { CornerMenu } from "@/client/components/bajihears/CornerMenu";
import { Logo } from "@/client/components/bajihears/Logo";
import { WarmthOrb } from "@/client/components/bajihears/WarmthOrb";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { CommunityRegulars } from "@/client/components/bajihears/CommunityRegulars";
import { FeedWritingPrompt } from "@/client/components/bajihears/FeedWritingPrompt";
import { HeroIntro } from "@/client/components/bajihears/HeroIntro";
import { NightPresence } from "@/client/components/bajihears/NightPresence";
import { BajiIntroSplash } from "@/client/components/bajihears/BajiIntroSplash";
import { ScrollMascot } from "@/client/components/bajihears/ScrollMascot";
import { PushPermissionSheet } from "@/client/components/bajihears/PushPermissionSheet";
import { shouldShowPushPrompt } from "@/client/lib/notifications";
import { useWarmth } from "@/client/stores/warmth-context";
import { useAuth } from "@/client/stores/auth-context";
import { useWall } from "@/client/hooks/use-wall";
import { useWinner } from "@/client/hooks/use-winner";
import { triggerHaptic } from "@/client/lib/haptics";
import { cn, randomSeed } from "@/shared/utils";
import { CATEGORIES } from "@/shared/constants/categories";
import { REPORT_THRESHOLD } from "@/shared/constants/cycle";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";
import {
  appendMyPostCategory,
  clearLastSubmit,
  readAvatarSeed,
  readHandle,
  readLastSubmit,
  readMyReports,
  writeAvatarSeed,
  writeLastSubmit,
  writeMyReports,
} from "@/client/lib/local-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BajiHears — say the unsaid" },
      {
        name: "description",
        content:
          "The Wall: anonymous Unsaids, one per cycle. Read what people never got to say, react, echo, and share the ones that hit.",
      },
      { property: "og:title", content: "BajiHears — say the unsaid" },
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
  const [shareTarget, setShareTarget] = useState<Unsaid | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPushSheet, setShowPushSheet] = useState(false);
  const backdrop = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMyReports(readMyReports());
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
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleShareTarget = (unsaid: Unsaid) => {
    setShareTarget(unsaid);
    awardWarmth("share", "Shared Unsaid card");
  };

  const handleReport = (id: string) => {
    if (myReports.includes(id)) return;
    const next = [...myReports, id];
    setMyReports(next);
    writeMyReports(next);
    if (next.filter((r) => r === id).length >= REPORT_THRESHOLD) {
      setHiddenIds((prev) => [...prev, id]);
    }
  };

  const [feedSort, setFeedSort] = useState<"spicy" | "latest">("spicy");

  const visiblePosts = useMemo(() => {
    const unhidden = posts.filter((u) => !hiddenIds.includes(u.id));
    if (feedSort === "spicy") {
      return sortPostsByPsychologicalIntrigue(unhidden);
    }
    return unhidden;
  }, [posts, hiddenIds, feedSort]);

  return (
    <div className="relative min-h-screen">
      <div ref={backdrop} className="wall-backdrop" aria-hidden />

      <div className="mx-auto w-full max-w-md px-4 sm:px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
        <header className="bg-background/85 border-b border-white/8 sticky top-0 z-30 -mx-4 sm:-mx-5 flex items-center justify-between px-4 sm:px-5 py-3 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <span className="font-display text-brand-gradient text-lg tracking-tight font-bold">
              BajiHears
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <WarmthOrb
              totalWarmth={totalWarmth}
              isFlashing={isFlashingOrb}
              mini
              onClick={openWarmthSheet}
            />
            <CornerMenu seed={seed} />
          </div>
        </header>

        <h1 className="sr-only">BajiHears — The Wall of Unsaids</h1>

        <div className="wall-3d mt-2 sm:mt-3 space-y-3.5 sm:space-y-5">
          {/* Living Late-Night Pulse */}
          <NightPresence />

          {/* 5-Second Comprehension Hero Banner */}
          <HeroIntro />

          {/* Winner Card */}
          {winner && (
            <UnsaidCard
              unsaid={winner}
              hero
              isWinner
              hook={winnerHook}
              mine={
                winnerUserReaction
                  ? [winnerUserReaction]
                  : myReactions[winner.id] ?? []
              }
              echoed={myEchoedIds.includes(winner.id)}
              reported={myReports.includes(winner.id)}
              myHandle={handle}
              onReact={(_id, key) => onWinnerReact(key)}
              onEcho={handleEcho}
              onReport={handleReport}
              onShare={handleShareTarget}
            />
          )}

          {/* Submission Box */}
          <WritingBox
            lastSubmitAt={lastSubmitAt}
            myHandle={handle}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onUnlock={() => {
              clearLastSubmit();
              setLastSubmitAt(null);
            }}
            onSubmit={async ({ text, handle: postHandle, category, preset }) => {
              await submitPost({
                text,
                handle: postHandle,
                category,
                preset,
                profileId: user?.id ?? null,
              });
              const ts = Date.now();
              writeLastSubmit(ts);
              setLastSubmitAt(ts);
              awardWarmth("post", "Spilled tea on wall");
              appendMyPostCategory(category);
              if (shouldShowPushPrompt()) {
                window.setTimeout(() => setShowPushSheet(true), 1500);
              }
            }}
          />

          {/* Feed Sort & Psychological Ranking Filter */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 px-1 mb-2.5 font-vibe">
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/8">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("spicy");
                  }}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    feedSort === "spicy"
                      ? "bg-[#E8552E] text-white shadow-[0_0_12px_rgba(232,85,46,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>🔥</span>
                  <span>Spicy Secrets</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("latest");
                  }}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    feedSort === "latest"
                      ? "bg-[#E8552E] text-white shadow-[0_0_12px_rgba(232,85,46,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>⚡</span>
                  <span>Latest</span>
                </button>
              </div>

              <span className="text-[11px] text-[#9C8F87] font-sans">
                {feedSort === "spicy" ? "Most addictive first" : "Chronological"}
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-3 px-1 mb-2 font-vibe">
              <span className="text-muted-foreground/70 text-[11px] font-bold tracking-wider uppercase">
                Filter by vibe
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
            <div className="no-scrollbar -mx-4 sm:-mx-5 flex gap-2 overflow-x-auto px-4 sm:px-5 pb-1 font-vibe">
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
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95 cursor-pointer",
                      on
                        ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                        : "border-white/8 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:border-white/15 hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <CommunityRegulars />

          {/* Initial Loading State */}
          {isFeedLoading && visiblePosts.length === 0 && <FeedSkeleton count={3} />}

          {/* Error State */}
          {isFeedError && visiblePosts.length === 0 && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center font-vibe">
              <p className="font-display text-lg">The Wall didn&apos;t load.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Connection took a breath. Give it another try?
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

          {/* Empty State */}
          {!isFeedLoading && !isFeedError && visiblePosts.length === 0 && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center font-vibe">
              <p className="font-display text-lg font-bold">No confessions here yet</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {filters.length > 0
                  ? "No confessions found in this category. Try selecting another!"
                  : "Be the first to share an unspoken thought or secret confession."}
              </p>
            </div>
          )}

          {/* Feed List */}
          {visiblePosts.map((u, index) => (
            <Fragment key={u.id}>
              <UnsaidCard
                unsaid={u}
                intrigueBadge={index === 0 && feedSort === "spicy" ? "🔥 Most Whispered Secret" : undefined}
                mine={myReactions[u.id] ?? []}
                echoed={myEchoedIds.includes(u.id)}
                reported={myReports.includes(u.id)}
                myHandle={handle}
                onReact={handleReact}
                onEcho={handleEcho}
                onReport={handleReport}
                onShare={handleShareTarget}
              />
              {index === 2 && <FeedWritingPrompt />}
            </Fragment>
          ))}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-10 w-full" />

          {/* Loading next page indicator */}
          {isFetchingNextPage && <FeedSkeleton count={1} />}

          {/* End of Wall */}
          {!hasNextPage && visiblePosts.length > 0 && (
            <p className="text-muted-foreground/80 py-6 text-center text-xs font-semibold font-vibe tracking-wide">
              You&apos;re all caught up on confessions. Check back soon for new drops!
            </p>
          )}
        </div>
      </div>

      <QuoteCardDialog unsaid={shareTarget} onClose={() => setShareTarget(null)} />
      <PushPermissionSheet isOpen={showPushSheet} onClose={() => setShowPushSheet(false)} />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="spring-press fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex size-10 items-center justify-center rounded-full border border-white/15 bg-[#151010]/90 text-white/80 shadow-lg backdrop-blur-md transition-all hover:text-primary hover:border-primary/50 cursor-pointer"
        >
          <ArrowUp className="size-4" />
        </button>
      )}

      {/* Scroll-scrubbed Baji Mascot — peeks from right edge */}
      <ScrollMascot />

      {/* 3-Second Smooth Intro Splash on First Load */}
      <BajiIntroSplash />

      {/* Shared Frosted Glassmorphic Bottom Navigation Bar */}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
