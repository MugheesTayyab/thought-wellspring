import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Compass, Swords, Lock } from "lucide-react";
import { readBajiReadCache, getArchetype } from "@/client/lib/bajiRead";
import { triggerHaptic } from "@/client/lib/haptics";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { LockedTabModal } from "./LockedTabModal";

export interface BottomNavProps {
  totalWarmth?: number;
  isFlashingOrb?: boolean;
  onOpenWarmthSheet?: () => void;
  readState?: "locked" | "ready" | "visited";
  archetypeColor?: string;
}

export function BottomNav({
  readState: propReadState,
  archetypeColor: propColor,
}: BottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const [state, setState] = useState<{
    status: "locked" | "ready" | "visited";
    color?: string | undefined;
  }>({
    status: "locked",
  });

  const [tabsUnlocked, setTabsUnlocked] = useState<{ duel: boolean; read: boolean }>({
    duel: false,
    read: false,
  });

  const [lockedModalType, setLockedModalType] = useState<"read" | "duel" | null>(null);

  const refreshTabs = () => {
    const id = getOrCreateIdentity();
    setTabsUnlocked({
      duel: id.tabsUnlocked?.duel ?? false,
      read: id.tabsUnlocked?.read ?? false,
    });
  };

  useEffect(() => {
    refreshTabs();
  }, [pathname]);

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
    <>
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0d0909]/92 backdrop-blur-2xl px-6 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
      >
        <div className="mx-auto flex max-w-sm items-center justify-between">
          {/* Wall Tab */}
          <Link
            to="/"
            aria-current={isWallActive ? "page" : undefined}
            onClick={() => triggerHaptic("selection")}
            className={`spring-press flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium transition-all ${
              isWallActive ? "text-primary scale-105" : "text-white/50 hover:text-white/80"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Flame
                className={`size-5 transition-transform ${isWallActive ? "text-primary fill-primary/20" : "text-white/60"}`}
              />
            </div>
            <span className="font-mono text-[11px] tracking-tight">Wall</span>
            <span
              className={`h-0.5 w-4 rounded-full transition-all duration-300 ${
                isWallActive ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]" : "bg-transparent"
              }`}
            />
          </Link>

          {/* Read Tab */}
          {tabsUnlocked.read ? (
            <Link
              to="/read"
              aria-current={isReadActive ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`spring-press relative flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium transition-all animate-[popIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)] ${
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
              <span className="font-mono text-[11px] tracking-tight">Read</span>
              <span
                className={`h-0.5 w-4 rounded-full transition-all duration-300 ${
                  isReadActive
                    ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]"
                    : "bg-transparent"
                }`}
              />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("warning");
                setLockedModalType("read");
              }}
              className="spring-press flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium opacity-50 transition-opacity hover:opacity-85 cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <Compass className="size-5 text-white/50" />
                <Lock className="absolute -top-1 -right-1.5 size-2.5 text-primary" />
              </div>
              <span className="font-mono text-[11px] tracking-tight text-white/50">Read</span>
              <span className="h-0.5 w-4 rounded-full bg-transparent" />
            </button>
          )}

          {/* Duel Tab */}
          {tabsUnlocked.duel ? (
            <Link
              to="/duel"
              aria-current={isDuelActive ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`spring-press flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium transition-all animate-[popIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)] ${
                isDuelActive ? "text-primary scale-105" : "text-white/50 hover:text-white/80"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Swords
                  className={`size-5 transition-transform ${isDuelActive ? "text-primary" : "text-white/60"}`}
                />
              </div>
              <span className="font-mono text-[11px] tracking-tight">Duel</span>
              <span
                className={`h-0.5 w-4 rounded-full transition-all duration-300 ${
                  isDuelActive
                    ? "bg-primary shadow-[0_0_8px_rgba(250,84,28,0.8)]"
                    : "bg-transparent"
                }`}
              />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("warning");
                setLockedModalType("duel");
              }}
              className="spring-press flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium opacity-50 transition-opacity hover:opacity-85 cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <Swords className="size-5 text-white/50" />
                <Lock className="absolute -top-1 -right-1.5 size-2.5 text-primary" />
              </div>
              <span className="font-mono text-[11px] tracking-tight text-white/50">Duel</span>
              <span className="h-0.5 w-4 rounded-full bg-transparent" />
            </button>
          )}
        </div>
      </nav>

      {/* Educational Locked Tab Modal */}
      <LockedTabModal
        type={lockedModalType}
        onClose={() => setLockedModalType(null)}
        onUnlocked={() => {
          refreshTabs();
        }}
      />
    </>
  );
}
