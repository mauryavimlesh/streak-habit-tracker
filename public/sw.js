// STREAK Service Worker: High-Reliability PWA Engine
// Supports Versioned Precaching, Stale-While-Revalidate for Assets, Network-First for Navigation,
// Safe Controlled Updates, Background Sync, and Notification Actions.

const CACHE_VERSION = 'streak-v3.2';
const PRECACHE_NAME = `streak-precache-${CACHE_VERSION}`;
const STATIC_CACHE = `streak-static-${CACHE_VERSION}`;
const PAGES_CACHE = `streak-pages-${CACHE_VERSION}`;
const FONT_CACHE = 'streak-fonts-v1';

const EXPECTED_CACHES = [PRECACHE_NAME, STATIC_CACHE, PAGES_CACHE, FONT_CACHE];

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

// Install: Precaches the application shell.
// Only skip waiting immediately if this is the very first install (no active controller).
// On updates, we wait until the client requests SKIP_WAITING to avoid breaking open sessions.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[ServiceWorker] Precache partial warning:', err);
        });
      })
      .then(() => {
        // If there is no active service worker controlling clients, activate immediately
        if (!self.registration.active) {
          return self.skipWaiting();
        }
      })
  );
});

// Activate: Clean up all obsolete caches and claim existing clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!EXPECTED_CACHES.includes(cacheName)) {
              console.info('[ServiceWorker] Purging deprecated cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message listener: Handle client commands (e.g. SKIP_WAITING for updates)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.info('[ServiceWorker] SKIP_WAITING signal received from client. Activating new worker.');
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'VERSION_RESPONSE',
        version: CACHE_VERSION,
      });
    }
  }
});

// Fetch: Strategy-driven asset handling
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only process GET requests
  if (request.method !== 'GET') return;

  // 2. Only process HTTP/HTTPS schemes (ignore chrome-extension, blob, etc.)
  if (!url.protocol.startsWith('http')) return;

  // 3. STRICT BYPASS: Never cache dynamic API routes, AI Coach, Plan Extraction, or Server health
  if (url.pathname.startsWith('/api/')) return;

  // 4. STRICT BYPASS: Never cache Firebase, Firestore, Google Auth, or third-party analytical endpoints
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('apis.google.com') ||
    url.hostname.includes('vercel-insights') ||
    url.hostname.includes('analytics.google.com') ||
    (url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com'))
  ) {
    return;
  }

  // 5. Navigation Requests (HTML SPA Fallback): Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(PAGES_CACHE).then((cache) => {
              cache.put('/index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Attempt serving cached SPA entry point
          const pagesCache = await caches.open(PAGES_CACHE);
          const cachedPage = await pagesCache.match('/index.html');
          if (cachedPage) return cachedPage;

          const precache = await caches.open(PRECACHE_NAME);
          const precachedIndex = await precache.match('/index.html');
          if (precachedIndex) return precachedIndex;

          const precachedRoot = await precache.match('/');
          if (precachedRoot) return precachedRoot;

          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><title>STREAK Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#0d0e12;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;"><div><h1 style="color:#a5ff36;font-size:24px;margin-bottom:12px;">STREAK Offline</h1><p style="color:#8e95a5;font-size:14px;max-width:320px;margin:0 auto 20px;">Please check your internet connection to load new app updates.</p><button onclick="window.location.reload()" style="background:#a5ff36;color:#000;border:none;padding:10px 20px;border-radius:12px;font-weight:700;font-size:13px;cursor:pointer;">Retry</button></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 6. Google Fonts (Cache-First)
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isGoogleFont) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(FONT_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }

  // 7. Same-origin Static Assets & Images: Stale-While-Revalidate
  const isSameOrigin = url.origin === self.location.origin;
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const copy = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, copy);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Background Sync: Prioritize synchronizing offline mutations when online
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
        return self.clients.openWindow('/');
      }
    })
  );
});
