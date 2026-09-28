// Network-first: when online, always load the latest app files so updates
// show up on the next reload. The cache is only a fallback for offline use.
// (The old cache-first version kept serving outdated CSS/JS indefinitely.)
const CACHE_NAME = 'campus-pulse-v36';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // cache: 'reload' skips the browser's HTTP cache so we never store a stale copy.
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
    self.clients.claim()
  ]));
});

// Tapping a device alert brings the app forward and opens that notification.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const nid = e.notification.data && e.notification.data.nid;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list[0];
      if (client) {
        client.postMessage({ type: 'open-notification', id: nid });
        return client.focus();
      }
      return self.clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle this app's own files; leave Supabase, fonts and CDNs alone.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || caches.match('./index.html')))
  );
});
