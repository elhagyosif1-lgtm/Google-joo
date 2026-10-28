// Jo1 Service Worker: يخزّن واجهة التطبيق فقط.
// لا يخزّن: الفيديوهات، طلبات Supabase، طلبات /api، ولا أي طلب غير GET.
const VERSION = 'jo1-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (req.destination === 'video' || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    // الصفحات: الشبكة أولاً، والكاش إذا ما فيه إنترنت
    e.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || new Response('أنت غير متصل بالإنترنت', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    );
    return;
  }
  // الملفات الثابتة (JS، CSS، صور): من الكاش أولاً ثم تحديث في الخلفية
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
