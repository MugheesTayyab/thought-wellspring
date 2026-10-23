import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Swords, UserRound } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BottomNavProps {
  totalWarmth?: number;
  isFlashingOrb?: boolean;
  onOpenWarmthSheet?: () => void;
}

const destinations = [
  { to: "/", label: "Wall", Icon: MessageCircle },
  { to: "/duel", label: "Duel", Icon: Swords },
  { to: "/corner", label: "Corner", Icon: UserRound },
] as const;

export function BottomNav(_props: BottomNavProps) {
  const pathname = useLocation().pathname;
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-sm grid-cols-3">
        {destinations.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <Icon className="size-5" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
