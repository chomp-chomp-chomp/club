// Club Chomp Service Worker
const CACHE_NAME = 'club-chomp-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});

// Push event - show notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    // Validate payload version
    if (payload.v !== 1 || payload.kind !== 'pulse') {
      console.warn('Invalid push payload:', payload);
      return;
    }

    const options = {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: payload.pulse_id,
      data: {
        url: payload.url,
        pulse_id: payload.pulse_id,
        pulse_type: payload.type,
      },
      requireInteraction: false,
      silent: false,
    };

    // Notify active clients about pending sound
    event.waitUntil(
      notifyClientsOfSound(payload.type).then(() =>
        self.registration.showNotification(payload.title, options)
      )
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

// Notify clients to store pending sound
async function notifyClientsOfSound(type) {
  if (!type) return;
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'PENDING_SOUND', sound: type });
  }
}

// Notification click - open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
    }).then((subscription) => {
      // Re-register with server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
    })
  );
});
