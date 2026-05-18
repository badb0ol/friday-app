// Network-first service worker — always fetches fresh content, falls back to cache offline
const CACHE = 'friday-v4'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  // Wipe all old caches on every new deploy
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  // Never cache API calls
  if (e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('api.github.com') ||
      e.request.url.includes('strava.com') ||
      e.request.url.includes('googleapis.com')) return

  // Network-first: try network, cache the response, fall back to cache if offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
