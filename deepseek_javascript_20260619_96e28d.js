// ============================================================
// SERVICE WORKER DISABILITATO - Solo per debug
// ============================================================

// Non fare assolutamente nulla
self.addEventListener('install', (event) => {
  console.log('[SW] Installazione saltata');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Attivazione - pulizia cache');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] Eliminata cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Non intercettare NESSUNA richiesta
self.addEventListener('fetch', (event) => {
  // Passa tutto al browser, senza cache
  return;
});