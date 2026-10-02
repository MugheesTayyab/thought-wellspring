import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Clock3, Flame } from "lucide-react";
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

      <div
        className={cn(
          "mx-auto w-full max-w-2xl px-4 sm:px-6 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b border-border bg-background/96 px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <span className="font-display text-brand-gradient text-xl font-semibold">
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

        <div className="py-7 sm:py-9">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            The wall
          </p>
          <h1 className="max-w-xl font-display text-4xl font-medium text-balance sm:text-5xl">
            Say the part you keep rehearsing.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Post anonymously, or stay awhile and read what other people could not say out loud.
          </p>
        </div>

        <div className="wall-3d space-y-5 sm:space-y-7">
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
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="font-display text-2xl font-medium">Latest on the wall</h2>
              <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("spicy");
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                    feedSort === "spicy"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Flame className="size-4" aria-hidden />
                  <span>For you</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setFeedSort("latest");
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                    feedSort === "latest"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Clock3 className="size-4" aria-hidden />
                  <span>Newest</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-3 px-1 mb-2 font-vibe">
              <span className="text-foreground text-sm font-semibold">Filter by topic</span>
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
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 font-vibe">
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
                      "min-h-11 shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* Empty State with Introvert Value Proposition */}
          {!isFeedLoading && !isFeedError && visiblePosts.length === 0 && (
            <div className="bg-[#17110D] border border-white/[0.08] rounded-3xl p-6 text-center font-sans space-y-3">
              <p className="font-display text-xl font-bold text-[#F5EFE9]">
                A quiet moment on the wall
              </p>
              <p className="text-[#9C8F87] text-xs max-w-sm mx-auto leading-relaxed [text-wrap:pretty]">
                {filters.length > 0
                  ? "No confessions found in this category. Try selecting another filter."
                  : "For introverts with a lot on their mind: this is where an anonymous confession can reach thousands of people without followers or pressure."}
              </p>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 max-w-sm mx-auto text-left text-[11px] text-[#9C8F87] space-y-1">
                <span className="font-semibold text-amber-300 block">The Featured Path:</span>
                <p className="leading-relaxed">
                  Posts resonating strongly with the community and chosen by curators for raw
                  authenticity get crowned Cycle Champion and featured on Bajislays.
                </p>
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
                myHandle={handle}
                onReact={handleReact}
                onEcho={handleEcho}
                onReport={handleReport}
                onShare={handleShareTarget}
              />
              {index === 2 && <FeedWritingPrompt />}
              {/* Community Regulars surfaced naturally every 12 posts */}
              {index > 0 && index % 12 === 0 && (
                <div className="py-2">
                  <CommunityRegulars />
                </div>
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

      {/* 2-Second Smooth Intro Splash on First Load */}
      {/* Shared Frosted Glassmorphic Bottom Navigation Bar */}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
