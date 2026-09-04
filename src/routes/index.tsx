import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThoughtCard } from "@/components/thought-wall/ThoughtCard";
import { SponsoredCard } from "@/components/thought-wall/SponsoredCard";
import { FeedSkeleton } from "@/components/thought-wall/FeedSkeleton";
import { SubmissionBox } from "@/components/thought-wall/SubmissionBox";
import { QuoteCardDialog } from "@/components/thought-wall/QuoteCardDialog";
import {
  MOCK_THOUGHTS,
  MOODS,
  readLastSubmit,
  readMyReactions,
  relativeTime,
  clearLastSubmit,
  sortThoughts,
  writeLastSubmit,
  writeMyReactions,
  type MyReactions,
  type ReactionKey,
  type SortKey,
  type Thought,
} from "@/lib/thought-wall";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thought Wall — say the thing you never said" },
      {
        name: "description",
        content:
          "Anonymous late-night confessions, one a day. Read what everyone's been holding back, react, and share the ones that hit.",
      },
      { property: "og:title", content: "Thought Wall — say the thing you never said" },
      {
        property: "og:description",
        content:
          "Anonymous late-night confessions, one a day. Read what everyone's been holding back and share the ones that hit.",
      },
    ],
  }),
  component: Home,
});

const PAGE = 4;

function Home() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [sort, setSort] = useState<SortKey>("top");
  const [mood, setMood] = useState("All");
  const [visible, setVisible] = useState(PAGE);
  const [myReactions, setMyReactions] = useState<MyReactions>({});
  const [lastSubmitAt, setLastSubmitAt] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<Thought | null>(null);
  const [justPosted, setJustPosted] = useState<Thought | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLDivElement | null>(null);

  // MOCKED: simulated feed fetch. Replace with a real query later.
  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    window.setTimeout(() => {
      setThoughts(MOCK_THOUGHTS);
      setLoading(false);
    }, 700);
  }, []);

  useEffect(() => {
    setMyReactions(readMyReactions());
    setLastSubmitAt(readLastSubmit());
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const byMood = mood === "All" ? thoughts : thoughts.filter((t) => t.mood === mood);
    return sortThoughts(byMood, sort);
  }, [thoughts, mood, sort]);

  const hero = filtered[0];
  const rest = useMemo(() => filtered.slice(1), [filtered]);
  const shown = rest.slice(0, visible);
  const atEnd = shown.length >= rest.length;

  useEffect(() => setVisible(PAGE), [sort, mood]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || atEnd) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisible((v) => v + PAGE);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [atEnd, shown.length]);

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
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              reactions: {
                ...t.reactions,
                [key]: Math.max(0, t.reactions[key] + (already ? -1 : 1)),
              },
            }
          : t,
      ),
    );
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-4 pb-24">
      <header className="bg-background/85 sticky top-0 z-30 -mx-4 flex items-center justify-between px-4 py-3 backdrop-blur">
        <span className="font-display text-brand-gradient text-lg">thoughtwall</span>
        <button
          type="button"
          onClick={() => submitRef.current?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Write a thought"
          className="border-primary/40 text-primary rounded-full border p-2"
        >
          <PenLine className="size-4" aria-hidden />
        </button>
      </header>

      <h1 className="sr-only">Thought Wall — anonymous thoughts, one a day</h1>

      <div className="mt-2 space-y-4">
        {loading && <FeedSkeleton count={3} />}

        {!loading && failed && (
          <div className="bg-card border-border rounded-2xl border p-6 text-center">
            <p className="font-display text-xl">The wall didn&apos;t load.</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Happens sometimes. Try once more?
            </p>
            <button
              type="button"
              onClick={load}
              className="bg-brand-gradient text-primary-foreground mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !failed && hero && (
          <ThoughtCard
            thought={hero}
            hero
            mine={myReactions[hero.id] ?? []}
            onReact={onReact}
            onShare={setShareTarget}
          />
        )}

        <div ref={submitRef}>
          {justPosted && (
            <div className="pop-in border-primary/40 bg-primary/10 mb-4 rounded-2xl border p-4">
              <p className="text-primary text-xs tracking-widest uppercase">
                Your thought is live
              </p>
              <p className="font-display mt-2 text-lg">{justPosted.text}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {justPosted.handle ?? "anonymous"} · {relativeTime(justPosted.createdAt)}
              </p>
            </div>
          )}
          <SubmissionBox
            lastSubmitAt={lastSubmitAt}
            onUnlock={() => {
              clearLastSubmit();
              setLastSubmitAt(null);
              setJustPosted(null);
            }}
            onSubmit={({ text, handle }) => {
              const posted: Thought = {
                id: `local-${Date.now()}`,
                text,
                handle,
                createdAt: Date.now(),
                upvotes: 1,
                reactions: { love: 0, cry: 0, fire: 0, hug: 0 },
                mood: mood === "All" ? undefined : mood,
              };
              setThoughts((prev) => [posted, ...prev]);
              setJustPosted(posted);
              const ts = Date.now();
              writeLastSubmit(ts);
              setLastSubmitAt(ts);
            }}
          />
        </div>

        {!loading && !failed && thoughts.length > 0 && (
          <>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                    mood === m
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="bg-secondary/40 border-border grid grid-cols-3 gap-1 rounded-full border p-1">
              {(
                [
                  ["top", "Top today"],
                  ["new", "New"],
                  ["loved", "All-time loved"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className={cn(
                    "rounded-full py-2 text-xs font-semibold transition-colors",
                    sort === key
                      ? "bg-brand-gradient text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <div className="bg-card border-border rounded-2xl border p-6 text-center">
            <p className="font-display text-xl">Nothing here yet.</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Be the first to say what you&apos;ve been holding back.
            </p>
          </div>
        )}

        {!loading &&
          !failed &&
          shown.map((t, i) => (
            <div key={t.id} className="space-y-4">
              {i === 1 && <SponsoredCard />}
              <ThoughtCard
                thought={t}
                mine={myReactions[t.id] ?? []}
                onReact={onReact}
                onShare={setShareTarget}
              />
            </div>
          ))}

        {!loading && !failed && !atEnd && <div ref={sentinel} className="h-10" />}

        {!loading && !failed && atEnd && rest.length > 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            You&apos;ve read them all. Come back tomorrow.
          </p>
        )}
      </div>

      <QuoteCardDialog thought={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
