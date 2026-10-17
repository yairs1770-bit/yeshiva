// Keeps a copy of the app on the phone so it opens instantly, like an installed app.
// The app's own files are served from the copy and refreshed in the background,
// so an update shows up on the next open. Class data never goes through here:
// Firebase requests are left to the browser untouched.
const CACHE = 'app-v2';
const APP_FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
// libraries and fonts at fixed versions; safe to keep once downloaded
const LIBRARY_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // every page address (with or without ?v=…) is the same app page
    const key = req.mode === 'navigate' ? new URL('./', self.location).href : req;
    event.respondWith(staleWhileRevalidate(event, key, req));
    return;
  }
  const isLibrary = LIBRARY_HOSTS.includes(url.hostname) ||
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
  if (isLibrary) event.respondWith(cacheFirst(req));
  // anything else (Firebase data, calendar API) goes to the network as usual
});

async function staleWhileRevalidate(event, key, req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key);
  const fresh = fetch(req).then(res => {
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(fresh.catch(() => {}));
    return cached;
  }
  return fresh;
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}
