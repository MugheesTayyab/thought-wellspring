// Web push notification utilities with safe SSR fallbacks
// // LATER: backend — store push subscription endpoint on server for scheduled delivery

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    markPushPromptShown();
    return permission === "granted";
  } catch {
    return false;
  }
}

export function hasPushPermission(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

const PUSH_PROMPT_KEY = "bh:pushPromptShown";

export function shouldShowPushPrompt(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  const alreadyShown = localStorage.getItem(PUSH_PROMPT_KEY);
  return !alreadyShown && Notification.permission === "default";
}

export function markPushPromptShown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PUSH_PROMPT_KEY, "true");
  } catch {
    // quota
  }
}
