import { useMemo } from "react";
import { PRESETS } from "@/shared/constants/presets";
import { readAvatarPhoto } from "@/client/lib/local-storage";

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Avatar: Displays either custom uploaded photo from gallery or whimsical generated avatar. */
export function CornerAvatar({
  seed,
  size = 36,
  photoUrl,
}: {
  seed: string;
  size?: number;
  photoUrl?: string | null;
}) {
  const activePhoto = photoUrl !== undefined ? photoUrl : readAvatarPhoto();

  const face = useMemo(() => {
    const h = hash(seed);
    const preset = PRESETS[h % PRESETS.length]!;
    const eyes = ["•  •", "^  ^", "-  -", "o  o", "*  *"][h % 5]!;
    const mouth = ["‿", "ᵕ", "ω", "◡", "▾"][(h >> 3) % 5]!;
    const rotate = ((h >> 5) % 21) - 10;
    return { preset, eyes, mouth, rotate };
  }, [seed]);

  if (activePhoto) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="border-white/15 relative flex shrink-0 overflow-hidden rounded-full border bg-[#17110D] shadow-sm select-none"
      >
        <img src={activePhoto} alt="Avatar" className="w-full h-full object-cover rounded-full" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${face.preset.from}, ${face.preset.to})`,
        transform: `rotate(${face.rotate}deg)`,
      }}
      className="border-border/70 flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border leading-none select-none"
    >
      <span style={{ fontSize: size * 0.24, color: face.preset.ink }}>{face.eyes}</span>
      <span style={{ fontSize: size * 0.3, color: face.preset.ink }}>{face.mouth}</span>
    </span>
  );
}
