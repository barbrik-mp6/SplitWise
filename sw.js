// This service worker uses a "cache-first" strategy for offline functionality.
const CACHE_NAME = 'splitease-cache-v2'; // Incremented cache version
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'app.js',
  'manifest.json'
  // Note: Do not cache external resources like Google Fonts here.
  // The browser handles caching them effectively.
];

// Install event: fires when the service worker is first installed.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event: fires after installation. Used for cleaning up old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: fires for every network request made by the page.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests for our cache-first strategy.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the request is in the cache, return the cached response.
        if (cachedResponse) {
          return cachedResponse;
        }
        // If it's not in the cache, fetch it from the network.
        return fetch(event.request);
      })
  );
});
