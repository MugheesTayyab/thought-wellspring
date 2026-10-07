// Web push notification utilities with safe SSR fallbacks and real VAPID subscription delivery
import { apiSavePushSubscription } from "@/routes/api/notifications";

const PUSH_PROMPT_KEY = "bh:pushPromptShown";
const PUSH_ENABLED_KEY = "bh:pushEnabled";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[Push] Service worker registration failed:", err);
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) {
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
  if (!isPushSupported()) {
    return false;
  }
  return Notification.permission === "granted";
}

export function shouldShowPushPrompt(): boolean {
  if (!isPushSupported()) {
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

/**
 * Converts a URL-safe Base64 string to a Uint8Array for PushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Safely converts an ArrayBuffer to a URL-safe Base64 string
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SubscribePushOptions {
  deviceToken?: string;
  jwt?: string;
}

/**
 * Subscribes the current device to Web Push and transmits the keys to the server
 */
export async function subscribeDeviceToPush(
  options: SubscribePushOptions = {}
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Web push is not supported in this browser." };
  }

  try {
    // 1. Ensure permission is granted
    if (Notification.permission !== "granted") {
      const granted = await requestPushPermission();
      if (!granted) {
        return { success: false, error: "Notification permission denied by user." };
      }
    }

    // 2. Retrieve service worker registration
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }
    if (!registration) {
      return { success: false, error: "Failed to initialize service worker registration." };
    }

    // Wait until service worker is active
    await navigator.serviceWorker.ready;

    // 3. Resolve VAPID Public Key
    const vapidPublicKey =
      import.meta.env.VITE_VAPID_PUBLIC_KEY ||
      "BC2J76RtDSeeFuYN3VnrvChrz3qKHVD_bhO1eKaFHl3RO5dz3CUA8JOMIoicqBQG5XBrE1WvriUXP5RDAOmugsI";

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe or retrieve existing subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    // 5. Extract cryptographic keys
    const p256dhKey = subscription.getKey("p256dh");
    const authKey = subscription.getKey("auth");

    const p256dh = arrayBufferToBase64Url(p256dhKey);
    const auth = arrayBufferToBase64Url(authKey);

    if (!p256dh || !auth) {
      return { success: false, error: "Failed to derive client encryption keys." };
    }

    // 6. Transmit to server function
    const deviceToken =
      options.deviceToken ||
      localStorage.getItem("bh:device_token") ||
      crypto.randomUUID();

    const result = await apiSavePushSubscription({
      data: {
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh,
            auth,
          },
        },
        deviceToken,
        jwt: options.jwt,
        userAgent: navigator.userAgent,
      },
    });

    if (result && "success" in result && !result.success) {
      return { success: false, error: result.error?.message || "Server rejected subscription." };
    }

    localStorage.setItem(PUSH_ENABLED_KEY, "true");
    markPushPromptShown();
    return { success: true };
  } catch (err: any) {
    console.error("[Push] Exception subscribing device:", err);
    return { success: false, error: err.message || String(err) };
  }
}
