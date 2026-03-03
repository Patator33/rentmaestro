// Minimal service worker — required for PWA install prompt on Chrome Android
const CACHE_NAME = 'rentmaestro-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Pass-through fetch handler (required by Chrome for PWA eligibility)
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
