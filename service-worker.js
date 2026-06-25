const APP_VERSION = '25';
const CACHE_NAME = `airby-v${APP_VERSION}`; // Fixed: use backticks not quotes

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

// INSTALL - AUTO ACTIVATE
self.addEventListener('install', event => {
  self.skipWaiting(); // ← ADD THIS: Activates immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Cache install failed:', err))
  );
});

// ACTIVATE - Clean old caches but DON'T claim yet
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
    // REMOVED: self.clients.claim() — prevents auto-reload
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const request = event.request;

  // HTML Pages -> Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              return response || caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Assets -> Cache First + Background Refresh
  event.respondWith(
    caches.match(request)
      .then(cached => {
        const networkFetch = fetch(request)
          .then(networkResponse => {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, networkResponse.clone());
              });
            return networkResponse;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
  );
});

// UPDATE MESSAGE
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  let data = {
    title: 'AirBy Trading Hub',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    url: '/history.html'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'airby-notification',
      requireInteraction: false,
      data: {
        url: data.url || '/history.html'
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        }
      ]
    })
  );
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/history.html';
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      for (const client of clientList) {
        if (
          client.url.startsWith(self.location.origin) &&
          'focus' in client
        ) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});