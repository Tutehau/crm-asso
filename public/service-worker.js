/**
 * Service Worker — CRM Association (PWA)
 *
 * Mises à jour AUTOMATIQUES + fonctionnement hors-ligne pour la coquille
 * statique (HTML/CSS/JS) uniquement :
 *   - HTML / CSS / JS : réseau d'abord (toujours à jour), cache en secours.
 *   - Images/icônes   : stale-while-revalidate (rapide + màj en fond).
 *   - /api/*          : jamais interceptés — les contacts/emails/membres
 *     ne doivent jamais être servis depuis un cache obsolète, et cet
 *     historique ne doit pas persister silencieusement dans le Cache
 *     Storage du navigateur.
 *
 * Incrémente CACHE_VERSION à chaque déploiement significatif pour
 * forcer le nettoyage de l'ancien cache (voir "activate" ci-dessous).
 */
const CACHE_VERSION = "crm-asso-cache-v4";

const CORE_ASSETS = [
    "./",
    "index.html",
    "dashboard.html",
    "contacts.html",
    "emails.html",
    "exposants.html",
    "import-export.html",
    "users.html",
    "settings.html",
    "profile.html",
    "join.html",
    "style.css",
    "shared.js",
    "login.js",
    "dashboard.js",
    "contacts.js",
    "emails.js",
    "exposants.js",
    "import-export.js",
    "users.js",
    "settings.js",
    "profile.js",
    "join.js",
    "manifest.json",
    "icons/icon-192.png",
    "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => Promise.allSettled(CORE_ASSETS.map((a) => cache.add(a))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function isApi(path) {
    return path.startsWith("/api/");
}

function isImage(url) {
    return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url) || url.includes("/icons/");
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

    const path = new URL(request.url).pathname;
    if (isApi(path)) return; // laisse passer nativement, jamais de cache pour les données membres

    if (isImage(path)) {
        event.respondWith(
            caches.open(CACHE_VERSION).then((cache) =>
                cache.match(request).then((cached) => {
                    const network = fetch(request).then((response) => {
                        if (response.ok && response.type === "basic") cache.put(request, response.clone());
                        return response;
                    }).catch(() => cached);
                    return cached || network;
                })
            )
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok && response.type === "basic") {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) => {
                    if (cached) return cached;
                    if (request.mode === "navigate") return caches.match("index.html");
                    return Response.error();
                })
            )
    );
});
