/**
 * Sensory Micro-Haptic Engine for BajiHears
 * Uses the Web Vibration API with safe SSR guards and graceful fallback.
 */

export type HapticType = "selection" | "impactLight" | "impactMedium" | "celebration" | "warning";

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 8,
  impactLight: 14,
  impactMedium: 22,
  celebration: [15, 30, 20, 35, 30],
  warning: [30, 50, 30],
};

export function triggerHaptic(type: HapticType = "impactLight"): void {
  try {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(HAPTIC_PATTERNS[type]);
    }
  } catch {
    // Graceful no-op on platforms or permissions where vibration is disallowed
  }
}
