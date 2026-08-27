const CACHE = "mini-merlin-v2";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./game.js", "./icon.svg", "./manifest.webmanifest",
  "./assets/background.png", "./assets/ground.png", "./assets/floating-platform.png",
  "./assets/merlin-idle.png", "./assets/merlin-walking.png", "./assets/enemy.png"
];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))));
