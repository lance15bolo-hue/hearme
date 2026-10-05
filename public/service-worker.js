const CACHE_VERSION = "hearme-v1";

const APP_CACHE =
  `${CACHE_VERSION}-app`;

const FSL_CACHE =
  `${CACHE_VERSION}-fsl`;


/*
  Application shell.

  These resources allow the basic HearMe
  interface to remain available after
  they have been cached.
*/
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
  "/logohearme.png",
  "/Hearmelogo.png",
];


/*
  Selected verified FSL resources intended
  for limited offline support.

  We intentionally do NOT include FSL
  phrases whose video assets are unavailable.
*/
const SELECTED_FSL_VIDEOS = [
  "/fsl-videos/HelloF.mp4",
  "/fsl-videos/thank-youF.mp4",
  "/fsl-videos/helpF.mp4",
  "/fsl-videos/OneF.mp4",
  "/fsl-videos/TwoF.mp4",
  "/fsl-videos/good-morningF.mp4",
];


self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      Promise.all([

        caches
          .open(APP_CACHE)
          .then((cache) =>
            cache.addAll(
              APP_SHELL
            )
          ),

        caches
          .open(FSL_CACHE)
          .then((cache) =>
            cache.addAll(
              SELECTED_FSL_VIDEOS
            )
          ),

      ]).then(() =>
        self.skipWaiting()
      )

    );

  }
);


self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then((cacheNames) =>

          Promise.all(

            cacheNames

              .filter((cacheName) => {

                return (
                  cacheName.startsWith(
                    "hearme-"
                  ) &&
                  cacheName !==
                    APP_CACHE &&
                  cacheName !==
                    FSL_CACHE
                );

              })

              .map((cacheName) =>
                caches.delete(
                  cacheName
                )
              )

          )

        )

        .then(() =>
          self.clients.claim()
        )

    );

  }
);


const isSameOrigin = (
  request
) => {

  return (
    new URL(request.url)
      .origin ===
    self.location.origin
  );

};


const isFslVideoRequest = (
  request
) => {

  return new URL(
    request.url
  )
    .pathname
    .startsWith(
      "/fsl-videos/"
    );

};


const isStaticAssetRequest = (
  request
) => {

  const pathname =
    new URL(
      request.url
    ).pathname;


  return (

    pathname.startsWith(
      "/static/"
    ) ||

    pathname.endsWith(
      ".css"
    ) ||

    pathname.endsWith(
      ".js"
    ) ||

    pathname.endsWith(
      ".png"
    ) ||

    pathname.endsWith(
      ".jpg"
    ) ||

    pathname.endsWith(
      ".jpeg"
    ) ||

    pathname.endsWith(
      ".svg"
    ) ||

    pathname.endsWith(
      ".ico"
    )

  );

};


/*
  Support HTTP Range requests for cached
  FSL MP4 files.

  This allows browser video controls to
  request portions of a cached video while
  offline.
*/
const createRangeResponse = async (
  response,
  rangeHeader
) => {

  const blob =
    await response.blob();

  const totalSize =
    blob.size;


  const match =
    rangeHeader.match(
      /bytes=(\d*)-(\d*)/i
    );


  if (!match) {
    return response;
  }


  let start =
    match[1]
      ? Number(match[1])
      : 0;

  let end =
    match[2]
      ? Number(match[2])
      : totalSize - 1;


  if (
    !match[1] &&
    match[2]
  ) {

    const suffixLength =
      Number(match[2]);

    start =
      Math.max(
        totalSize -
          suffixLength,
        0
      );

    end =
      totalSize - 1;

  }


  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    start >= totalSize ||
    end < start
  ) {

    return new Response(
      null,
      {
        status: 416,

        headers: {
          "Content-Range":
            `bytes */${totalSize}`,
        },

      }
    );

  }


  end =
    Math.min(
      end,
      totalSize - 1
    );


  const slicedBlob =
    blob.slice(
      start,
      end + 1,
      "video/mp4"
    );


  return new Response(
    slicedBlob,
    {
      status: 206,

      statusText:
        "Partial Content",

      headers: {

        "Content-Type":
          "video/mp4",

        "Content-Length":
          String(
            slicedBlob.size
          ),

        "Content-Range":
          `bytes ${start}-${end}/${totalSize}`,

        "Accept-Ranges":
          "bytes",

      },

    }
  );

};


/*
  FSL video handling.

  Cached selected videos are served
  directly. Other FSL videos use the
  network normally.
*/
const handleFslVideoRequest =
  async (request) => {

    const cache =
      await caches.open(
        FSL_CACHE
      );


    const cachedResponse =
      await cache.match(
        request.url
      );


    if (cachedResponse) {

      const rangeHeader =
        request.headers.get(
          "range"
        );


      if (rangeHeader) {

        return createRangeResponse(
          cachedResponse.clone(),
          rangeHeader
        );

      }


      return cachedResponse;

    }


    try {

      const networkResponse =
        await fetch(request);


      if (
        networkResponse.ok
      ) {

        const responseForCache =
          networkResponse.clone();


        cache
          .put(
            request.url,
            responseForCache
          )
          .catch(() => {});

      }


      return networkResponse;

    } catch (error) {

      return new Response(
        "FSL video currently unavailable.",
        {
          status: 503,

          headers: {
            "Content-Type":
              "text/plain; charset=utf-8",
          },

        }
      );

    }

  };


self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;


    if (
      request.method !== "GET" ||
      !isSameOrigin(request)
    ) {
      return;
    }


    /*
      FSL video requests
    */
    if (
      isFslVideoRequest(
        request
      )
    ) {

      event.respondWith(
        handleFslVideoRequest(
          request
        )
      );

      return;

    }


    /*
      Navigation requests.

      Network first:
      - online = newest application
      - offline = cached index
    */
    if (
      request.mode ===
      "navigate"
    ) {

      event.respondWith(

        fetch(request)

          .then(
            (response) => {

              const responseForCache =
                response.clone();


              caches
                .open(
                  APP_CACHE
                )
                .then((cache) =>
                  cache.put(
                    "/index.html",
                    responseForCache
                  )
                )
                .catch(() => {});


              return response;

            }
          )

          .catch(
            async () => {

              const cachedResponse =
                await caches.match(
                  "/index.html"
                );


              return (
                cachedResponse ||

                new Response(
                  "HearMe is currently unavailable offline.",
                  {
                    status: 503,

                    headers: {
                      "Content-Type":
                        "text/plain; charset=utf-8",
                    },

                  }
                )
              );

            }
          )

      );

      return;

    }


    /*
      Static assets.

      Cache first:
      - cached asset = immediate
      - otherwise fetch and cache
    */
    if (
      isStaticAssetRequest(
        request
      )
    ) {

      event.respondWith(

        caches
          .match(request)

          .then(
            (cachedResponse) => {

              if (
                cachedResponse
              ) {
                return cachedResponse;
              }


              return fetch(
                request
              ).then(
                (networkResponse) => {

                  if (
                    networkResponse.ok
                  ) {

                    const responseForCache =
                      networkResponse.clone();


                    caches
                      .open(
                        APP_CACHE
                      )
                      .then(
                        (cache) =>
                          cache.put(
                            request,
                            responseForCache
                          )
                      )
                      .catch(
                        () => {}
                      );

                  }


                  return networkResponse;

                }
              );

            }
          )

      );

    }

  }
);