import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Compass, Swords } from "lucide-react";
import { WarmthOrb } from "@/components/bajihears/WarmthOrb";
import { readBajiReadCache, getArchetype } from "@/lib/bajiRead";
import { triggerHaptic } from "@/lib/haptics";

export interface BottomNavProps {
  totalWarmth: number;
  isFlashingOrb: boolean;
  onOpenWarmthSheet: () => void;
  readState?: "locked" | "ready" | "visited";
  archetypeColor?: string;
}

export function BottomNav({
  totalWarmth,
  isFlashingOrb,
  onOpenWarmthSheet,
  readState: propReadState,
  archetypeColor: propColor,
}: BottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const [state, setState] = useState<{
    status: "locked" | "ready" | "visited";
    color?: string;
  }>({
    status: "locked",
  });

  useEffect(() => {
    if (propReadState) {
      setState({ status: propReadState, color: propColor });
      return;
    }

    try {
      const cached = readBajiReadCache();
      const hasVisited =
        typeof window !== "undefined" && sessionStorage.getItem("baji:read-visited") === "1";

      if (cached?.result && cached.result.unlocked) {
        const arch = getArchetype(cached.result.archetype);
        setState({
          status: hasVisited ? "visited" : "ready",
          color: arch.color,
        });
      } else {
        setState({ status: "locked" });
      }
    } catch {
      setState({ status: "locked" });
    }
  }, [propReadState, propColor, pathname]);

  const isWallActive = pathname === "/";
  const isReadActive = pathname.startsWith("/read");
  const isDuelActive = pathname.startsWith("/duel");

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0d0909]/92 backdrop-blur-2xl px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {/* Wall Tab */}
        <Link
          to="/"
          aria-current={isWallActive ? "page" : undefined}
          onClick={() => triggerHaptic("selection")}
          className={`spring-press flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
            isWallActive ? "text-primary scale-105" : "text-white/50 hover:text-white/80"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Sparkles
              className={`size-5 transition-transform ${isWallActive ? "text-primary" : "text-white/60"}`}
            />
          </div>
          <span className="font-mono text-[10px] tracking-tight">Wall</span>
          <span
            className={`h-0.5 w-3 rounded-full transition-all duration-300 ${
              isWallActive ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]" : "bg-transparent"
            }`}
          />
        </Link>

        {/* Read Tab */}
        <Link
          to="/read"
          aria-current={isReadActive ? "page" : undefined}
          onClick={() => triggerHaptic("selection")}
          className={`spring-press relative flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
            isReadActive ? "text-primary scale-105" : "text-white/50 hover:text-white/80"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Compass
              className={`size-5 transition-transform ${isReadActive ? "text-primary" : "text-white/60"}`}
            />
            {state.status === "ready" && (
              <span
                className="absolute -top-1 -right-1.5 size-2 rounded-full nav-dot-pulse ring-2 ring-[#0d0909]"
                style={{ backgroundColor: state.color || "#fa541c" }}
                aria-label="New Read result ready"
              />
            )}
          </div>
          <span className="font-mono text-[10px] tracking-tight">Read</span>
          <span
            className={`h-0.5 w-3 rounded-full transition-all duration-300 ${
              isReadActive ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]" : "bg-transparent"
            }`}
          />
        </Link>

        {/* Warmth Orb Center Trigger */}
        <div className="flex flex-col items-center justify-center -my-1">
          <WarmthOrb
            totalWarmth={totalWarmth}
            isFlashing={isFlashingOrb}
            onClick={() => {
              triggerHaptic("impactLight");
              onOpenWarmthSheet();
            }}
            mini
          />
        </div>

        {/* Duel Tab */}
        <Link
          to="/duel"
          aria-current={isDuelActive ? "page" : undefined}
          onClick={() => triggerHaptic("selection")}
          className={`spring-press flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
            isDuelActive ? "text-primary scale-105" : "text-white/50 hover:text-white/80"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Swords
              className={`size-5 transition-transform ${isDuelActive ? "text-primary" : "text-white/60"}`}
            />
          </div>
          <span className="font-mono text-[10px] tracking-tight">Duel</span>
          <span
            className={`h-0.5 w-3 rounded-full transition-all duration-300 ${
              isDuelActive ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]" : "bg-transparent"
            }`}
          />
        </Link>
      </div>
    </nav>
  );
}
