import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { UnsaidCard } from "@/components/bajihears/UnsaidCard";
import { FeedSkeleton } from "@/components/bajihears/FeedSkeleton";
import { WritingBox } from "@/components/bajihears/WritingBox";
import { QuoteCardDialog } from "@/components/bajihears/QuoteCardDialog";
import { CornerMenu } from "@/components/bajihears/CornerMenu";
import { Logo } from "@/components/bajihears/Logo";
import { WarmthOrb } from "@/components/bajihears/WarmthOrb";
import { BottomNav } from "@/components/bajihears/BottomNav";
import { CommunityRegulars } from "@/components/bajihears/CommunityRegulars";
import { FeedWritingPrompt } from "@/components/bajihears/FeedWritingPrompt";
import { BajiMascot } from "@/components/bajihears/BajiMascot";
import { BajiIntroSplash } from "@/components/bajihears/BajiIntroSplash";
import { useWarmth } from "@/lib/warmth-context";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  MOCK_UNSAIDS,
  REPORT_THRESHOLD,
  WINNER,
  appendMyPostCategory,
  clearLastSubmit,
  randomSeed,
  readAvatarSeed,
  readHandle,
  readLastSubmit,
  readMyEchoes,
  readMyReactions,
  readMyReports,
  writeAvatarSeed,
  writeLastSubmit,
  writeMyEchoes,
  writeMyReactions,
  writeMyReports,
  type Category,
  type MyReactions,
  type ReactionKey,
  type Unsaid,
} from "@/lib/bajihears";

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

const PAGE = 4;

function Home() {
  const { totalWarmth, awardWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [unsaids, setUnsaids] = useState<Unsaid[]>([]);
  const [visible, setVisible] = useState(PAGE);
  const [filters, setFilters] = useState<Category[]>([]);
  const [myReactions, setMyReactions] = useState<MyReactions>({});
  const [myEchoes, setMyEchoes] = useState<string[]>([]);
  const [myReports, setMyReports] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [handle, setHandle] = useState<string | null>(null);
  const [seed, setSeed] = useState("baji");
  const [lastSubmitAt, setLastSubmitAt] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<Unsaid | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const backdrop = useRef<HTMLDivElement | null>(null);

  // MOCKED: simulated Wall fetch. Replace with a real query later.
  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    window.setTimeout(() => {
      setUnsaids(MOCK_UNSAIDS);
      setLoading(false);
    }, 400);
  }, []);

  useEffect(() => {
    setMyReactions(readMyReactions());
    setMyEchoes(readMyEchoes());
    setMyReports(readMyReports());
    setLastSubmitAt(readLastSubmit());
    setHandle(readHandle());
    const existing = readAvatarSeed();
    if (existing) setSeed(existing);
    else {
      const next = randomSeed();
      writeAvatarSeed(next);
      setSeed(next);
    }
    load();
  }, [load]);

  const wall = useMemo(
    () =>
      unsaids.filter(
        (u) => !hiddenIds.includes(u.id) && (filters.length === 0 || filters.includes(u.category)),
      ),
    [unsaids, hiddenIds, filters],
  );
  const shown = wall.slice(0, visible);
  const atEnd = shown.length >= wall.length;

  useEffect(() => {
    setVisible(PAGE);
  }, [filters]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || atEnd) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisible((v) => v + PAGE);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [atEnd, shown.length]);

  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const toggleFilter = (c: Category) => {
    triggerHaptic("selection");
    setFilters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const onReact = (id: string, key: ReactionKey) => {
    // Optimistic: update instantly, never wait on a round trip.
    const already = (myReactions[id] ?? []).includes(key);
    const nextMine: MyReactions = {
      ...myReactions,
      [id]: already
        ? (myReactions[id] ?? []).filter((k) => k !== key)
        : [...(myReactions[id] ?? []), key],
    };
    setMyReactions(nextMine);
    writeMyReactions(nextMine);
    setUnsaids((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              reactions: {
                ...u.reactions,
                [key]: Math.max(0, u.reactions[key] + (already ? -1 : 1)),
              },
            }
          : u,
      ),
    );

    // Award +1 Warmth if adding a new reaction
    if (!already) {
      awardWarmth("react", "Reacted to tea");
    }
  };

  const onEcho = (id: string, text: string, echoHandle: string | null) => {
    if (myEchoes.includes(id)) return;
    const nextEchoed = [...myEchoes, id];
    setMyEchoes(nextEchoed);
    writeMyEchoes(nextEchoed);
    setUnsaids((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              echoes: [
                ...u.echoes,
                { id: `local-${Date.now()}`, text, handle: echoHandle, createdAt: Date.now() },
              ],
            }
          : u,
      ),
    );

    // Award +3 Warmth for adding an echo
    awardWarmth("echo", "Added an echo");
  };

  const handleShareTarget = (unsaid: Unsaid) => {
    setShareTarget(unsaid);
    awardWarmth("share", "Shared Unsaid card");
  };

  // MOCK: real auto-hide happens in the moderation queue past REPORT_THRESHOLD.
  const onReport = (id: string) => {
    if (myReports.includes(id)) return;
    const next = [...myReports, id];
    setMyReports(next);
    writeMyReports(next);
    if (next.filter((r) => r === id).length >= REPORT_THRESHOLD) {
      setHiddenIds((prev) => [...prev, id]);
    }
  };

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

        <div className="wall-3d mt-3 sm:mt-4 space-y-4 sm:space-y-6">
          <UnsaidCard
            unsaid={WINNER.unsaid}
            hero
            isWinner
            hook={WINNER.hook}
            mine={myReactions[WINNER.unsaid.id] ?? []}
            echoed={myEchoes.includes(WINNER.unsaid.id)}
            reported={myReports.includes(WINNER.unsaid.id)}
            myHandle={handle}
            onReact={onReact}
            onEcho={onEcho}
            onReport={onReport}
            onShare={handleShareTarget}
          />

          <WritingBox
            lastSubmitAt={lastSubmitAt}
            myHandle={handle}
            onUnlock={() => {
              clearLastSubmit();
              setLastSubmitAt(null);
            }}
            onSubmit={({ text, handle: postHandle, category, preset }) => {
              const posted: Unsaid = {
                id: `local-${Date.now()}`,
                text,
                handle: postHandle,
                createdAt: Date.now(),
                category,
                preset,
                reactions: { heart: 0, sad: 0, fire: 0, hug: 0 },
                echoes: [],
              };
              setUnsaids((prev) => [posted, ...prev]);
              const ts = Date.now();
              writeLastSubmit(ts);
              setLastSubmitAt(ts);

              // Award +10 Warmth for spilling tea
              awardWarmth("post", "Spilled tea on wall");
              appendMyPostCategory(category);
            }}
          />

          <div className="pt-1">
            <div className="flex items-center justify-between gap-3 px-1 mb-2 font-vibe">
              <span className="text-muted-foreground/70 text-[11px] font-bold tracking-wider uppercase">
                Filter by vibe
              </span>
              {filters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters([])}
                  className="text-primary hover:underline shrink-0 text-xs font-medium"
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
                    onClick={() => toggleFilter(c)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
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

          {loading && <FeedSkeleton count={3} />}

          {!loading && failed && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center font-vibe">
              <p className="font-display text-lg">The Wall didn&apos;t load.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Happens sometimes. Give it another try?
              </p>
              <button
                type="button"
                onClick={load}
                className="bg-brand-gradient text-primary-foreground mt-4 rounded-2xl px-5 py-2.5 text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !failed && wall.length === 0 && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center font-vibe">
              <p className="font-display text-lg">No tea here yet ☕</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {filters.length > 0
                  ? "No tea spilled in this vibe yet. Try another one!"
                  : "Be the first to spill your tea or silent thoughts 💅"}
              </p>
            </div>
          )}

          {!loading &&
            !failed &&
            shown.map((u, index) => (
              <Fragment key={u.id}>
                <UnsaidCard
                  unsaid={u}
                  mine={myReactions[u.id] ?? []}
                  echoed={myEchoes.includes(u.id)}
                  reported={myReports.includes(u.id)}
                  myHandle={handle}
                  onReact={onReact}
                  onEcho={onEcho}
                  onReport={onReport}
                  onShare={handleShareTarget}
                />
                {index === 2 && <FeedWritingPrompt />}
              </Fragment>
            ))}

          {!loading && !failed && !atEnd && <div ref={sentinel} className="h-10" />}

          {!loading && !failed && atEnd && wall.length > 0 && (
            <p className="text-muted-foreground/80 py-6 text-center text-xs font-semibold font-vibe tracking-wide">
              You&apos;ve read all the tea ☕. Come back for the next drop!
            </p>
          )}
        </div>
      </div>

      <QuoteCardDialog unsaid={shareTarget} onClose={() => setShareTarget(null)} />

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

      {/* Interactive Baji Mascot Guide */}
      <BajiMascot />

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
