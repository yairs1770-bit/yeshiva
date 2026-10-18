// Opens instantly from the copy saved on the phone, and refreshes that copy in the
// background, so an update shows up on the next open. Requests to other sites
// (Firebase, fonts, libraries) are never touched.
const CACHE = 'app-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // לא נוגעים בבקשות חיצוניות (Firebase, CDN)
  // every page address (with or without ?…) is the same app page
  const key = r.mode === 'navigate' ? new URL('./', location).href : r;
  e.respondWith(caches.open(CACHE).then(async c => {
    const saved = await c.match(key);
    const fresh = fetch(r).then(res => { if (res && res.ok) c.put(key, res.clone()).catch(() => {}); return res; });
    if (saved) { e.waitUntil(fresh.catch(() => {})); return saved; }
    return fresh.catch(() => c.match('index.html'));
  }));
});
