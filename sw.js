const CACHE = 'skypatrol-v3'
const ASSETS = [
  './index.html', './css/styles.css',
  './js/app.js', './js/config.js', './js/store.js', './js/naming.js', './js/docname.js',
  './js/backend.js', './js/form-renderer.js', './js/completion.js', './config/branches.js',
  './js/components/mark.js', './js/components/photo.js',
  './js/components/savebadge.js', './js/components/signature.js',
  './forms/index.js', './forms/sunhoe.js', './forms/hapdong.js', './forms/hoeuirok.js',
  './manifest.webmanifest', './icons/icon.svg',
  './vendor/pdf-lib.esm.min.js', './vendor/fontkit.esm.min.js',
  './js/pdf-render.js', './js/cellmap.js', './js/grid-dims.js',
  './templates/sunhoe.pdf', './templates/hapdong.pdf', './templates/hoeuirok.pdf',
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
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
))
