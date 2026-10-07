// service-worker.js — cache hors-ligne : l'appli fonctionne sans réseau.
//
// ⚠ À CHAQUE MODIFICATION d'un fichier de l'appli, changer le numéro de VERSION
// ci-dessous. Sinon les téléphones gardent l'ancienne version en cache.

const VERSION = "spesa-v15";

// Tous les fichiers nécessaires pour fonctionner hors-ligne
const FICHIERS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/langue.js",
  "js/db.js",
  "js/logic.js",
  "js/backup.js",
  "js/ui.js",
  "js/app.js",
  "langues/fr.json",
  "langues/co.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Installation : on met tous les fichiers de cette version en cache, ou aucun
self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

// Activation : on supprime les caches des anciennes versions
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Chaque requête : d'abord le cache, le réseau seulement si le fichier n'y est pas
self.addEventListener("fetch", (evenement) => {
  if (evenement.request.method !== "GET") return;
  evenement.respondWith(
    caches.match(evenement.request, { ignoreSearch: true })
      .then((reponse) => reponse || fetch(evenement.request))
  );
});
