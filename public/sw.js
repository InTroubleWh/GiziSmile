const CACHE_NAME = "gizismile-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/z-score",
  "/recipes",
  "/children",
  "/analytics",
  "/manifest.json",
  "/favicon.ico"
];

// Install: Cache aset inti aplikasi (app shell)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(async () => {
        // Coba temukan URL yang tepat dari cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Jika request navigasi (pindah halaman), cari cache berdasarkan path
        if (event.request.mode === "navigate") {
          const url = new URL(event.request.url);
          const pathMatch = await caches.match(url.pathname);
          if (pathMatch) return pathMatch;
        }

        return new Response("Aplikasi sedang luring (offline)", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
