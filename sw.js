/* Forge90 Phase 1 offline cache — 2026-09-02
   Cache refresh never clears IndexedDB, the safety mirror or workout history. */
const CACHE='forge90-v20260902-weight-1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./vendor/dexie.min.js','./forge90-storage.js','./forge90-base-app.js','./forge90-session-controls.js','./forge90-enhancements.js','./forge90-weight.js','./manifest.webmanifest','./icons/forge90-logo.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));});
