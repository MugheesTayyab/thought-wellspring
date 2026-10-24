import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Scale, UserRound } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BottomNavProps {
  totalWarmth?: number;
  isFlashingOrb?: boolean;
  onOpenWarmthSheet?: () => void;
}

const destinations = [
  { to: "/", label: "Wall", Icon: MessageCircle },
  { to: "/duel", label: "Duel", Icon: Scale },
  { to: "/corner", label: "Corner", Icon: UserRound },
] as const;

export function BottomNav(_props: BottomNavProps) {
  const pathname = useLocation().pathname;
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {destinations.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95 ${
                active
                  ? "bg-accent/80 text-primary font-bold shadow-2xs"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
