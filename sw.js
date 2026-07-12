/* BronchiNet Service Worker
 * 方針: ページ本体は「ネットワーク優先」— 毎日の更新を即反映し、
 *        オフライン時のみキャッシュを返す。アイコン等の静的資産はキャッシュ優先。
 */
const CACHE = "bronchinet-v1";
const STATIC_ASSETS = ["./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // ページ本体（ナビゲーション）: ネットワーク優先 → 成功したらキャッシュ更新 → 失敗時キャッシュ
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("./")))
    );
    return;
  }

  // 静的資産: キャッシュ優先 → 無ければネットワーク（取得後キャッシュ）
  e.respondWith(
    caches.match(req).then(
      (m) =>
        m ||
        fetch(req).then((res) => {
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
