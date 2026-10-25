// Service worker for the installed app. Pages always come from the network
// when it's there (so updates show straight away), with the last copy as an
// offline fallback. Built files have a hash in their name, so those are served
// from the cache. Supabase and other sites are never touched.
// both simulators share this site's cache storage, so each only cleans up its own
const PREFIX = 'app-__BRAND__-'
const CACHE = `${PREFIX}__BUILD__`

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith(PREFIX)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // only this app's own files: each simulator has its own service worker, and
  // the Smiski one lives in /smiski/ inside the Sonny Angel one's folder
  const scope = new URL('./', self.location).pathname
  const own = url.pathname.startsWith(scope) && !(url.pathname.startsWith(`${scope}smiski/`) && !scope.endsWith('/smiski/'))
  if (req.method !== 'GET' || url.origin !== self.location.origin || !own) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
