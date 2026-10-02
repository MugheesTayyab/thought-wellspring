import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useWarmth } from "@/client/stores/warmth-context";
import {
  readMyReactions,
  readMyEchoes,
  readAnsweredDuels,
  readMyPostCategories,
  readHandle,
  readUnsaids,
} from "@/client/lib/local-storage";
import {
  computeBajiRead,
  readBajiReadCache,
  writeBajiReadCache,
  getArchetype,
  CACHE_TTL_MS,
  BAJI_READ_COST,
  type BajiReadResult,
} from "@/client/lib/bajiRead";
import { BajiReadLockedCard } from "@/client/components/bajihears/BajiReadLockedCard";
import { BajiReadCard } from "@/client/components/bajihears/BajiReadCard";
import { BajiReadShareDialog } from "@/client/components/bajihears/BajiReadShareDialog";
import { BottomNav } from "@/client/components/bajihears/BottomNav";
import { WarmthOrb } from "@/client/components/bajihears/WarmthOrb";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Your Baji Read | BajiHears" },
      {
        name: "description",
        content: "BajiHears figured out your type from what you do here. Zero questions asked.",
      },
      { property: "og:title", content: "Your Baji Read | BajiHears" },
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
    if (cached && cached.result?.unlocked && Date.now() - cached.computedAt < CACHE_TTL_MS) {
      setResult(cached.result);
      setBonusUnlocked(!!cached.bonusUnlocked);
      return;
    }

    const reactions = readMyReactions();
    const echoes = readMyEchoes();
    const duels = readAnsweredDuels();
    const postCats = readMyPostCategories();
    const handle = readHandle();
    const postsCatalog = readUnsaids();

    const freshResult = computeBajiRead(
      reactions,
      echoes,
      duels,
      postCats,
      totalWarmth,
      handle,
      postsCatalog,
    );

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
    const appUrl =
      typeof window !== "undefined" && window.location.origin
        ? `${window.location.origin}/read`
        : "https://bajihears.mugheestayyab4.workers.dev/read";
    const text = `My Baji Read says I'm: ${arch.name} ${arch.emoji}\n\n"${arch.hookLine}"\n\nFind your type → ${appUrl}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const currentArchetype = result.unlocked ? getArchetype(result.archetype) : null;

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

        <h1 className="font-display text-xl font-medium text-foreground sm:text-2xl">
          <span>Baji Read</span>
        </h1>

        <WarmthOrb totalWarmth={totalWarmth} mini onClick={openWarmthSheet} />
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 my-auto flex w-full flex-col items-center justify-center py-8 sm:py-12">
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
            matchAccuracy={result.matchAccuracy}
            traits={result.traits}
            vibeSignature={result.vibeSignature}
            evidenceSummary={result.evidenceSummary}
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
