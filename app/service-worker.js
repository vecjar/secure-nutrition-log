const CACHE_NAME = 'secure-nutrition-log-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of APP_SHELL) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (error) {
          console.warn('Skipped caching:', url, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  const isHtmlRequest =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  const isAppShellJs =
    url.pathname === '/app.js' ||
    url.pathname === '/service-worker.js';

  if (isHtmlRequest || isAppShellJs) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request, { cache: 'no-cache' });
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          throw error;
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (
        response &&
        response.status === 200 &&
        request.url.startsWith(self.location.origin)
      ) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }

      return response;
    })()
  );
});