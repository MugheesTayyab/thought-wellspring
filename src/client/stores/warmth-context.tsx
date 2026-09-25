import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type {
  ActionType,
  WarmthLogEntry,
  DailyCapState,
  StreakState,
  GiftMilestone,
} from "@/shared/types/warmth";
import {
  AWARD_VALUES,
  DAILY_PASSIVE_CAP,
  GIFT_MILESTONES,
} from "@/shared/constants/warmth";
import { getTodayKey, randomSeed } from "@/shared/utils";
import {
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
  writeAvatarSeed,
} from "@/client/lib/local-storage";
import { WarmthToast, type WarmthToastEvent } from "@/client/components/bajihears/WarmthToast";
import { WarmthSheet } from "@/client/components/bajihears/WarmthSheet";
import { GiftMilestoneModal } from "@/client/components/bajihears/GiftMilestone";

export interface WarmthContextType {
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
  awardWarmth: (
    action: ActionType,
    label: string,
    customAmount?: number,
    coords?: { x: number; y: number },
  ) => void;
  spendWarmth: (amount: number, label: string) => void;
  updateCallSign: (name: string) => void;
  syncWarmthTotal: (serverTotal: number) => void;
}

export const WarmthContext = createContext<WarmthContextType | null>(null);

export function useWarmth() {
  const ctx = useContext(WarmthContext);
  if (!ctx) {
    throw new Error("useWarmth must be used within a WarmthProvider");
  }
  return ctx;
}

export function WarmthProvider({ children }: { children: ReactNode }) {
  const [totalWarmth, setTotalWarmth] = useState(() => readWarmth());
  const [warmthLog, setWarmthLog] = useState<WarmthLogEntry[]>(() => readWarmthLog());
  const [dailyCap, setDailyCap] = useState<DailyCapState>(() => readDailyCap());
  const [streak, setStreak] = useState<StreakState>(() => readStreak());
  const [milestonesClaimed, setMilestonesClaimed] = useState<number[]>(() =>
    readMilestonesClaimed(),
  );
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
    const label = `Daily Visit (${newCount} day streak)`;
    if (newCount === 3) bonus = 5;
    else if (newCount === 7) bonus = 12;
    else if (newCount === 30) bonus = 30;

    awardWarmthInternal("visit", label, AWARD_VALUES.visit + bonus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const awardWarmthInternal = (
    action: ActionType,
    label: string,
    customAmount?: number,
    coords?: { x: number; y: number },
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
        : { amount: finalAmount, label },
    );

    // Check milestone unlocked
    const unlocked = GIFT_MILESTONES.find(
      (m) => newTotal >= m.threshold && !milestonesClaimed.includes(m.threshold),
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

  const spendWarmth = (amount: number, label: string) => {
    const newTotal = Math.max(0, totalWarmth - amount);
    setTotalWarmth(newTotal);
    writeWarmth(newTotal);
    const logEntry: WarmthLogEntry = {
      id: `${Date.now()}-spend`,
      action: "spend",
      amount: -amount,
      label,
      timestamp: Date.now(),
    };
    const updatedLog = [logEntry, ...warmthLog];
    setWarmthLog(updatedLog);
    writeWarmthLog(updatedLog);

    // Negative toast notification
    setToast({ amount: -amount, label });
  };

  const syncWarmthTotal = (serverTotal: number) => {
    if (typeof serverTotal === "number" && !isNaN(serverTotal) && serverTotal >= 0) {
      setTotalWarmth(serverTotal);
      writeWarmth(serverTotal);
    }
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
        spendWarmth,
        updateCallSign,
        syncWarmthTotal,
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
