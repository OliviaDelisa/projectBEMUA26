// ============================================================
// FILE INI: taruh di folder  public/sw.js
// (sama levelnya dengan public/index.html)
// ============================================================

// Tangkap event push dari server
self.addEventListener("push", (event) => {
  const data = event.data.json();

  // Tampilkan notifikasi di perangkat
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon  || "/logobem.png",
      badge: "/logobem.png",
      data:  { url: data.url || "/" },
      // Agar notif tidak langsung hilang di Android
      requireInteraction: false,
    })
  );
});

// Saat user klik notifikasi → buka halaman yang sesuai
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifikasi";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});