import { useState, useMemo } from "react";
import { Sparkles, BookOpen, ShieldCheck, Flame } from "lucide-react";
import { UnsaidCard } from "./UnsaidCard";
import { FeedSkeleton } from "./FeedSkeleton";
import { useEditorialOriginals } from "@/client/hooks/use-editorial-originals";
import { triggerHaptic } from "@/client/lib/haptics";
import { cn } from "@/shared/utils";
import { CATEGORIES } from "@/shared/constants/categories";
import type { Category, ReactionKey, Unsaid } from "@/shared/types/unsaid";

export interface EditorialOriginalsSectionProps {
  myReactions: Record<string, ReactionKey[]>;
  myEchoedIds: string[];
  myReports: string[];
  savedThoughts: Unsaid[];
  myHandle: string | null;
  onReact: (id: string, key: ReactionKey) => void;
  onEcho: (id: string, text: string, echoHandle: string | null) => Promise<void>;
  onReport: (id: string) => Promise<string>;
  onReportEcho: (echoId: string) => Promise<string>;
  onSave: (unsaid: Unsaid) => void;
  onShare: (unsaid: Unsaid) => void;
}

export function EditorialOriginalsSection({
  myReactions,
  myEchoedIds,
  myReports,
  savedThoughts,
  myHandle,
  onReact,
  onEcho,
  onReport,
  onReportEcho,
  onSave,
  onShare,
}: EditorialOriginalsSectionProps) {
  const { originals, isLoading, isError, refetch } = useEditorialOriginals();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  const filteredOriginals = useMemo(() => {
    // Preserve exact display_order (1 to 30)
    const sorted = [...originals].sort((a, b) => {
      const orderA = a.displayOrder ?? 999;
      const orderB = b.displayOrder ?? 999;
      return orderA - orderB;
    });

    if (selectedCategory === "all") {
      return sorted;
    }
    return sorted.filter((p) => p.category === selectedCategory);
  }, [originals, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: originals.length };
    for (const cat of CATEGORIES) {
      counts[cat] = originals.filter((p) => p.category === cat).length;
    }
    return counts;
  }, [originals]);

  return (
    <section aria-labelledby="originals-section-title" className="space-y-4">
      {/* Editorial Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E3B8B1] bg-[#FFF9F6] p-5 sm:p-6 shadow-xs">
        <div
          className="absolute -right-6 -top-6 size-28 rounded-full bg-[#FBE6E4]/60 pointer-events-none"
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#7D3028] border border-[#E3B8B1]">
              <Sparkles className="size-3 text-[#7D3028]" aria-hidden />
              Curated Launch Collection
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              30 Manus Originals
            </span>
          </div>

          <h2
            id="originals-section-title"
            className="mt-2.5 font-serif text-[22px] sm:text-[26px] leading-[1.25] text-foreground font-normal tracking-[-0.01em]"
          >
            BajiHears Originals
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            A curated launch collection of 30 fictional scenarios written to explore everyday unsaid moments. Clearly labelled fiction so genuine community confessions remain 100% authentic.
          </p>

          {/* Provenance and Integrity Badges */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-[#E3B8B1]/40 text-[11px] font-medium text-[#7D3028]">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 border border-[#E3B8B1]/50">
              <BookOpen className="size-3 text-[#7D3028]" aria-hidden />
              Exact Curated Sequence (#01–#30)
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 border border-[#E3B8B1]/50">
              <ShieldCheck className="size-3 text-emerald-700" aria-hidden />
              Fictional Scenarios · Real Reader Reactions
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 border border-[#E3B8B1]/50">
              <Flame className="size-3 text-amber-600" aria-hidden />
              Zero Fake Engagement
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills (Preserves exact sequence within category) */}
      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5"
        aria-label="Filter BajiHears Originals by category"
      >
        <button
          type="button"
          aria-pressed={selectedCategory === "all"}
          onClick={() => {
            triggerHaptic("selection");
            setSelectedCategory("all");
          }}
          className={cn(
            "min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-all cursor-pointer",
            selectedCategory === "all"
              ? "border-primary bg-accent text-primary"
              : "border-border-card bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          All {(categoryCounts["all"] ?? 0) > 0 && `(${categoryCounts["all"]})`}
        </button>

        {CATEGORIES.map((c) => {
          const on = selectedCategory === c;
          const count = categoryCounts[c] ?? 0;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => {
                triggerHaptic("selection");
                setSelectedCategory(c);
              }}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-4 text-xs font-medium transition-all active:scale-[.97] cursor-pointer",
                on
                  ? "border-primary bg-accent text-primary font-semibold"
                  : "border-border-card bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{c}</span>
              {count > 0 && <span className="ml-1 text-[11px] opacity-80">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && originals.length === 0 && <FeedSkeleton count={3} />}

      {/* Error State */}
      {isError && originals.length === 0 && (
        <div className="bg-card border-border-card rounded-3xl border p-6 text-center font-sans shadow-soft">
          <p className="font-serif text-xl text-foreground">
            Couldn&apos;t load BajiHears Originals right now.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Check your network connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-primary text-white mt-4 rounded-2xl min-h-11 px-5 text-sm font-semibold cursor-pointer active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State / Gate Notice (when database does not have editorial seeds yet) */}
      {!isLoading && !isError && originals.length === 0 && (
        <div className="paper-card space-y-3.5 p-7 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#FBE6E4] text-[#7D3028]">
            <Sparkles className="size-6" />
          </div>
          <h3 className="font-serif text-2xl font-normal text-foreground">
            Editorial Collection Ready for Launch
          </h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            The 30 Manus Originals are staged in the verified seed manager and await final owner sign-off. Once the production import is approved, all 30 curated stories will appear here in exact sequence.
          </p>
          <div className="pt-2">
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">
              Owner Approval Gate Active · Zero Production Contamination
            </span>
          </div>
        </div>
      )}

      {/* Filter empty state */}
      {!isLoading && originals.length > 0 && filteredOriginals.length === 0 && (
        <div className="paper-card space-y-3 p-6 text-center">
          <p className="font-serif text-xl text-foreground">No stories in this category</p>
          <p className="text-xs text-muted-foreground">
            Try switching to another category or viewing all 30 stories.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className="min-h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-white"
          >
            Show all 30 stories
          </button>
        </div>
      )}

      {/* Ordered List of Editorial Originals */}
      {filteredOriginals.map((story) => (
        <UnsaidCard
          key={story.id}
          unsaid={story}
          mine={myReactions[story.id] ?? []}
          echoed={myEchoedIds.includes(story.id)}
          reported={myReports.includes(story.id)}
          saved={savedThoughts.some((thought) => thought.id === story.id)}
          myHandle={myHandle}
          onReact={onReact}
          onEcho={onEcho}
          onReport={onReport}
          onReportEcho={onReportEcho}
          onSave={onSave}
          onShare={onShare}
        />
      ))}
    </section>
  );
}
