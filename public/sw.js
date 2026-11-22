/*
 * Service worker do FLUXO NEO: permite abrir o app sem internet.
 *
 * - Página (navegação): rede primeiro, para sempre pegar a versão nova; sem
 *   rede, usa a última cópia do index.html.
 * - /assets/* (arquivos com hash no nome, nunca mudam): cache primeiro.
 * - Nada de outros domínios é interceptado: as chamadas ao Supabase vão sempre
 *   direto à rede (os dados offline ficam na camada de dados do app).
 */
const SHELL = 'fluxo-shell-v2'
const ASSETS = 'fluxo-assets-v1'
const MAX_ASSETS = 120

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['/', '/logo.svg', '/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, ASSETS]
      for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            event.waitUntil(caches.open(SHELL).then((c) => c.put('/', copy)))
          }
          return res
        })
        .catch(async () => (await caches.match('/')) || Response.error()),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              event.waitUntil(
                caches
                  .open(ASSETS)
                  .then((c) => c.put(req, copy))
                  .then(() => trim(ASSETS, MAX_ASSETS)),
              )
            }
            return res
          }),
      ),
    )
    return
  }

  if (['/logo.svg', '/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'].includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)))
  }
})
