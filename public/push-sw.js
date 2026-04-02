/**
 * Push notification event handlers for the vendor PWA service worker.
 * This file is loaded alongside the next-pwa generated service worker.
 */

// Handle incoming push notifications
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    var data = event.data.json();
    var options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      tag: data.tag || 'default',
      renotify: true,
      data: {
        url: data.url || '/vendor',
      },
      actions: [
        { action: 'open', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Calgary Oaths', options)
    );
  } catch (e) {
    // Fallback for non-JSON payloads
    event.waitUntil(
      self.registration.showNotification('Calgary Oaths', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.svg',
      })
    );
  }
});

// Handle notification click — open the app to the relevant page
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  var url = (event.notification.data && event.notification.data.url) || '/vendor';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If app is already open, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/vendor') && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
