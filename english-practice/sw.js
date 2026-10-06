const CACHE_NAME = "english-practice-v2";

const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => {
        return Promise.all(
          names.map(name => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (
          response &&
          response.status === 200
        ) {

          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then(cache => {
              cache.put(
                event.request,
                copy
              );
            });

        }

        return response;
      })

      .catch(async () => {

        const cached =
          await caches.match(
            event.request
          );

        if (cached) {
          return cached;
        }

        if (
          event.request.mode ===
          "navigate"
        ) {
          return caches.match(
            "./index.html"
          );
        }

      })
  );
});
