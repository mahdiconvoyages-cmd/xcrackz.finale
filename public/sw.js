// Service Worker pour ChecksFleet PWA
// Cache les assets statiques et permet le mode hors ligne

const CACHE_VERSION = 'v5-checksfleet-2026'; // CHANGÉ pour forcer mise à jour + fix chunk stale cache
const CACHE_NAME = `checksfleet-${CACHE_VERSION}`;
const STATIC_CACHE = `checksfleet-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `checksfleet-dynamic-${CACHE_VERSION}`;

// Assets à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cache des assets statiques');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Erreur cache assets:', err);
        return Promise.resolve();
      });
    })
  );
  
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation... Version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer TOUS les anciens caches
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] 🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Tous les anciens caches supprimés');
      return self.clients.claim();
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes cross-origin (éviter CORS)
  if (url.origin !== location.origin) {
    return;
  }

  // Ne pas cacher les requêtes vers l'API Supabase
  if (url.hostname.includes('supabase')) {
    return;
  }

  // JS scripts: Network First (évite les erreurs de chunks périmés après déploiement)
  if (request.destination === 'script') {
    event.respondWith(
      fetch(request, { mode: 'cors', credentials: 'same-origin' })
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('', { status: 408, statusText: 'Request Timeout' });
          });
        })
    );
    return;
  }

  // Stratégie Cache First pour les assets statiques (images, styles, fonts)
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request, { mode: 'cors', credentials: 'same-origin' })
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          })
          .catch(() => {
            if (request.destination === 'image') {
              return caches.match('/logo.svg');
            }
            return new Response('', { status: 408, statusText: 'Request Timeout' });
          });
      })
    );
    return;
  }

  // Stratégie Network First pour les pages HTML
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Ne mettre en cache que les requêtes GET
        if (request.method === 'GET') {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback vers le cache si hors ligne (seulement pour GET)
        if (request.method === 'GET') {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        }
        // Pour POST/PUT/DELETE, retourner une erreur
        return new Response('Network error', { status: 503 });
      })
  );
});

// Gestion des notifications push (optionnel)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'ChecksFleet';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion du clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
