const CACHE = 'skypatrol-v23'
const ASSETS = [
  './index.html', './css/styles.css',
  './js/app.js', './js/config.js', './js/store.js', './js/naming.js', './js/docname.js',
  './js/backend.js', './js/form-sheet.js', './js/form-renderer.js', './js/completion.js',
  './js/docstatus.js', './js/sharedstore.js', './js/roster.js', './js/retention.js', './js/branchlink.js',
  './js/identity.js', './js/me-picker.js',
  './config/branches.js', './config/branch-links.js',
  './js/components/mark.js', './js/components/photo.js',
  './js/components/savebadge.js', './js/components/signature.js',
  './forms/index.js', './forms/sunhoe.js', './forms/hapdong.js', './forms/hoeuirok.js', './forms/hoeuirok_large.js',
  './manifest.webmanifest', './icons/icon.svg',
  './vendor/pdf-lib.esm.min.js', './vendor/fontkit.esm.min.js',
  './js/pdf-render.js', './js/cellmap.js', './js/grid-dims.js',
  './templates/sunhoe.pdf', './templates/hapdong.pdf', './templates/hoeuirok.pdf', './templates/hoeuirok_large.pdf',
  './fonts/NanumGothic-Regular.ttf',
]
self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
})
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
))
// 네트워크-우선: 온라인이면 항상 최신을 받고 캐시를 갱신, 오프라인이면 캐시로 폴백.
// (cache-first로 하면 config 등 변경이 안 퍼져서 옛 값이 계속 보이는 문제가 있음)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    // cache:'no-cache'=서버에 조건부 요청(ETag)으로 항상 최신 확인. 갱신이 하드리프레시 없이 반영되고,
    // 안 바뀐 대용량(폰트·템플릿)은 304로 저렴하게 넘어감. 오프라인이면 캐시로 폴백.
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
