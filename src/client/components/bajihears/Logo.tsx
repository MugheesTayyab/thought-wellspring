import { cn } from "@/shared/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-label="BajiHears"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden shadow-xs bg-[#FDF3EA]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/brand/header-badge.png"
        alt="BajiHears"
        width={size}
        height={size}
        className="size-full object-cover"
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}
