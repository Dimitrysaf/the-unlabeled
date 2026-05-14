self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New article published', {
      body: data.body || 'A new article is live on The Unlabeled.',
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: data.url || 'https://the-unlabeled.com/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
