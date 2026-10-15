// Minimal service worker so Chrome treats the site as an installable app.
// It does not cache anything: requests go to the network exactly as before.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  // leave other sites (Firebase, fonts, libraries) to the browser untouched
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});
