// STREAK Service Worker: Offline Caching, Background Sync, and Alarm Actions
const CACHE_NAME = 'streak-cache-v2';
const RUNTIME_CACHE = 'streak-runtime-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

// Install: Precaches the application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[ServiceWorker] Precache failed partially:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Cleans up older caches and claims clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.info('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Handles offline strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and Firestore / Firebase direct websocket/database calls
  if (request.method !== 'GET') return;
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation requests (HTML SPA fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback to cached index.html
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const rootCached = await cache.match('/');
          if (rootCached) return rootCached;
          return new Response('STREAK is currently offline. Please reconnect to load the app.', {
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Same-origin assets, scripts, stylesheets, and fonts: Stale-While-Revalidate
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isSameOrigin || isGoogleFont) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const responseToCache = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Background Sync: Prioritize synchronizing habit, task, and journal data when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'streak-background-sync' || event.tag.startsWith('streak-')) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'STREAK_BACKGROUND_SYNC_TRIGGER',
            tag: event.tag,
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Periodic Background Sync (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'streak-periodic-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'STREAK_BACKGROUND_SYNC_TRIGGER',
            tag: 'periodic',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Handle interactive notification actions (Dismiss, Snooze, Open App)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze') {
    // Post message to any open client window to apply snooze
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STREAK_ALARM_SNOOZE',
            reminderId: data.reminderId,
            snoozeMinutes: data.snoozeMinutes || 10,
          });
        }
      })
    );
    return;
  }

  if (action === 'dismiss') {
    // Post message to any open client window to dismiss
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STREAK_ALARM_DISMISS',
            reminderId: data.reminderId,
          });
        }
      })
    );
    return;
  }

  // Default tap: focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/reminders');
      }
    })
  );
});
