const CACHE = 'timetable-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/timetable.js',
  '/js/settings.js',
  '/js/notifications.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'show-notification') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: e.data.tag || 'timetable',
      icon: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then((cs) => {
    if (cs[0]) { cs[0].focus(); return; }
    clients.openWindow('/');
  }));
});
