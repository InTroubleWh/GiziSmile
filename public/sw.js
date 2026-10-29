const CACHE_NAME = "gizismile-shell-v2";
const STATIC_ASSETS = [
  "/",
  "/z-score",
  "/manifest.json",
  "/favicon.ico",
  "/Logo_GiziSmile.svg"
];

// Install: Cache aset inti aplikasi (app shell publik saja)
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

  const url = new URL(event.request.url);

  // Jangan tangani atau cache rute auth, rute API, atau panggilan eksternal Supabase
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/login") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Jangan cache jika status bukan 200 atau respon merupakan hasil redirect (misal redirect ke login)
        if (!response || response.status !== 200 || response.redirected) {
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
