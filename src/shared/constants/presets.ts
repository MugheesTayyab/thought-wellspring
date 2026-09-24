import type { Preset, ExclusivePreset } from "../types/unsaid";

export const PRESETS: Preset[] = [
  {
    key: "midnight-static",
    name: "Midnight Static",
    from: "#1b1f3b",
    to: "#3d2b56",
    ink: "#f4f0ff",
  },
  { key: "3am", name: "3AM Thoughts", from: "#101820", to: "#25424f", ink: "#eaf6ff" },
  {
    key: "golden-hour",
    name: "Golden Hour Confession",
    from: "#ff9a2b",
    to: "#e0192b",
    ink: "#fff8f2",
  },
  { key: "quiet-storm", name: "Quiet Storm", from: "#243b4a", to: "#6b7f8c", ink: "#f5fbff" },
  { key: "neon-ache", name: "Neon Ache", from: "#ff2e88", to: "#5b16d6", ink: "#fff0f8" },
];

export const EXCLUSIVE_PRESETS: ExclusivePreset[] = [
  {
    key: "aurora-borealis",
    name: "Aurora",
    from: "#0f2027",
    to: "#203a43",
    ink: "#a8edea",
    isExclusive: true,
    totalSupply: 100,
    remaining: 100,
  },
  {
    key: "rose-dust",
    name: "Rose Dust",
    from: "#4b1248",
    to: "#f10711",
    ink: "#ffe8e8",
    isExclusive: true,
    totalSupply: 50,
    remaining: 50,
  },
];

export function presetByKey(key: string): Preset {
  return (
    PRESETS.find((p) => p.key === key) ??
    EXCLUSIVE_PRESETS.find((p) => p.key === key) ??
    PRESETS[0]!
  );
}
