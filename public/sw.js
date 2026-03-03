// Minimal service worker — required for PWA install prompt on Chrome Android
const CACHE_NAME = 'rentmaestro-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Fetch handler required for PWA eligibility.
// API routes are NOT intercepted so the browser handles Set-Cookie natively.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/')) {
        // Let the browser handle API requests — preserves cookie behaviour
        return;
    }
    event.respondWith(fetch(event.request));
});
