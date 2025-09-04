/*
  Service Worker for המטבח של מעיין
  - Cache-first for static assets
  - Network-first for HTML and API data
  - Offline fallback
*/

const SW_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-cache-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-cache-${SW_VERSION}`;
const API_CACHE = `api-cache-${SW_VERSION}`;

// Core files to precache (avoid hashed assets; cache them at runtime)
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (!key.includes(SW_VERSION)) return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML navigations: network-first with offline fallback
  if (isHtmlRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Optionally update runtime cache
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // API data: network-first, cache on success, fallback to cache
  if (isApiRequest(url)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(API_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
        }
      })()
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          return response;
        }).catch(() => caches.match('/offline.html'));
      })
    );
    return;
  }
});

// Listen for manual cache update messages
self.addEventListener('message', event => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


