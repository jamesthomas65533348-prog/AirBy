const CACHE_NAME = 'airby-v7'; // ← BUMP THIS TO v7 ON NEXT UPDATE
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

// Install - cache all files (NO skipWaiting here - wait for user action)
self.addEventListener('install', event => {
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
    )).then(() => {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch - NETWORK FIRST for HTML, cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // For HTML pages: Always try network first to get fresh updates
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Save fresh version to cache
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // If offline, fallback to cache
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }
  
  // For assets (JS, CSS, images): Cache first for speed
  event.respondWith(
    caches.match(request)
      .then(response => {
        return response || fetch(request).catch(() => {
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// ===== CRITICAL: Handle update message from app =====
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting(); // Force new SW to activate when user taps "Update Now"
  }
});

// ===== PUSH NOTIFICATION HANDLERS =====

// Handle push notifications from server
self.addEventListener('push', event => {
  let data = { 
    title: 'AirBy Trading Hub', 
    body: 'You have a new update',
    icon: '/icon-192.png',
    url: '/history.html'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/history.html' },
    actions: [
      { action: 'view', title: 'View Details' }
    ],
    tag: 'airby-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/history.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it and navigate
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});