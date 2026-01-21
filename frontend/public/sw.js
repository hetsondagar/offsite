// Service Worker for OffSite PWA
// NOTE: This app is built with Vite, so production assets live under /assets
// with hashed filenames. We pre-cache only the app shell and rely on runtime
// caching for built assets after the first online load.

const CACHE_NAME = 'offsite-v2';

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Use "reload" to avoid HTTP cache pitfalls during install.
      // Use Promise.allSettled to handle failures gracefully
      const results = await Promise.allSettled(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const request = new Request(url, { cache: 'reload' });
            const response = await fetch(request);
            if (response && response.ok) {
              await cache.put(request, response);
            } else {
              console.warn(`Failed to cache ${url}: ${response.status}`);
            }
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
            // Continue even if one resource fails
          }
        })
      );

      // Log any failures but don't block installation
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`${failures.length} resources failed to cache during install`);
      }

      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
    .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('Cache first fetch failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn('Failed to cache response:', error);
        }
      }
      return response;
    })
    .catch((error) => {
      console.warn('Stale while revalidate fetch failed:', error);
      return null;
    });

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('Failed to cache response:', error);
      }
    }
    return response;
  } catch (error) {
    console.warn('Network first fetch failed:', error);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only cache GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation requests: serve the SPA shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Prefer fresh HTML when online.
          const response = await fetch(request);
          if (response && response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put('/index.html', response.clone());
            } catch (error) {
              console.warn('Failed to cache index.html:', error);
            }
          }
          return response;
        } catch (error) {
          console.warn('Navigation fetch failed:', error);
          return (await caches.match('/index.html')) || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Same-origin only (avoid caching opaque cross-origin responses).
  if (url.origin !== self.location.origin) {
    return;
  }

  // Vite build assets: cache-first is best for fast offline reload.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Same-origin API GETs: network-first with cache fallback.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (icons, css, etc.): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request));
});

