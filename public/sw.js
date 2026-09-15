// STREAK Service Worker for Background Reminders & Notification Actions

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle interactive notification actions (Dismiss, Snooze, Open App)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze') {
    // Post message to any open client window to apply snooze
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STREAK_ALARM_SNOOZE',
            reminderId: data.reminderId,
            snoozeMinutes: data.snoozeMinutes || 10,
          });
        }
      })
    );
    return;
  }

  if (action === 'dismiss') {
    // Post message to any open client window to dismiss
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STREAK_ALARM_DISMISS',
            reminderId: data.reminderId,
          });
        }
      })
    );
    return;
  }

  // Default tap: focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/reminders');
      }
    })
  );
});
