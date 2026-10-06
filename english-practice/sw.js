const CACHE_NAME = "english-practice-v7";

const FILES = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./app.js?v=7",
  "./manifest.webmanifest",
  "./borboleta.png",
  "./brave-cover-start.png"
];


/* INSTALA NOVA VERSÃO */
self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
  );

});


/* APAGA TODOS OS CACHES ANTIGOS */
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


/* BUSCA SEMPRE A VERSÃO NOVA PRIMEIRO */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  const request = event.request;


  /* HTML / PÁGINAS:
     tenta internet primeiro */
  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then(response => {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put("./index.html", copy);
            });

          return response;

        })

        .catch(() => {

          return caches.match("./index.html");

        })

    );

    return;
  }


  /* CSS / JS:
     também tenta pegar novo primeiro */
  if (
    request.url.includes(".js") ||
    request.url.includes(".css")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then(response => {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, copy);
            });

          return response;

        })

        .catch(() => caches.match(request))

    );

    return;
  }


  /* IMAGENS E OUTROS ARQUIVOS */
  event.respondWith(

    caches.match(request)

      .then(cached => {

        if (cached) {
          return cached;
        }

        return fetch(request)

          .then(response => {

            if (
              !response ||
              response.status !== 200
            ) {
              return response;
            }

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, copy);
              });

            return response;

          });

      })

  );

});
