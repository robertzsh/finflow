/* FinFlow service worker — offline app shell + asset caching.
   Data (Supabase / cross-origin) is never cached; it always hits the network. */
const VERSION = 'finflow-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  // Note: no skipWaiting() here — a new worker waits until the page tells it to
  // activate (via the "Update available" toast), so we never swap assets mid-session.
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // cache shell items individually so one 404 can't abort the whole install
    await Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})));
  })());
});

// The page posts this when the user clicks "Reload" on the update toast.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin: only cache Google Fonts; let everything else (Supabase, APIs) pass through.
  if (url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) event.respondWith(cacheFirst(req));
    return;
  }
  // App navigations → network-first so updates land immediately; fall back to cached shell offline.
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req)); return; }
  // Hashed static assets (js/css/img/fonts) → cache-first.
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}
