import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { DuelCard } from "@/client/components/bajihears/DuelCard";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDuel } from "@/client/hooks/use-duel";

export const Route = createFileRoute("/duel")({
  head: () => ({
    meta: [
      { title: "The Duel | BajiHears" },
      { name: "description", content: "Choose between two real community thoughts." },
    ],
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
    answeredCount,
  } = useDuel();
  const answered =
    alreadyVoted && userChoice !== undefined ? { choiceIndex: userChoice, pctA, pctB } : null;
  return (
    <div className="min-h-screen bg-background px-4 pb-32 text-foreground sm:px-6">
      <header className="mx-auto flex max-w-xl items-center justify-between border-b border-border py-4">
        <Link
          to="/"
          className="tap-44 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          The Wall
        </Link>
        <h1 className="font-display text-lg font-bold">Duel</h1>
        <span className="w-16" />
      </header>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center py-8">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the current Duel…
          </div>
        ) : error ? (
          <div className="paper-card max-w-sm p-6 text-center" role="alert">
            <RotateCw className="mx-auto size-5 text-coral" />
            <h2 className="mt-3 font-display text-xl font-bold">The Duel could not load</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing was substituted. Refresh when your connection is ready.
            </p>
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
            <h2 className="font-display text-xl font-bold">No Duel is active</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A new pair will appear when the next community Duel is published.
            </p>
          </div>
        )}
      </main>
      <footer className="mx-auto flex max-w-xl justify-between border-t border-border py-4 text-xs text-muted-foreground">
        <span>
          {answeredCount} {answeredCount === 1 ? "Duel" : "Duels"} answered
        </span>
        <button type="button" onClick={openWarmthSheet} className="font-semibold text-coral">
          View Ember · {totalWarmth}
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
