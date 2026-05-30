self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'show-notification') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body: body,
      tag: tag || 'timetable',
      icon: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow('/');
});
