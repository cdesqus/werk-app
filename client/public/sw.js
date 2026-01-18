self.addEventListener('push', e => {
    const data = e.data.json();
    console.log('Push Received...', data);
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        data: { url: data.url }
    });
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            const url = event.notification.data.url || '/';
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
