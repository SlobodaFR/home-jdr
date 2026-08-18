// Minimal service worker: just enough for PWA installability (install +
// activate + a fetch handler) and Web Push handling (push +
// notificationclick) - see tasks/06-notifications-push.md. No offline-first
// strategy is attempted (out of this task's scope): PRD.md keeps sync as
// polling against a live backend, so a cached, stale app shell is not
// useful here.

const CACHE_NAME = 'home-jdr-shell-v1';
const APP_SHELL = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first, falling back to the cached shell when offline - keeps the
// service worker's presence meaningful for installability without faking
// an offline mode this app doesn't otherwise support.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

// Payload shape sent by WebPushAdapter (backend/src/infrastructure/push-notification/web-push-adapter.ts):
// { title, body, url } - deliberately minimal/non-narrative, see CLAUDE.md.
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'home-jdr', body: event.data.text() };
  }

  const title = payload.title || 'home-jdr';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
