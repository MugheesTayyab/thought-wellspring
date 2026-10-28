// Service worker for BajiHears web push notifications (Phase 7 - Production)
const OFFLINE_CACHE = "bajihears-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add("/offline.html")).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("bajihears-offline-") && key !== OFFLINE_CACHE).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  // Cache only the generic offline shell, never accounts, feeds or responses.
  event.respondWith(fetch(event.request).catch(async () => {
    const fallback = await caches.match("/offline.html");
    return fallback || new Response("You are offline. Reconnect and try again.", { status: 503 });
  }));
});
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "The new winner is in ✨";
  const options = {
    body: data.body || "Someone won the daily crown. Check it out on BajiHears.",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag || "bajihears-winner",
    renotify: true,
    silent: false,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      winnerId: data.winnerId || null,
      timestamp: data.cycleTimestamp || Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = new URL(event.notification.data?.url || "/", self.location.origin);
  const targetPath = candidate.origin === self.location.origin ? candidate.href : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing tab is open on this origin, focus it and navigate
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetPath);
          }
          return client.focus();
        }
      }

      // 2. Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    }),
  );
});
