/**
 * Service Worker：只做「静态资源离线可用」，不碰接口，避免拿到旧数据
 *
 * 策略：
 * - 导航请求（打开页面）：网络优先，断网时回退缓存的 index.html
 * - 带 hash 的静态资源（js/css/图标）：缓存优先，文件名变了就是新文件，不会脏
 * - /api/* ：完全不拦截，永远走网络
 * - /index.html：不缓存（交给 nginx 的 no-cache，保证发版后立刻生效）
 */
const CACHE = 'vocab-agent-static-v1'

self.addEventListener('install', () => {
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

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  // 接口与 HTML 入口不做缓存
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname === '/index.html' || url.pathname === '/') return

  // 页面导航：网络优先，断网回退到缓存的首页
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // 静态资源：缓存优先
  if (/\.(js|css|png|jpe?g|gif|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
