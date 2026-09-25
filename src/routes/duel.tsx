import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DuelCard } from "@/client/components/bajihears/DuelCard";
import { WarmthOrb } from "@/client/components/bajihears/WarmthOrb";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { useWarmth } from "@/client/stores/warmth-context";
import { useDuel } from "@/client/hooks/use-duel";

export const Route = createFileRoute("/duel")({
  head: () => ({
    meta: [
      { title: "The Duel — Which One Is You? | BajiHears" },
      {
        name: "description",
        content:
          "Live community confession duels. Choose which confession speaks to your soul and earn Warmth Points.",
      },
      { property: "og:title", content: "The Duel — BajiHears" },
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
  const {
    duel,
    alreadyVoted,
    userChoice,
    pctA,
    pctB,
    isLoading,
    vote,
    answeredCount,
  } = useDuel();

  const answeredState =
    alreadyVoted && userChoice !== undefined
      ? { choiceIndex: userChoice, pctA, pctB }
      : null;

  return (
    <div className="relative min-h-screen w-full bg-[#0F0A0A] text-white flex flex-col items-center p-4 pb-32 sm:pb-36 md:p-8 md:pb-36">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-2xl flex items-center justify-between py-3 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wall</span>
        </Link>

        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
          <span>The Duel</span>
          <span className="text-xs text-primary font-mono">⚔️</span>
        </h1>

        <WarmthOrb totalWarmth={totalWarmth} mini onClick={openWarmthSheet} />
      </header>

      {/* Main Duel Content */}
      <main className="relative z-10 my-auto py-5 sm:py-8 w-full flex flex-col items-center justify-center min-h-[420px]">
        {isLoading && !duel ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/60">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs tracking-wide">Summoning the daily duel…</p>
          </div>
        ) : duel ? (
          <DuelCard
            duel={duel}
            answeredState={answeredState}
            onAnswer={(choiceIndex) => vote(choiceIndex)}
            onNext={() => {}}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center max-w-md">
            <p className="text-base font-bold text-white mb-1">No Active Duel Today</p>
            <p className="text-xs text-white/60">
              The daily duel resets every 24 hours. Check back soon for the next choice.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Footer Stats */}
      <footer className="relative z-10 w-full max-w-2xl mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
        <span>
          Duels Answered:{" "}
          <strong className="text-white font-mono">{answeredCount}</strong>
        </span>
        <button
          type="button"
          onClick={openWarmthSheet}
          className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-mono"
        >
          <span>Earned {totalWarmth} Warmth</span>
          <span>🔥</span>
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
