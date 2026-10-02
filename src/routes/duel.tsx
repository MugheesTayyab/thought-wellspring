import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Flame, Loader2, Swords } from "lucide-react";
import { DuelCard } from "@/client/components/bajihears/DuelCard";
import { WarmthOrb } from "@/client/components/bajihears/WarmthOrb";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDuel } from "@/client/hooks/use-duel";

export const Route = createFileRoute("/duel")({
  head: () => ({
    meta: [
      { title: "The Duel: Which One Is You? | BajiHears" },
      {
        name: "description",
        content:
          "Live community confession duels. Choose which confession speaks to your soul and earn Warmth Points.",
      },
      { property: "og:title", content: "The Duel | BajiHears" },
      {
        property: "og:description",
        content: "Which confession speaks to your soul? Vote and see what others felt.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DuelPage,
});

function DuelPage() {
  const { totalWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const { duel, alreadyVoted, userChoice, pctA, pctB, isLoading, vote, answeredCount } = useDuel();

  const answeredState =
    alreadyVoted && userChoice !== undefined ? { choiceIndex: userChoice, pctA, pctB } : null;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-background p-4 pb-32 text-foreground sm:pb-36 md:p-8 md:pb-36">
      {/* Top Header */}
      <header className="relative z-10 flex w-full max-w-3xl items-center justify-between border-b border-border py-3">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wall</span>
        </Link>

        <h1 className="flex items-center gap-2 font-display text-xl font-medium text-foreground sm:text-2xl">
          <Swords className="size-5 text-primary" aria-hidden />
          <span>The Duel</span>
        </h1>

        <WarmthOrb totalWarmth={totalWarmth} mini onClick={openWarmthSheet} />
      </header>

      {/* Main Duel Content */}
      <main className="relative z-10 my-auto flex min-h-[420px] w-full flex-col items-center justify-center py-8 sm:py-12">
        {isLoading && !duel ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/60">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Loading today&apos;s duel…</p>
          </div>
        ) : duel ? (
          <DuelCard
            duel={duel}
            answeredState={answeredState}
            onAnswer={(choiceIndex) => vote(choiceIndex)}
            onNext={() => {}}
          />
        ) : (
          <div className="max-w-md border-l-2 border-primary bg-card p-8 text-center">
            <p className="mb-1 font-display text-2xl font-medium">No duel right now</p>
            <p className="text-sm text-muted-foreground">
              The daily duel resets every 24 hours. Check back soon for the next choice.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Footer Stats */}
      <footer className="relative z-10 mt-4 flex w-full max-w-3xl items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          Duels Answered: <strong className="text-white font-mono">{answeredCount}</strong>
        </span>
        <button
          type="button"
          onClick={openWarmthSheet}
          className="flex min-h-11 items-center gap-1 rounded-md px-2 font-mono transition-colors hover:text-primary"
        >
          <span>Earned {totalWarmth} Warmth</span>
          <Flame className="size-4" aria-hidden />
        </button>
      </footer>

      {/* Shared Bottom Navigation */}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
