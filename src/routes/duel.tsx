import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MOCK_DUELS, readAnsweredDuels, writeAnsweredDuels } from "@/lib/bajihears";
import { generateSplit } from "@/lib/warmth";
import { DuelCard } from "@/components/bajihears/DuelCard";
import { WarmthOrb } from "@/components/bajihears/WarmthOrb";
import { useWarmth } from "./__root";

export const Route = createFileRoute("/duel")({
  head: () => ({
    meta: [
      { title: "The Duel — Which One Is You? | BajiHears" },
      {
        name: "description",
        content: "Snackable confession duels. Choose which confession speaks to your soul and earn Warmth Points.",
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
  const { totalWarmth, awardWarmth, openWarmthSheet } = useWarmth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredRecord, setAnsweredRecord] = useState(() => readAnsweredDuels());

  const currentDuel = MOCK_DUELS[currentIndex % MOCK_DUELS.length] ?? MOCK_DUELS[0]!;
  const existingAnswer = answeredRecord[currentDuel.id] ?? null;

  const handleAnswer = (choiceIndex: 0 | 1) => {
    if (existingAnswer) return;

    // Generate session-randomized split skewed towards user's choice
    const split = generateSplit(choiceIndex);
    const newRecord = {
      ...answeredRecord,
      [currentDuel.id]: {
        choiceIndex,
        pctA: split.pctA,
        pctB: split.pctB,
        answeredAt: Date.now(),
      },
    };

    setAnsweredRecord(newRecord);
    writeAnsweredDuels(newRecord);

    // Award +2 Warmth
    awardWarmth("duel", "Answered Duel");
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0F0A0A] text-white flex flex-col items-center justify-between p-4 md:p-8">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-4 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wall</span>
        </Link>

        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <span>The Duel</span>
          <span className="text-xs text-primary font-mono">⚔️</span>
        </h1>

        <WarmthOrb
          totalWarmth={totalWarmth}
          mini
          onClick={openWarmthSheet}
        />
      </header>

      {/* Main Duel Content */}
      <main className="relative z-10 my-auto py-8 w-full flex flex-col items-center justify-center">
        <DuelCard
          duel={currentDuel}
          answeredState={existingAnswer}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </main>

      {/* Bottom Footer Stats */}
      <footer className="relative z-10 w-full max-w-4xl pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
        <span>
          Duels Answered: <strong className="text-white">{Object.keys(answeredRecord).length}</strong>
        </span>
        <button
          type="button"
          onClick={openWarmthSheet}
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Earned {totalWarmth} Warmth</span>
          <span>🔥</span>
        </button>
      </footer>
    </div>
  );
}
