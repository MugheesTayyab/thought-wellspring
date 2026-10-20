import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  readBajiReadSaved,
  writeBajiReadSaved,
  type BajiReadResult,
} from "@/client/lib/bajiRead";
import { BajiReadLockedCard } from "@/client/components/bajihears/BajiReadLockedCard";
import { BajiReadCard } from "@/client/components/bajihears/BajiReadCard";
import { BajiReadShareDialog } from "@/client/components/bajihears/BajiReadShareDialog";
import { BottomNav } from "@/client/components/bajihears/BottomNav";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Your Baji Read | BajiHears" },
      {
        name: "description",
        content: "A playful editorial reflection based on how you interact with BajiHears.",
      },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const { totalWarmth, openWarmthSheet, isFlashingOrb } = useWarmth();
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<BajiReadResult>({
    unlocked: false,
    totalActions: 0,
    actionsNeeded: 5,
  });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    sessionStorage.setItem("baji:read-visited", "1");
    try {
      setSaved(readBajiReadSaved());
      const cached = readBajiReadCache();
      if (cached?.result?.unlocked && Date.now() - cached.computedAt < CACHE_TTL_MS) {
        setResult(cached.result);
        return;
      }
      const fresh = computeBajiRead(
        readMyReactions(),
        readMyEchoes(),
        readAnsweredDuels(),
        readMyPostCategories(),
        totalWarmth,
        readHandle(),
        readUnsaids(),
      );
      setResult(fresh);
      writeBajiReadCache({ computedAt: Date.now(), result: fresh });
    } catch {
      setLoadError("Your activity could not be read on this device. Please try again.");
    }
  }, [totalWarmth]);

  const archetype = result.unlocked ? getArchetype(result.archetype) : null;
  const copyRead = async () => {
    if (!archetype) return;
    const url = `${window.location.origin}/read`;
    await navigator.clipboard?.writeText(
      `My playful Baji Read: ${archetype.name} ${archetype.emoji}\n\n“${archetype.hookLine}”\n\nExplore yours: ${url}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-32 text-foreground sm:px-6">
      <header className="mx-auto flex w-full max-w-md items-center justify-between border-b border-border py-4">
        <Link
          to="/"
          className="tap-44 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          The Wall
        </Link>
        <h1 className="font-display text-lg font-bold">Baji Read</h1>
        <span className="w-16" aria-hidden />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col items-center py-7">
        {!mounted ? (
          <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing your Read…
          </div>
        ) : loadError ? (
          <div className="paper-card p-6 text-center text-sm text-muted-foreground" role="alert">
            {loadError}
          </div>
        ) : result.unlocked && archetype ? (
          <BajiReadCard
            archetype={archetype}
            evidenceSummary={result.evidenceSummary}
            saved={saved}
            copied={copied}
            onSave={() => {
              const next = !saved;
              setSaved(next);
              writeBajiReadSaved(next);
            }}
            onCopy={copyRead}
            onShare={() => setShareOpen(true)}
          />
        ) : (
          <BajiReadLockedCard
            totalActions={!result.unlocked ? result.totalActions : 0}
            actionsNeeded={!result.unlocked ? result.actionsNeeded : 5}
          />
        )}
      </main>
      {archetype && (
        <BajiReadShareDialog
          archetype={archetype}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
      <BottomNav
        totalWarmth={totalWarmth}
        isFlashingOrb={isFlashingOrb}
        onOpenWarmthSheet={openWarmthSheet}
      />
    </div>
  );
}
