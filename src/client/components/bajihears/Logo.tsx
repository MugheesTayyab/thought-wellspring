import { useState } from "react";
import { cn } from "@/shared/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  const [imgSrc, setImgSrc] = useState("/logo.png");

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full border border-primary/50 overflow-hidden bg-gradient-to-br from-[#2a1410] to-[#120a0a] shadow-[0_0_12px_rgba(250,84,28,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={imgSrc}
        width={size}
        height={size}
        alt="BajiHears mascot — girl with listening horn"
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={() => {
          if (imgSrc !== "/favicon.png") {
            setImgSrc("/favicon.png");
          }
        }}
      />
    </div>
  );
}
