/* 安全日记本 Service Worker：仅缓存应用外壳，实现离线打开与 PWA 安装。
   注意：日记数据始终在 IndexedDB 且加密存储，绝不进入本缓存。 */
const CACHE = "secure-diary-v1";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 只处理同源请求；跨域（GitHub API 同步等）一律直连，不拦截
  if (url.origin !== self.location.origin) return;
  // 网络优先，失败回退缓存（保证日记应用离线也能打开）
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
  );
});
