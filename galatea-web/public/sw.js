// Service worker básico: guarda la "cáscara" de la app para que abra rápido y sin conexión,
// y las fotos del menú (Supabase Storage) para que en la segunda visita aparezcan al instante.
// Los datos de la API (menú, cuenta, reservas) no se cachean: tienen que estar al día.
const CACHE = 'galatea-shell-v2'
const CACHE_FOTOS = 'galatea-fotos-v1'
const SHELL = ['/', '/manifest.webmanifest', '/animated-logo.webm', '/logo.jpg', '/icons/icon-192.png']

// Fotos públicas del bucket de Supabase
const ES_FOTO = (url) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')
// Las 62 fotos del menú pesan ~2 MB en total; el tope deja lugar para las de empleados y las que se cambien
const MAX_FOTOS = 150

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  const vigentes = [CACHE, CACHE_FOTOS]
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !vigentes.includes(k)).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)
  if (request.method !== 'GET') return

  if (ES_FOTO(url)) {
    e.respondWith(foto(e, request))
    return
  }

  // La API nunca se cachea: el menú, la cuenta y las reservas tienen que estar al día
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  // Navegación: red primero y, si no hay conexión, la app cacheada (SPA)
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})

/**
 * Fotos: stale-while-revalidate. Si está guardada se muestra al instante y se
 * actualiza en segundo plano (por si cambiaron la foto con el mismo nombre);
 * si no, se baja y se guarda. Solo se guardan respuestas CORS correctas: las
 * opacas (status 0) no se sabe si son un error y ocupan mucha cuota.
 */
async function foto(evento, request) {
  const cache = await caches.open(CACHE_FOTOS)
  const guardada = await cache.match(request)

  const red = fetch(request)
    .then(async (res) => {
      if (res.ok && res.type === 'cors') {
        await cache.put(request, res.clone())
        await recortar(cache)
      }
      return res
    })
    .catch(() => null)

  if (guardada) {
    evento.waitUntil(red)
    return guardada
  }
  return (await red) ?? Response.error()
}

/** Borra las más viejas si se pasa del tope (cache.keys() devuelve en orden de inserción). */
async function recortar(cache) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_FOTOS)).map((k) => cache.delete(k)))
}
