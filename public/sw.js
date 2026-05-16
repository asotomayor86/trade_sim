const CACHE = "trade_sim_v1"
const STATIC = [
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
]

// ── Instalación: pre-cachear assets estáticos ─────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  )
  self.skipWaiting()
})

// ── Activación: limpiar cachés antiguas ───────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first para API/páginas, cache-first para assets ────────
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar mismo origen
  if (url.origin !== self.location.origin) return

  // API routes → network-first, sin caché
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request).catch(() => new Response("", { status: 503 }))
    )
    return
  }

  // Páginas de app → network-first, fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    )
    return
  }

  // Assets estáticos → cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return response
      })
    )
  )
})

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "trade_sim", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: "/app/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow("/app/dashboard")
    })
  )
})
