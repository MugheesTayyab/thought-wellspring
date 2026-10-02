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

export function BottomNav({ readState: propReadState, archetypeColor: propColor }: BottomNavProps) {
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
        aria-label="Primary"
        className="fixed bottom-2 left-1/2 z-40 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 rounded-xl border border-border bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-soft select-none lg:bottom-auto lg:left-[calc(50%+23rem)] lg:top-1/2 lg:w-20 lg:translate-x-0 lg:-translate-y-1/2 lg:p-1"
      >
        <div className="mx-auto flex items-center justify-around lg:flex-col">
          {/* Wall Tab */}
          <Link
            to="/"
            aria-current={isWallActive ? "page" : undefined}
            onClick={() => triggerHaptic("selection")}
            className={`spring-press flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-4 text-xs font-semibold transition-colors ${
              isWallActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Flame
                className={`size-5 ${isWallActive ? "text-primary-foreground" : "text-muted-foreground"}`}
              />
            </div>
            <span>Wall</span>
          </Link>

          {/* Read Tab */}
          {tabsUnlocked.read ? (
            <Link
              to="/read"
              aria-current={isReadActive ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`spring-press relative flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-4 text-xs font-semibold transition-colors ${
                isReadActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Compass
                  className={`size-5 ${isReadActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                />
                {state.status === "ready" && (
                  <span
                    className="absolute -right-1.5 -top-1 size-2 rounded-full bg-primary ring-2 ring-card"
                    style={{ backgroundColor: state.color || "#fa541c" }}
                    aria-label="New Read result ready"
                  />
                )}
              </div>
              <span>Read</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("warning");
                setLockedModalType("read");
              }}
              className="spring-press flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Read, locked"
            >
              <div className="relative flex items-center justify-center">
                <Compass className="size-5" />
                <Lock className="absolute -top-1 -right-1.5 size-2.5 text-primary" />
              </div>
              <span>Read</span>
            </button>
          )}

          {/* Duel Tab */}
          {tabsUnlocked.duel ? (
            <Link
              to="/duel"
              aria-current={isDuelActive ? "page" : undefined}
              onClick={() => triggerHaptic("selection")}
              className={`spring-press flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-4 text-xs font-semibold transition-colors ${
                isDuelActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Swords
                  className={`size-5 ${isDuelActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                />
              </div>
              <span>Duel</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("warning");
                setLockedModalType("duel");
              }}
              className="spring-press flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-lg px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Duel, locked"
            >
              <div className="relative flex items-center justify-center">
                <Swords className="size-5" />
                <Lock className="absolute -top-1 -right-1.5 size-2.5 text-primary" />
              </div>
              <span>Duel</span>
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
