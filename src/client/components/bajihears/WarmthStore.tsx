import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Check, Flame, ArrowRight } from "lucide-react";
import type { StoreItem, StoreItemCategory } from "@/shared/types/warmth";
import { STORE_ITEMS } from "@/shared/constants/warmth";
import { randomSeed } from "@/shared/utils";
import {
  getPurchasedItems,
  recordPurchase,
  writeAvatarSeed,
} from "@/client/lib/local-storage";
import { useWarmth } from "@/client/stores/warmth-context";
import { triggerHaptic } from "@/client/lib/haptics";

interface WarmthStoreProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TITLES: Record<StoreItemCategory, { label: string; icon: string }> = {
  feature: { label: "Deep Features", icon: "⚡" },
  social: { label: "Wall & Social Status", icon: "👑" },
  cosmetic: { label: "Visual Cosmetics", icon: "🎨" },
};

export const WarmthStore: React.FC<WarmthStoreProps> = ({ isOpen, onClose }) => {
  const { totalWarmth, spendWarmth } = useWarmth();
  const [purchased, setPurchased] = useState<string[]>(() => getPurchasedItems());
  const [justPurchased, setJustPurchased] = useState<string | null>(null);

  if (!isOpen || typeof document === "undefined") return null;

  const handlePurchase = (item: StoreItem) => {
    if (totalWarmth < item.cost || purchased.includes(item.id)) return;

    triggerHaptic("celebration");
    spendWarmth(item.cost, `Unlocked ${item.name}`);
    recordPurchase(item.id);
    setPurchased((prev) => [...prev, item.id]);
    setJustPurchased(item.id);
    window.setTimeout(() => setJustPurchased(null), 3000);

    // Immediate local side effects
    if (item.action === "new_avatar") {
      const next = randomSeed();
      writeAvatarSeed(next);
    }
  };

  const categories: StoreItemCategory[] = ["feature", "social", "cosmetic"];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-primary/30 bg-[#120d0d] p-5 sm:p-6 shadow-2xl text-white overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        {/* Drag Handle */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Warmth Store</span>
              <Sparkles className="size-4 text-primary" />
            </h2>
            <p className="text-xs text-white/60">Turn your quiet kindness into exclusive perks</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary shadow-[0_0_15px_rgba(250,84,28,0.3)]">
              <Flame className="size-3.5 fill-current" />
              <span>{totalWarmth.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Store Catalog */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-4">
          {categories.map((cat) => {
            const items = STORE_ITEMS.filter((i) => i.category === cat);
            const { label, icon } = CATEGORY_TITLES[cat];

            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span>{label}</span>
                </h3>

                <div className="grid gap-2.5">
                  {items.map((item) => {
                    const isBought = purchased.includes(item.id);
                    const canAfford = totalWarmth >= item.cost;
                    const isCelebrated = justPurchased === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                          isCelebrated
                            ? "border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            : isBought
                              ? "border-white/10 bg-white/[0.02] opacity-80"
                              : canAfford
                                ? "border-primary/30 bg-white/[0.04] hover:border-primary/60 hover:bg-white/[0.07]"
                                : "border-white/5 bg-white/[0.01] opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10">
                            {item.icon}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white tracking-tight truncate">
                                {item.name}
                              </h4>
                              {item.isLimited && (
                                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.2 text-[9px] font-mono font-bold text-amber-400">
                                  {item.usesRemaining} left
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/60 leading-snug">{item.description}</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0">
                          {isBought ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                              <Check className="size-3.5" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => handlePurchase(item)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                canAfford
                                  ? "bg-brand-gradient text-primary-foreground shadow-[0_0_15px_rgba(250,84,28,0.3)] hover:scale-105 active:scale-95"
                                  : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                              }`}
                            >
                              <span>{item.cost}🔥</span>
                              {!canAfford && (
                                <span className="text-[10px] opacity-70">
                                  ({totalWarmth}/{item.cost})
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};
