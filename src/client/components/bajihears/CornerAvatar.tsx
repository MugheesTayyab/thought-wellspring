import { useMemo } from "react";
import { PRESETS } from "@/shared/constants/presets";

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Whimsical, auto-generated avatar — deterministic from the seed, no photo needed. */
export function CornerAvatar({ seed, size = 36 }: { seed: string; size?: number }) {
  const face = useMemo(() => {
    const h = hash(seed);
    const preset = PRESETS[h % PRESETS.length]!;
    const eyes = ["•  •", "^  ^", "-  -", "o  o", "*  *"][h % 5]!;
    const mouth = ["‿", "ᵕ", "ω", "◡", "▾"][(h >> 3) % 5]!;
    const rotate = ((h >> 5) % 21) - 10;
    return { preset, eyes, mouth, rotate };
  }, [seed]);

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${face.preset.from}, ${face.preset.to})`,
        transform: `rotate(${face.rotate}deg)`,
      }}
      className="border-border/70 flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border leading-none"
    >
      <span style={{ fontSize: size * 0.24, color: face.preset.ink }}>{face.eyes}</span>
      <span style={{ fontSize: size * 0.3, color: face.preset.ink }}>{face.mouth}</span>
    </span>
  );
}
