// Drill & Tap offline cache. Bump VERSION on every release.
const VERSION = "dt-r1v";
const FILES = ["./", "index.html", "styles.css?v=r1v", "data.js?v=r1v", "calc.js?v=r1v", "app.js?v=r1v",
  "manifest.webmanifest?v=r1v", "icon.svg?v=r1v", "icon-192.png?v=r1v", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png?v=r1v"];
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
