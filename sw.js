const filesToCache = [  
  '/',
  'css/main.css',
  'js/main.js', 
  'js/mobile.js',
  'js/dexie.js',   
  'index.html',  
];	

const staticCacheName = 'pages-cache';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('fetch', function onFetch(event) {
  var request = event.request;

  if (!request.url.match(/^https?:\/\/example.com/) ) { return; }
  if (request.method !== 'GET') { return; }

  event.respondWith(
    fetch(request)                                      // first, the network
    .catch(function fallback() {
      caches.match(request).then(function(response) {  // then, the cache
        response || caches.match("/index.html");     // then, /offline cache
      })
    })
  );
});

// self.addEventListener('activate', function onActivate(event) {
//   event.waitUntil(
//     caches.keys().then(function deleteOldCache(cacheNames) {
//       return Promise.all(
//         cacheNames.filter(function(cacheName) {
//           return key.indexOf(version) !== 0;
//         }).map(function(cacheName) {
//           return caches.delete(cacheName);
//         })
//       );
//     })
//   );
// });