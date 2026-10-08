// Drill & Tap offline cache. Bump VERSION on every release.
const VERSION = "dt-de1";
const FILES = ["./", "index.html", "styles.css?v=de1", "data.js?v=de1", "calc.js?v=de1", "app.js?v=de1",
  "manifest.webmanifest?v=de1", "icon.svg?v=de1", "icon-192.png?v=de1", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png?v=de1"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so fixes show up right away), cache as the offline fallback.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then((m) => m || caches.match("index.html"))));
});
