// ============================================================
// Rentmaestro Service Worker — v3
// Strategies:
//   App shell (HTML + icons + manifest) → Cache on install
//   Navigation (HTML pages)            → Network-first, cache fallback
//   _next/static assets                → Cache-first (immutable hashes)
//   API routes                         → Network only (cookies must flow natively)
//   Push notifications                 → Show notification with click handler
// ============================================================

const SHELL_CACHE  = 'rentmaestro-shell-v3';
const PAGES_CACHE  = 'rentmaestro-pages-v3';
const STATIC_CACHE = 'rentmaestro-static-v3';

const SHELL_URLS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// ---- INSTALL -----------------------------------------------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) =>
            Promise.allSettled(
                SHELL_URLS.map((url) =>
                    cache.add(url).catch((err) =>
                        console.warn('[SW] Failed to cache:', url, err)
                    )
                )
            )
        ).then(() => self.skipWaiting())
    );
});

// ---- ACTIVATE ----------------------------------------------
self.addEventListener('activate', (event) => {
    const CURRENT = [SHELL_CACHE, PAGES_CACHE, STATIC_CACHE];
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))
            ))
            .then(() => clients.claim())
    );
});

// ---- FETCH -------------------------------------------------
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. API routes → browser handles natively (cookies, Set-Cookie preserved)
    if (url.pathname.startsWith('/api/')) return;

    // 2. Immutable hashed assets → cache-first
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // 3. Navigation → network-first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNav(request));
        return;
    }

    // 4. Other same-origin assets (icons, fonts, images) → cache-first
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request, SHELL_CACHE));
        return;
    }
    // 5. Cross-origin → network only
});

// ---- STRATEGIES --------------------------------------------
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        return new Response('Indisponible hors ligne', { status: 503 });
    }
}

async function networkFirstNav(request) {
    const cache = await caches.open(PAGES_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        const home = await caches.match('/');
        if (home) return home;
        const offline = await caches.match('/offline.html');
        return offline || new Response('<h1>Hors ligne</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 503,
        });
    }
}

// ---- PUSH NOTIFICATIONS ------------------------------------
self.addEventListener('push', (event) => {
    let data = { title: 'Rentmaestro', body: 'Nouvelle notification', url: '/' };
    if (event.data) {
        try { data = { ...data, ...event.data.json() }; }
        catch { data.body = event.data.text(); }
    }
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: data.url },
            vibrate: [200, 100, 200],
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const existing = list.find((c) => c.url.includes(url) && 'focus' in c);
            if (existing) return existing.focus();
            return clients.openWindow(url);
        })
    );
});
