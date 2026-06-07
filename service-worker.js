const CACHE_NAME = 'airby-v3'; // bumped to v3 to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/splash.html',
  '/login.html',
  '/signup.html',
  '/otp.html',
  '/deposit.html',
  '/withdraw.html',
  '/history.html',
  '/history-details.html',
  '/tokens.html',
  '/total-assets.html',
  '/profile.html',
  '/admin.html',
  '/maintain-control.html',
  '/config.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install - cache all files
self.addEventListener('install', event => {
  self.skipWaiting(); // activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('AirBy: Caching app files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('AirBy: Cache failed', err);
      })
  );
});

// Fetch - serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // If offline and page not cached, show index
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Activate - delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('AirBy: Deleting old cache', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});