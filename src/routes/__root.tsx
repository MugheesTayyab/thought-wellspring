import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, createContext, useContext, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  ActionType,
  AWARD_VALUES,
  DAILY_PASSIVE_CAP,
  GIFT_MILESTONES,
  GiftMilestone,
  getTodayKey,
} from "../lib/warmth";
import {
  WarmthLogEntry,
  DailyCapState,
  StreakState,
  readWarmth,
  writeWarmth,
  readWarmthLog,
  writeWarmthLog,
  readDailyCap,
  writeDailyCap,
  readStreak,
  writeStreak,
  readMilestonesClaimed,
  writeMilestonesClaimed,
  readCallSign,
  writeCallSign,
  readAvatarSeed,
  randomSeed,
  writeAvatarSeed,
} from "../lib/bajihears";
import { WarmthToast, WarmthToastEvent } from "../components/bajihears/WarmthToast";
import { WarmthSheet } from "../components/bajihears/WarmthSheet";
import { GiftMilestoneModal } from "../components/bajihears/GiftMilestone";

interface WarmthContextType {
  totalWarmth: number;
  warmthLog: WarmthLogEntry[];
  dailyCap: DailyCapState;
  streak: StreakState;
  milestonesClaimed: number[];
  callSign: string | null;
  avatarSeed: string;
  isFlashingOrb: boolean;
  isSheetOpen: boolean;
  openWarmthSheet: () => void;
  closeWarmthSheet: () => void;
  awardWarmth: (action: ActionType, label: string, customAmount?: number, coords?: { x: number; y: number }) => void;
  updateCallSign: (name: string) => void;
}

const WarmthContext = createContext<WarmthContextType | null>(null);

export function useWarmth() {
  const ctx = useContext(WarmthContext);
  if (!ctx) {
    throw new Error("useWarmth must be used within a WarmthProvider");
  }
  return ctx;
}

function WarmthProvider({ children }: { children: ReactNode }) {
  const [totalWarmth, setTotalWarmth] = useState(() => readWarmth());
  const [warmthLog, setWarmthLog] = useState<WarmthLogEntry[]>(() => readWarmthLog());
  const [dailyCap, setDailyCap] = useState<DailyCapState>(() => readDailyCap());
  const [streak, setStreak] = useState<StreakState>(() => readStreak());
  const [milestonesClaimed, setMilestonesClaimed] = useState<number[]>(() => readMilestonesClaimed());
  const [callSign, setCallSign] = useState<string | null>(() => readCallSign());
  const [avatarSeed, setAvatarSeed] = useState<string>(() => {
    let seed = readAvatarSeed();
    if (!seed) {
      seed = randomSeed();
      writeAvatarSeed(seed);
    }
    return seed;
  });

  const [toast, setToast] = useState<WarmthToastEvent | null>(null);
  const [isFlashingOrb, setIsFlashingOrb] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<GiftMilestone | null>(null);

  // Daily visit streak check
  useEffect(() => {
    const today = getTodayKey();
    const currentStreak = readStreak();

    if (currentStreak.lastVisitDate === today) return; // already visited today

    let newCount = 1;
    if (currentStreak.lastVisitDate) {
      const lastDate = new Date(currentStreak.lastVisitDate);
      const todayDate = new Date(today);
      const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        newCount = currentStreak.count + 1;
      }
    }

    const updatedStreak = { count: newCount, lastVisitDate: today };
    setStreak(updatedStreak);
    writeStreak(updatedStreak);

    // Calculate streak bonus
    let bonus = 0;
    let label = `Daily Visit (${newCount} day streak)`;
    if (newCount === 3) bonus = 5;
    else if (newCount === 7) bonus = 12;
    else if (newCount === 30) bonus = 30;

    awardWarmthInternal("visit", label, AWARD_VALUES.visit + bonus);
  }, []);

  const awardWarmthInternal = (
    action: ActionType,
    label: string,
    customAmount?: number,
    coords?: { x: number; y: number }
  ) => {
    const baseAmount = customAmount ?? AWARD_VALUES[action];
    const today = getTodayKey();

    let currentCap = dailyCap;
    if (currentCap.dateKey !== today) {
      currentCap = { dateKey: today, amountEarned: 0 };
    }

    let finalAmount = baseAmount;

    // Apply cap for passive actions (react & duel)
    if (action === "react" || action === "duel") {
      const remainingCap = Math.max(0, DAILY_PASSIVE_CAP - currentCap.amountEarned);
      finalAmount = Math.min(baseAmount, remainingCap);
      if (finalAmount <= 0) return; // capped out

      currentCap.amountEarned += finalAmount;
      setDailyCap(currentCap);
      writeDailyCap(currentCap);
    }

    const newTotal = totalWarmth + finalAmount;
    setTotalWarmth(newTotal);
    writeWarmth(newTotal);

    const logEntry: WarmthLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      amount: finalAmount,
      label,
      timestamp: Date.now(),
    };
    const updatedLog = [logEntry, ...warmthLog];
    setWarmthLog(updatedLog);
    writeWarmthLog(updatedLog);

    // Flash & particle toast
    setIsFlashingOrb(true);
    setTimeout(() => setIsFlashingOrb(false), 1200);

    setToast(
      coords
        ? { amount: finalAmount, label, x: coords.x, y: coords.y }
        : { amount: finalAmount, label }
    );

    // Check milestone unlocked
    const unlocked = GIFT_MILESTONES.find(
      (m) => newTotal >= m.threshold && !milestonesClaimed.includes(m.threshold)
    );
    if (unlocked && !activeMilestone) {
      setActiveMilestone(unlocked);
    }
  };

  const handleClaimMilestone = () => {
    if (!activeMilestone) return;
    const updated = [...milestonesClaimed, activeMilestone.threshold];
    setMilestonesClaimed(updated);
    writeMilestonesClaimed(updated);
    setActiveMilestone(null);
  };

  const updateCallSign = (name: string) => {
    setCallSign(name);
    writeCallSign(name);
  };

  return (
    <WarmthContext.Provider
      value={{
        totalWarmth,
        warmthLog,
        dailyCap,
        streak,
        milestonesClaimed,
        callSign,
        avatarSeed,
        isFlashingOrb,
        isSheetOpen,
        openWarmthSheet: () => setIsSheetOpen(true),
        closeWarmthSheet: () => setIsSheetOpen(false),
        awardWarmth: awardWarmthInternal,
        updateCallSign,
      }}
    >
      {children}

      {/* Floating Particle Toast */}
      <WarmthToast toast={toast} onDone={() => setToast(null)} />

      {/* Bottom Sheet Drawer */}
      <WarmthSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        totalWarmth={totalWarmth}
        warmthLog={warmthLog}
        dailyCap={dailyCap}
        streak={streak}
        milestonesClaimed={milestonesClaimed}
        callSign={callSign}
        onUpdateCallSign={updateCallSign}
        avatarSeed={avatarSeed}
      />

      {/* Milestone Unlock Celebration Modal */}
      <GiftMilestoneModal
        milestone={activeMilestone}
        avatarSeed={avatarSeed}
        onClaim={handleClaimMilestone}
      />
    </WarmthContext.Provider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BajiHears" },
      { name: "description", content: "Say the unsaid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600&family=Playfair+Display:ital,wght@1,600;1,700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <WarmthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </WarmthProvider>
    </QueryClientProvider>
  );
}

