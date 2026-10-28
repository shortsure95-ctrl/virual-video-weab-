// AdStraw / Viral Videos PWA Service Worker
const CACHE_NAME = 'viral-videos-v2.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

// Install: Cache initial static shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Some static assets skipped caching:', err);
      });
    })
  );
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Fast response with Stale-While-Revalidate for app assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or Firebase API calls to allow live sync
  if (request.method !== 'GET' || url.origin.includes('firestore.googleapis.com') || url.origin.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache valid basic or cors responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return offline fallback if network fails
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
