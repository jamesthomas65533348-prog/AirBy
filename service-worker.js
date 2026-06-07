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

// ===== PUSH NOTIFICATION HANDLERS - NEW CODE BELOW =====

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