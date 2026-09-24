import logoAsset from "@/assets/bajihears-logo.jpg.asset.json";
import { cn } from "@/shared/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoAsset.url}
      width={size}
      height={size}
      alt="BajiHears logo — a girl listening with an ear trumpet"
      className={cn("border-primary/40 shrink-0 rounded-full border object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
