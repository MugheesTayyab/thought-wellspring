import { useState, useEffect, useCallback, useRef } from "react";
import { useWarmth } from "@/client/stores/warmth-context";
import { readWarmth } from "@/client/lib/local-storage";
import { useDeviceToken } from "@/client/hooks/use-device-token";
import { apiSyncWarmth } from "@/routes/api/warmth";

export interface UseWarmthSyncReturn {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncNow: () => Promise<void>;
}

/**
 * Manages monotonic background reconciliation between local device warmth points
 * and the authoritative backend database profile via TanStack Start Server Function.
 */
export function useWarmthSync(): UseWarmthSyncReturn {
  const { syncWarmthTotal, totalWarmth } = useWarmth();
  const { deviceToken, isReady } = useDeviceToken();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const isSyncingRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!isReady || !deviceToken || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const localWarmth = readWarmth();
      const effectiveWarmth = Math.max(localWarmth, totalWarmth || 0);

      const result = await apiSyncWarmth({
        data: {
          deviceToken,
          localWarmth: effectiveWarmth,
        },
      });

      if (result.ok && typeof result.data.serverTotal === "number") {
        if (result.data.serverTotal > effectiveWarmth) {
          syncWarmthTotal(result.data.serverTotal);
        }
        setLastSyncedAt(Date.now());
      }
    } catch (err) {
      console.warn("[useWarmthSync] Background sync bypassed or offline:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [deviceToken, isReady, totalWarmth, syncWarmthTotal]);

  useEffect(() => {
    if (!isReady || !deviceToken) return;

    // Initial sync on mount
    syncNow();

    // Foreground listener: sync when user returns to app tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isReady, deviceToken, syncNow]);

  return { isSyncing, lastSyncedAt, syncNow };
}
