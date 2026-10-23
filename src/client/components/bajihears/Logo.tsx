import { cn } from "@/shared/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-label="BajiHears"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary font-serif font-semibold text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      bh
    </span>
  );
}
