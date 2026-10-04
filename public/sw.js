// SafirPass Service Worker: Web Push Notifications for Critical Advisories & Safety Radar

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "SafirPass Tourist Safety Alert", body: event.data.text() };
    }
  }

  const title = data.title || "SafirPass National Tourist Safety Advisory";
  const options = {
    body: data.body || "A new critical tourist advisory or complaint update was issued.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    vibrate: [200, 100, 200, 100, 400],
    tag: data.tag || "safirpass-safety-advisory",
    renotify: true,
    data: {
      url: data.url || "/dashboard/complaints",
      timestamp: Date.now(),
    },
    actions: [
      { action: "open_view", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/dashboard/complaints";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
