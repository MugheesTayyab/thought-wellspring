// Service worker for BajiHears web push notifications (Phase 7 - Production)
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
    icon: "/brand.svg",
    badge: "/brand.svg",
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
