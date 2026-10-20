import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, MessageCircle, Swords, UserRound } from "lucide-react";
import { readBajiReadCache, getArchetype } from "@/client/lib/bajiRead";
import { triggerHaptic } from "@/client/lib/haptics";

export interface BottomNavProps {
  totalWarmth?: number;
  isFlashingOrb?: boolean;
  onOpenWarmthSheet?: () => void;
  readState?: "locked" | "ready" | "visited";
  archetypeColor?: string;
}

const destinations = [
  { to: "/", label: "Wall", Icon: MessageCircle },
  { to: "/read", label: "Read", Icon: Compass },
  { to: "/duel", label: "Duel", Icon: Swords },
  { to: "/corner", label: "Corner", Icon: UserRound },
] as const;

export function BottomNav({ readState, archetypeColor }: BottomNavProps) {
  const pathname = useLocation().pathname;
  const [readIndicator, setReadIndicator] = useState({
    ready: readState === "ready",
    color: archetypeColor,
  });

  useEffect(() => {
    if (readState) {
      setReadIndicator({ ready: readState === "ready", color: archetypeColor });
      return;
    }
    const cached = readBajiReadCache();
    const visited = sessionStorage.getItem("baji:read-visited") === "1";
    setReadIndicator({
      ready: Boolean(cached?.result?.unlocked && !visited),
      color: cached?.result?.unlocked ? getArchetype(cached.result.archetype).color : undefined,
    });
  }, [archetypeColor, pathname, readState]);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#FAF7F3]/94 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-10px_30px_rgba(62,43,38,0.08)] backdrop-blur-2xl"
    >
      <div className="mx-auto grid max-w-sm grid-cols-4">
        {destinations.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`spring-press flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors ${
                active ? "bg-[#FBE6E4] text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative">
                <Icon className={`size-5 ${active && label === "Wall" ? "fill-primary/10" : ""}`} />
                {label === "Read" && readIndicator.ready && (
                  <span
                    className="absolute -right-1.5 -top-1 size-2 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: readIndicator.color || "#AE4335" }}
                    aria-label="New Baji Read available"
                  />
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
