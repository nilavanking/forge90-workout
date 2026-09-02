/* Forge90 service worker refresh — 2026-09-01
   Clears prior app-shell caches so the enhancement loader is not masked by the Aug 31 cache.
   It does not touch localStorage or workout history. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503, headers: {'Content-Type':'text/plain'} })));
});
