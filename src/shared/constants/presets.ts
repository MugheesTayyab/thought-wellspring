import type { Preset, ExclusivePreset } from "../types/unsaid";

export const PRESETS: Preset[] = [
  {
    key: "midnight-static",
    name: "Soft Note",
    from: "#FFFCF8",
    to: "#FBE9E5",
    ink: "#342D2A",
  },
  { key: "3am", name: "Blue Window", from: "#F7F8FF", to: "#E5EAF8", ink: "#303849" },
  {
    key: "golden-hour",
    name: "Peach Hour",
    from: "#FFF8F2",
    to: "#FBE4D9",
    ink: "#3D302B",
  },
  {
    key: "quiet-storm",
    name: "After Hours",
    from: "#F8F5FA",
    to: "#EAE5F0",
    ink: "#37313C",
  },
  {
    key: "neon-ache",
    name: "Little Spark",
    from: "#FFFDF3",
    to: "#F7EDC9",
    ink: "#3B3527",
  },
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
