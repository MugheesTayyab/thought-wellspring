import { useState } from "react";
import { cn } from "@/shared/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  const [imgSrc, setImgSrc] = useState("/logo.png");

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full border border-[#E3B8B1] overflow-hidden bg-[#FBE6E4]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={imgSrc}
        width={size}
        height={size}
        alt="BajiHears mascot with listening horn"
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
