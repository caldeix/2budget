/**
 * Service worker de 2Budget: permite abrir la app instalada aunque no haya conexión.
 *
 * - Solo atiende peticiones GET de la propia web (dentro de su ámbito, `/2budget/`). Firebase,
 *   reCAPTCHA y cualquier otro dominio van directos a la red, sin pasar por aquí.
 * - Los ficheros de `_next/static/` llevan un hash en el nombre y nunca cambian: primero la caché.
 * - La página, el manifiesto y los iconos: primero la red, para tener siempre la última versión
 *   publicada; la caché solo se usa sin conexión. Se guardan por su ruta, sin parámetros.
 * - Nada más se guarda (3.1.2): antes cualquier GET entraba en la caché, con cualquier parámetro, y
 *   crecía sin límite. El resto va a la red sin pasar por aquí.
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

/** Ficheros sueltos de la app que se guardan para abrir sin conexión (además de la página). */
const APP_FILES = ["manifest.webmanifest", "favicon.ico", "icon1.png", "icon2.png", "apple-icon.png"]

/** Clave de caché de una petición, o `null` si no se guarda: la página y los ficheros de la app. */
function cacheKeyFor(request, url) {
  if (request.mode === "navigate") return BASE
  const file = url.pathname.slice(BASE.length)
  if (APP_FILES.includes(file) || file.startsWith("icons/")) return url.pathname
  return null
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (url.pathname.startsWith(`${BASE}_next/static/`)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request, { ignoreSearch: true })
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(url.pathname, response.clone())
        return response
      }),
    )
    return
  }

  const key = cacheKeyFor(request, url)
  if (!key) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(key, copy))
        }
        return response
      })
      .catch(async () => (await caches.match(key)) ?? Response.error()),
  )
})
