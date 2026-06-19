// ============================================================
// INSTALLAZIONE - Cache dei file essenziali
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installazione in corso...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aperta, salvataggio assets...');
        // Salva solo file statici esistenti
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css',
          '/app.js',
          '/products.js',
          '/manifest.json'
        ]);
        // RIMUOVI firebase-config.js dalla cache
      })
      .then(() => {
        console.log('[SW] Assets salvati in cache');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Errore durante installazione:', error);
      })
  );
});