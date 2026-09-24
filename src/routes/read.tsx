import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useWarmth } from "@/lib/warmth-context";
import {
  readMyReactions,
  readMyEchoes,
  readAnsweredDuels,
  readMyPostCategories,
  readHandle,
} from "@/lib/bajihears";
import {
  computeBajiRead,
  readBajiReadCache,
  writeBajiReadCache,
  getArchetype,
  CACHE_TTL_MS,
  BAJI_READ_COST,
  type BajiReadResult,
} from "@/lib/bajiRead";
import { BajiReadLockedCard } from "@/components/bajihears/BajiReadLockedCard";
import { BajiReadCard } from "@/components/bajihears/BajiReadCard";
import { BajiReadShareDialog } from "@/components/bajihears/BajiReadShareDialog";
import { BottomNav } from "@/components/bajihears/BottomNav";
import { WarmthOrb } from "@/components/bajihears/WarmthOrb";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Your Baji Read — BajiHears" },
      {
        name: "description",
        content: "BajiHears figured out your type from what you do here. Zero questions asked.",
      },
      { property: "og:title", content: "Your Baji Read — BajiHears" },
      {
        property: "og:description",
        content: "No quiz, no 20 questions. What your picks and vibes say about your type.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const { totalWarmth, spendWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();

  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<BajiReadResult>({
    unlocked: false,
    totalActions: 0,
    actionsNeeded: 5,
  });

  const [bonusUnlocked, setBonusUnlocked] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Synchronize on mount to ensure SSR hydration matches client
  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      sessionStorage.setItem("baji:read-visited", "1");
    }

    const cached = readBajiReadCache();
    if (cached && Date.now() - cached.computedAt < CACHE_TTL_MS) {
      setResult(cached.result);
      setBonusUnlocked(!!cached.bonusUnlocked);
      return;
    }

    const reactions = readMyReactions();
    const echoes = readMyEchoes();
    const duels = readAnsweredDuels();
    const postCats = readMyPostCategories();
    const handle = readHandle();

    const freshResult = computeBajiRead(reactions, echoes, duels, postCats, totalWarmth, handle);

    setResult(freshResult);
    writeBajiReadCache({
      computedAt: Date.now(),
      result: freshResult,
      bonusUnlocked,
    });
  }, [totalWarmth, bonusUnlocked]);

  const handleSpendWarmth = () => {
    if (totalWarmth < BAJI_READ_COST || bonusUnlocked) return;

    spendWarmth(BAJI_READ_COST, "Unlocked deeper Baji Read line");
    setBonusUnlocked(true);

    const currentCached = readBajiReadCache();
    if (currentCached) {
      writeBajiReadCache({
        ...currentCached,
        bonusUnlocked: true,
      });
    }
  };

  const handleCopy = () => {
    if (!result.unlocked) return;
    const arch = getArchetype(result.archetype);
    const text = `My Baji Read says I'm: ${arch.name} ${arch.emoji}\n\n"${arch.hookLine}"\n\nFind your type → bajihears.com`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const currentArchetype = result.unlocked ? getArchetype(result.archetype) : null;

  return (
    <div className="relative min-h-screen w-full bg-[#0F0A0A] text-white flex flex-col items-center p-4 pb-32 sm:pb-36 md:p-8 md:pb-36">
      {/* Background Radial Glow */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{
          background: currentArchetype
            ? `radial-gradient(ellipse at top, ${currentArchetype.color}25 0%, transparent 70%)`
            : "radial-gradient(ellipse at top, rgba(250,84,28,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-md flex items-center justify-between py-3 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wall</span>
        </Link>

        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
          <span>Baji Read</span>
          <span className="text-xs text-primary">✨</span>
        </h1>

        <WarmthOrb totalWarmth={totalWarmth} mini onClick={openWarmthSheet} />
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 my-auto py-6 sm:py-8 w-full flex flex-col items-center justify-center">
        {!mounted ? (
          <BajiReadLockedCard totalActions={0} actionsNeeded={5} />
        ) : result.unlocked && currentArchetype ? (
          <BajiReadCard
            archetype={currentArchetype}
            totalWarmth={totalWarmth}
            bonusUnlocked={bonusUnlocked}
            onSpendWarmth={handleSpendWarmth}
            onCopy={handleCopy}
            onShare={() => setShareOpen(true)}
            copied={copied}
          />
        ) : (
          <BajiReadLockedCard
            totalActions={!result.unlocked ? result.totalActions : 0}
            actionsNeeded={!result.unlocked ? result.actionsNeeded : 5}
          />
        )}
      </main>

      {/* Share Dialog */}
      {currentArchetype && (
        <BajiReadShareDialog
          archetype={currentArchetype}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Bottom Nav */}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
