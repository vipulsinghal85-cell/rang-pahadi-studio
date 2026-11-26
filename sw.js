/* Rang Pahadi Studio app: shows the newest site when online, the last saved copy when offline. */
const CACHE = 'rp-v47';
const CORE = ['/', '/index.html', '/style.css', '/app.js', '/config.js', '/qrcode.js', '/enhance.js?v=8', '/logo-192.png', '/logo-512.png', '/favicon-64.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // bookings, Google Sheet, analytics go straight to the network
  // cache:'no-cache' asks the server whether each file changed (a tiny check), so a new release shows on the next visit
  // instead of after the browser's 10-minute cache runs out
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('/') : undefined))));
});
