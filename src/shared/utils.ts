import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CYCLE_MS } from "./constants/cycle";
import { TIERS } from "./constants/warmth";
import type { TierInfo } from "./types/warmth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nextRevealAt(from = Date.now()): number {
  return Math.ceil(from / CYCLE_MS) * CYCLE_MS;
}

export function generateShareCode(postId: string): string {
  return postId
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 8)
    .toUpperCase();
}

export function buildShareUrl(postId: string): string {
  return `https://bajihears.com/c/${generateShareCode(postId)}`;
}

export function relativeTime(ts: number, from = Date.now()): string {
  if (!ts || Number.isNaN(ts) || ts <= 0) return "just now";
  const diff = Math.max(0, from - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function formatShortCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

export function stripHandle(value: string): string {
  return value.replace(/^@+/, "").replace(/\s+/g, "");
}

export function getInstagramUrl(handle: string | null): string | null {
  if (!handle) return null;
  const clean = stripHandle(handle);
  if (!clean || clean.toLowerCase() === "anonymous") return null;
  return `https://instagram.com/${clean}`;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getTier(totalWarmth: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (t && totalWarmth >= t.minWarmth) {
      return t;
    }
  }
  return TIERS[0]!;
}

export function getNextTier(totalWarmth: number): {
  nextTier: TierInfo | null;
  remaining: number;
  progressPct: number;
} {
  const currentTier = getTier(totalWarmth);
  const currentIndex = TIERS.findIndex((t) => t.key === currentTier.key);

  if (currentIndex < 0 || currentIndex >= TIERS.length - 1) {
    return { nextTier: null, remaining: 0, progressPct: 100 };
  }

  const nextTier = TIERS[currentIndex + 1];
  if (!nextTier) {
    return { nextTier: null, remaining: 0, progressPct: 100 };
  }

  const range = nextTier.minWarmth - currentTier.minWarmth;
  const currentProgress = totalWarmth - currentTier.minWarmth;
  const progressPct = Math.min(100, Math.max(0, (currentProgress / range) * 100));
  const remaining = nextTier.minWarmth - totalWarmth;

  return { nextTier, remaining, progressPct };
}

export function generateClaimCode(threshold: number, deviceToken: string): string {
  const hashStr = `${threshold}-${deviceToken}-baji-warmth`;
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    hash = (hash << 5) - hash + hashStr.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
  return `BH-${threshold}-${hex}`;
}

export function getTodayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
