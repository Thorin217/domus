// Service worker de Domus: recibe las notificaciones aunque la app esté cerrada.
// Sin caché offline a propósito: los datos siempre vienen en vivo de Firestore.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = datos.titulo || "Domus";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: datos.tag || undefined,
      renotify: !!datos.tag,
      data: { url: datos.url || "/inicio" },
      lang: "es",
    }),
  );
});

// Al tocarla: enfoca Domus si ya está abierta (y navega), o la abre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/inicio", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin) {
          await v.focus();
          if ("navigate" in v) await v.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// Si el navegador renueva la suscripción, se avisa a la app para que la guarde de nuevo.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((vs) => vs.forEach((v) => v.postMessage({ tipo: "push-renovar" }))),
  );
});
