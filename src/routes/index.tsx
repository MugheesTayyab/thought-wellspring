import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnsaidCard } from "@/components/bajihears/UnsaidCard";
import { FeedSkeleton } from "@/components/bajihears/FeedSkeleton";
import { WritingBox } from "@/components/bajihears/WritingBox";
import { QuoteCardDialog } from "@/components/bajihears/QuoteCardDialog";
import { RevealCountdown } from "@/components/bajihears/RevealCountdown";
import { CornerMenu } from "@/components/bajihears/CornerMenu";
import { Logo } from "@/components/bajihears/Logo";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  MOCK_UNSAIDS,
  REPORT_THRESHOLD,
  WINNER,
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
        content: "Anonymous Unsaids, one per cycle. Read, react, echo, and share the ones that hit.",
      },
    ],
  }),
  component: Home,
});

const PAGE = 4;

function Home() {
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

  // Slow-moving backdrop behind fast-scrolling cards.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        backdrop.current?.style.setProperty("--wall-shift", `${window.scrollY}px`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const wall = useMemo(
    () =>
      unsaids.filter(
        (u) =>
          !hiddenIds.includes(u.id) && (filters.length === 0 || filters.includes(u.category)),
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

  const toggleFilter = (c: Category) =>
    setFilters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

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

      <div className="mx-auto w-full max-w-md px-5 pb-28">
        <header className="bg-background/70 sticky top-0 z-30 -mx-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display text-brand-gradient truncate text-base">BajiHears</span>
          </div>
          <CornerMenu seed={seed} />
        </header>

        <h1 className="sr-only">BajiHears — The Wall of Unsaids</h1>

        <div className="wall-3d mt-3 space-y-5">
          <UnsaidCard
            unsaid={WINNER.unsaid}
            hero
            hook={WINNER.hook}
            mine={myReactions[WINNER.unsaid.id] ?? []}
            echoed={myEchoes.includes(WINNER.unsaid.id)}
            reported={myReports.includes(WINNER.unsaid.id)}
            myHandle={handle}
            onReact={onReact}
            onEcho={onEcho}
            onReport={onReport}
            onShare={setShareTarget}
          />
          <RevealCountdown />

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
            }}
          />

          <div className="border-border/60 bg-card/60 -mx-1 rounded-3xl border px-3 py-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
                What do you want to hear?
              </p>
              {filters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters([])}
                  className="text-primary shrink-0 text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((c) => {
                const on = filters.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFilter(c)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                      on
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {loading && <FeedSkeleton count={3} />}

          {!loading && failed && (
            <div className="bg-card border-border rounded-3xl border p-5 text-center">
              <p className="font-display text-lg">The Wall didn&apos;t load.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Happens sometimes. Try once more?
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
            <div className="bg-card border-border rounded-3xl border p-5 text-center">
              <p className="font-display text-lg">Nothing here yet.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {filters.length > 0
                  ? "No Unsaids in these moods yet. Try another one."
                  : "Be the first to say what you've been holding back."}
              </p>
            </div>
          )}

          {!loading &&
            !failed &&
            shown.map((u) => (
              <UnsaidCard
                key={u.id}
                unsaid={u}
                mine={myReactions[u.id] ?? []}
                echoed={myEchoes.includes(u.id)}
                reported={myReports.includes(u.id)}
                myHandle={handle}
                onReact={onReact}
                onEcho={onEcho}
                onReport={onReport}
                onShare={setShareTarget}
              />
            ))}

          {!loading && !failed && !atEnd && <div ref={sentinel} className="h-10" />}

          {!loading && !failed && atEnd && wall.length > 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              You&apos;ve read them all. Come back at the next reveal.
            </p>
          )}
        </div>
      </div>

      <QuoteCardDialog unsaid={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
