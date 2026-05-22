/* ============================================================================
   Bloque — Service Worker
   ----------------------------------------------------------------------------
   Responsable de MOSTRAR notificaciones (las dispara el timer de la app desde
   la página) y de manejar el clic sobre ellas para enfocar la app. No cachea
   recursos: Bloque es una app personal y siempre se quiere la última versión.
   ============================================================================ */

self.addEventListener('install', (event) => {
  // Activa esta versión del SW de inmediato, sin esperar a recargar pestañas.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Al tocar la notificación: enfocar una pestaña de Bloque o abrir una nueva. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
      return undefined;
    }),
  );
});
