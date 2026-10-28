// AdStraw / Viral Videos PWA Service Worker - v3.0 Network First Strategy
const CACHE_NAME = 'viral-videos-v3.0';
const STATIC_ASSETS = [
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

// Install: Activate immediately without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Static asset caching skipped:', err);
      });
    })
  );
});

// Activate: Delete all previous cache versions and claim clients instantly
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('PWA: Purging outdated cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK FIRST for HTML documents & navigation to prevent stale index.html
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET or cross-origin Firebase/Ad calls
  if (request.method !== 'GET' || 
      url.origin.includes('firestore.googleapis.com') || 
      url.origin.includes('identitytoolkit') ||
      url.origin.includes('biomanos.org') ||
      url.origin.includes('benchform.org') ||
      url.origin.includes('apiguinee.org')) {
    return;
  }

  // Navigation / HTML Document requests: ALWAYS Network First!
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache ONLY if completely offline
        return caches.match(request);
      })
    );
    return;
  }

  // Static Assets (JS, CSS, images): Stale-While-Revalidate with quick network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

