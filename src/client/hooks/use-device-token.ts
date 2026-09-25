import { useState, useEffect } from "react";
import { getOrCreateIdentity } from "@/client/lib/identity";

export interface UseDeviceTokenReturn {
  deviceToken: string;
  isReady: boolean;
}

/**
 * Encapsulates device identity resolution, guarantees SSR safety,
 * and maintains synchronized deviceToken state across multiple browser tabs.
 */
export function useDeviceToken(): UseDeviceTokenReturn {
  const [deviceToken, setDeviceToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return getOrCreateIdentity().deviceToken;
    } catch {
      return "";
    }
  });

  const [isReady, setIsReady] = useState<boolean>(() => {
    return typeof window !== "undefined" && Boolean(deviceToken);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Resolve identity on mount if not yet initialized
    try {
      const id = getOrCreateIdentity();
      if (id.deviceToken) {
        setDeviceToken(id.deviceToken);
        setIsReady(true);
      }
    } catch (err) {
      console.error("[useDeviceToken] Initialization error:", err);
    }

    // Sync across browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "bh:identity" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.deviceToken && parsed.deviceToken !== deviceToken) {
            setDeviceToken(parsed.deviceToken);
          }
        } catch {
          // Ignore parse errors from concurrent writes
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [deviceToken]);

  return { deviceToken, isReady };
}
