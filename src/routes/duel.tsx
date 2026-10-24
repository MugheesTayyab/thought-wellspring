import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCw, Swords } from "lucide-react";
import { DuelCard } from "@/client/components/bajihears/DuelCard";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDuel } from "@/client/hooks/use-duel";

export const Route = createFileRoute("/duel")({
  head: () => ({
    meta: [
      { title: "The Duel · Two Thoughts | BajiHears" },
      {
        name: "description",
        content: "Choose between two relatable thoughts. One feels more you.",
      },
      { property: "og:url", content: "https://bajihears.app/duel" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/duel" }],
  }),
  component: DuelPage,
});

function DuelPage() {
  const { totalWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const {
    duel,
    alreadyVoted,
    userChoice,
    pctA,
    pctB,
    votesA,
    votesB,
    isLoading,
    isVoting,
    error,
    vote,
    refetch,
    answeredCount,
  } = useDuel();

  const answered =
    alreadyVoted && userChoice !== undefined ? { choiceIndex: userChoice, pctA, pctB } : null;

  return (
    <div className="duel-page bg-background px-4 text-foreground sm:px-6">
      <header className="mx-auto flex max-w-lg items-center justify-between border-b border-border py-4">
        <Link
          to="/"
          className="tap-44 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          The Wall
        </Link>
        <div className="flex items-center gap-1.5">
          <Swords className="size-4 text-primary" />
          <h1 className="font-display text-lg font-bold text-ink">Duel</h1>
        </div>
        <span className="w-16" aria-hidden />
      </header>

      <main className="duel-main mx-auto flex w-full max-w-lg items-center justify-center py-3">
        {isLoading && !duel ? (
          <div className="w-full space-y-4">
            <div className="h-6 w-32 mx-auto rounded-full bg-border/40 animate-pulse" />
            <div className="h-8 w-64 mx-auto rounded-xl bg-border/50 animate-pulse" />
            <div className="space-y-3 pt-4">
              <div className="h-36 rounded-3xl border border-border bg-paper p-5 animate-pulse" />
              <div className="h-6 w-12 mx-auto rounded-full bg-border/40 animate-pulse" />
              <div className="h-36 rounded-3xl border border-border bg-paper p-5 animate-pulse" />
            </div>
          </div>
        ) : error && !duel ? (
          <div className="paper-card max-w-sm p-6 text-center" role="alert">
            <RotateCw className="mx-auto size-6 text-coral" />
            <h2 className="mt-3 font-display text-xl font-bold text-ink">
              The Duel could not load
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Check your connection and tap below to retry.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 tap-44 inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs hover:bg-coral-dark"
            >
              <RotateCw className="size-3.5" />
              Try again
            </button>
          </div>
        ) : duel ? (
          <DuelCard
            duel={duel}
            answeredState={answered}
            totalVotes={votesA + votesB}
            isVoting={isVoting}
            onAnswer={(choice) => void vote(choice)}
          />
        ) : (
          <div className="paper-card max-w-sm p-7 text-center">
            <h2 className="font-display text-xl font-bold text-ink">No Duel is active</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A new pair of thoughts will appear when the next community Duel is published.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-coral px-4 text-xs font-bold text-white shadow-xs"
            >
              Explore the Wall
            </Link>
          </div>
        )}
      </main>
      {error && duel && (
        <p role="alert" className="mx-auto max-w-lg text-center text-sm text-destructive">
          {error.message} Your vote was not saved. Try again.
        </p>
      )}

      <footer className="mx-auto flex w-full max-w-lg items-center justify-between border-t border-border py-1 text-xs text-muted-foreground">
        <span>
          {answeredCount} {answeredCount === 1 ? "Duel" : "Duels"} answered
        </span>
        <button
          type="button"
          onClick={openWarmthSheet}
          className="tap-44 font-semibold text-coral hover:underline inline-flex items-center gap-1"
        >
          <span>View Ember · {totalWarmth}</span>
        </button>
      </footer>

      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
