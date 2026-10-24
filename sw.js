// Drill & Tap moved to koriware.com. This worker retires the old offline copy:
// it deletes this site's caches, unregisters itself and reloads open tabs so they get the redirect page.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url).catch(() => {});
  })());
});
