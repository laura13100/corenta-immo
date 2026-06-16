// Service Worker minimal — requis pour que Chrome affiche le bouton d'installation PWA
const CACHE = "corenta-v1"

self.addEventListener("install", e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(["/", "/index.html"])
    )
  )
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", e => {
  // Réseau en priorité, cache en fallback pour les navigations
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    )
  }
})
