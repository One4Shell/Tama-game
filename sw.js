/* Service Worker - Pocket Pet '96 */
const CACHE_VERSION = "pocket-pet-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

// App shell da precaricare all'installazione (stesso-origin).
const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/icon-180.png",
    "./icons/favicon-32.png",
    // sprites
    "./sprites/blob.js",
    "./sprites/breed.js",
    "./sprites/clean.js",
    "./sprites/dino.js",
    "./sprites/feed.js",
    "./sprites/heal.js",
    "./sprites/kitty.js",
    "./sprites/mic.js",
    "./sprites/monster.js",
    "./sprites/play.js",
    "./sprites/poop.js",
    "./sprites/skull.js",
    "./sprites/sleep.js",
    "./sprites/squish.js",
    "./sprites/tomb.js",
    "./sprites/toy_ball.js",
    "./sprites/toy_bone.js",
    "./sprites/toy_console.js",
    "./sprites/toy_robot.js",
    "./sprites/toy_teddy.js",
    "./sprites/tree.js",
    "./sprites/trophy.js",
    // tools (ES modules)
    "./tools/local-llm-engine.js",
    "./tools/pet-ai.js",
    "./tools/pet-memory.js",
    "./tools/pet-synth.js",
    "./tools/speech-recognizer.js",
];

// Risorse cross-origin caricate a runtime (cache-first, così l'app funziona offline).
const RUNTIME_HOSTS = [
    "cdn.tailwindcss.com",
    "esm.run",
    "esm.sh",
    "cdn.jsdelivr.net",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(PRECACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(
                            (key) =>
                                key !== PRECACHE && key !== RUNTIME
                        )
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

function isRuntimeUrl(url) {
    return RUNTIME_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith("." + host));
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Navigazione: network-first, fallback alla shell (funziona offline).
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(PRECACHE).then((cache) => cache.put("./index.html", copy));
                    return response;
                })
                .catch(() =>
                    caches.match("./index.html").then((cached) => cached || caches.match("./"))
                )
        );
        return;
    }

    // Stesso-origin (sprites/tools/icone): cache-first, poi rete.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const copy = response.clone();
                    caches.open(PRECACHE).then((cache) => cache.put(request, copy));
                    return response;
                });
            })
        );
        return;
    }

    // CDN cross-origin (Tailwind, web-llm): cache-first con fallback alla rete.
    if (isRuntimeUrl(url)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(RUNTIME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Altre richieste cross-origin: solo rete.
    return;
});
