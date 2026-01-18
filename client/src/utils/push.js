import api from './api';

const publicVapidKey = 'BP_AfpPlvlQ0OVm6jG6Jp4tHte37XIAvh4ICg1rY0r4_drOVdm2yUXp76-BRqAlNkgl8T8S6YIJdJB7_5FzItEM';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush() {
    if (!('serviceWorker' in navigator)) return;

    try {
        const register = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service Worker Registered...');

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        console.log('Registering Push...');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        console.log('Push Registered...');

        // Send Push Notification
        await api.post('/subscribe', subscription);
        console.log('Push Sent to Server...');
    } catch (err) {
        console.error('Error subscribing to push', err);
    }
}
