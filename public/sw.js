/**
 * Service worker de 2Budget: permite abrir la app instalada aunque no haya conexión.
 *
 * - Solo atiende peticiones GET de la propia web (dentro de su ámbito, `/2budget/`). Firebase,
 *   reCAPTCHA y cualquier otro dominio van directos a la red, sin pasar por aquí.
 * - Los ficheros de `_next/static/` llevan un hash en el nombre y nunca cambian: primero la caché.
 * - Todo lo demás (la página, el manifiesto, los iconos): primero la red, para tener siempre la
 *   última versión publicada; la caché solo se usa sin conexión.
 * - Cada versión de la app tiene su propia caché (`?v=` al registrarlo): al activarse una nueva,
 *   se borran las anteriores.
 */

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev"
const CACHE = `2budget-${VERSION}`
const BASE = new URL(self.registration.scope).pathname

/**
 * Al instalarse guarda la portada y los ficheros que carga (los que aparecen en su HTML): la
 * primera visita los descarga antes de que este service worker controle la página, así que si no,
 * la app no abriría sin conexión hasta la segunda visita.
 */
async function precache() {
  const cache = await caches.open(CACHE)
  const response = await fetch(BASE, { cache: "no-cache" })
  if (!response.ok) return
  const html = await response.clone().text()
  await cache.put(BASE, response)
  // Rutas como /2budget/_next/static/chunks/app/page-1a2b3c.js o .../media/fuente.woff2
  const found = html.match(/\/[\w.\/-]*_next\/static\/[\w.\/-]+/g) || []
  const assets = [...new Set(found)].filter((url) => url.startsWith(`${BASE}_next/static/`))
  await cache.addAll(assets)
  // Las fuentes no salen en el HTML sino en el CSS.
  for (const css of assets.filter((url) => url.endsWith(".css"))) {
    const text = await (await cache.match(css)).text()
    const fonts = text.match(/\/[\w.\/-]*_next\/static\/media\/[\w.\/-]+/g) || []
    await cache.addAll([...new Set(fonts)].filter((url) => url.startsWith(BASE)))
  }
}

self.addEventListener("install", (event) => {
  // Si falla (p. ej. sin conexión), se instala igual: se irá llenando con el uso.
  event.waitUntil(
    precache()
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (url.pathname.startsWith(`${BASE}_next/static/`)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // Sin conexión y sin esa página en caché: la portada (la app es una sola página).
        if (request.mode === "navigate") {
          const home = await caches.match(BASE)
          if (home) return home
        }
        return Response.error()
      }),
  )
})
