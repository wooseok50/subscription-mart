// 오프라인 실행용 최소 서비스 워커
// 해시 파일명 자원(/assets)은 캐시 우선, 페이지는 네트워크 우선 후 캐시 대체
const CACHE = 'subscription-receipt-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const put = (req, res) => {
  if (res.ok) {
    const copy = res.clone()
    caches.open(CACHE).then((cache) => cache.put(req, copy))
  }
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // 공유 링크(#)는 서버로 가지 않으므로 '/' 하나로 캐시함
    event.respondWith(
      fetch(req)
        .then((res) => put('/', res))
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))))
  }
})
