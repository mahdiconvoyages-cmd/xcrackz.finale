'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"assets/AssetManifest.bin": "cfdcb4b517f30103251db78308ecb989",
"assets/AssetManifest.bin.json": "1cd0256fffce8f59711f18d0e9376325",
"assets/assets/images/app_icon.svg": "8f851c01b8ebcc6b84fc7fb1f047d940",
"assets/assets/images/icon.png": "978a8efd403800d8dc1fc5d8f4d328eb",
"assets/assets/images/ic_launcher_foreground.svg": "48fcdbb8839a14ca33bda12425460d50",
"assets/assets/images/logo.png": "978a8efd403800d8dc1fc5d8f4d328eb",
"assets/assets/images/logo.svg": "8f851c01b8ebcc6b84fc7fb1f047d940",
"assets/assets/images/logo_checksfleet.svg": "8f851c01b8ebcc6b84fc7fb1f047d940",
"assets/assets/images/logo_checksfleet_harmonized.svg": "b5786db0f9f1861c60fb7f4429dbf392",
"assets/assets/images/logo_checksfleet_v2.svg": "851c762a6e8105ee06a7cc2e8ceda569",
"assets/assets/vehicles/arriere.png": "f699f1dc45d453b57e063b8c60b3f413",
"assets/assets/vehicles/avant.png": "0d45f1401d9cee3ce42118dbaec81fd6",
"assets/assets/vehicles/interieur_arriere.png": "e2d53c4b986dbc4856d8186fd3efd10f",
"assets/assets/vehicles/interieur_avant.png": "9bbfc468dd6cc98ddc3e3817157a4c67",
"assets/assets/vehicles/lateraldroit_avant.png": "5adc8213dd3d56c0ca46bae2a44ebb8c",
"assets/assets/vehicles/laterale_gauche_arriere.png": "528a4c6fe1a3c9d685b787352607c091",
"assets/assets/vehicles/lateral_droit_arriere.png": "b322bfbfee7104d159f014bcafa1491c",
"assets/assets/vehicles/lateral_gauche_avant.png": "6613af508260de6087e9a3c88b79389b",
"assets/assets/vehicles/master_avant.png": "5674e54427261038aabe7a13b0b5096d",
"assets/assets/vehicles/master_avg_1.png": "2b8992530517561bd2f82965cb587bf3",
"assets/assets/vehicles/master_avg_2.png": "87f87c07d4637d2409091ee144fa5e43",
"assets/assets/vehicles/master_lateral_droit_arriere.png": "26af74f92560b285dcd7362f7a0efed9",
"assets/assets/vehicles/master_lateral_droit_avant.png": "579ab667bcfb0d9093be80484ffdf29b",
"assets/assets/vehicles/master_lateral_gauche_arriere.png": "5df2cd6f7ab70594f4198fb2ede038f5",
"assets/assets/vehicles/master_lateral_gauche_avant.png": "2b8992530517561bd2f82965cb587bf3",
"assets/assets/vehicles/scania-arriere.png": "367a4318c64a133352c6f13934f09ad8",
"assets/assets/vehicles/scania-avant.png": "bd3cf7887b721af968b4169de353df76",
"assets/assets/vehicles/scania-lateral-droit-arriere.png": "145432fc7a3c21613cab6d5bb0f41045",
"assets/assets/vehicles/scania-lateral-droit-avant.png": "c4111f39fd8fea97141d69f786f8757e",
"assets/assets/vehicles/scania-lateral-gauche-arriere.png": "a5c26fb958f300427df223628cfd63e2",
"assets/assets/vehicles/scania-lateral-gauche-avant.png": "681b0763df0e78024ffd6dfdc7206519",
"assets/assets/vehicles/tableau_de_bord.png": "374765b69d0bf7465d8f649006f66b3d",
"assets/FontManifest.json": "dc3d03800ccca4601324923c0b1d6d57",
"assets/fonts/MaterialIcons-Regular.otf": "4961de0fe745700e7c071c99242de712",
"assets/NOTICES": "e333dea416f524a2acd93b84777e441b",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/packages/flutter_map/lib/assets/flutter_map_logo.png": "208d63cc917af9713fc9572bd5c09362",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/shaders/stretch_effect.frag": "40d68efbbf360632f614c731219e95f0",
"canvaskit/canvaskit.js": "8331fe38e66b3a898c4f37648aaf7ee2",
"canvaskit/canvaskit.js.symbols": "a3c9f77715b642d0437d9c275caba91e",
"canvaskit/canvaskit.wasm": "9b6a7830bf26959b200594729d73538e",
"canvaskit/chromium/canvaskit.js": "a80c765aaa8af8645c9fb1aae53f9abf",
"canvaskit/chromium/canvaskit.js.symbols": "e2d09f0e434bc118bf67dae526737d07",
"canvaskit/chromium/canvaskit.wasm": "a726e3f75a84fcdf495a15817c63a35d",
"canvaskit/skwasm.js": "8060d46e9a4901ca9991edd3a26be4f0",
"canvaskit/skwasm.js.symbols": "3a4aadf4e8141f284bd524976b1d6bdc",
"canvaskit/skwasm.wasm": "7e5f3afdd3b0747a1fd4517cea239898",
"canvaskit/skwasm_heavy.js": "740d43a6b8240ef9e23eed8c48840da4",
"canvaskit/skwasm_heavy.js.symbols": "0755b4fb399918388d71b59ad390b055",
"canvaskit/skwasm_heavy.wasm": "b0be7910760d205ea4e011458df6ee01",
"favicon.png": "978a8efd403800d8dc1fc5d8f4d328eb",
"flutter.js": "24bc71911b75b5f8135c949e27a2984e",
"flutter_bootstrap.js": "73db48341aff78ad811485f3c5060240",
"icons/Icon-192.png": "7107e24a98034f0797959596e6fd209d",
"icons/Icon-512.png": "61c0816c5f9fa15686193349e486301c",
"icons/Icon-maskable-192.png": "cdb877c13bb4b2376e4385d5486b01de",
"icons/Icon-maskable-512.png": "16b1321edcde26edc09d47316874878c",
"index.html": "ff3e3b33f4d997febb602abd4d09170b",
"/": "ff3e3b33f4d997febb602abd4d09170b",
"main.dart.js": "f52084e5f253220e1d5ac957da074348",
"manifest.json": "deabc010d221a2fa95419cb2cb9140f6",
"splash/img/dark-1x.png": "dd28d09d1b1939a837b7b5ffb20eb5b6",
"splash/img/dark-2x.png": "d588e5a97881898792a96a1e5ffe862f",
"splash/img/dark-3x.png": "bba7fc465b25ca5f7b4df9ff8a0347d9",
"splash/img/dark-4x.png": "53f8202f2fc02049a995dfb50c69e154",
"splash/img/light-1x.png": "dd28d09d1b1939a837b7b5ffb20eb5b6",
"splash/img/light-2x.png": "d588e5a97881898792a96a1e5ffe862f",
"splash/img/light-3x.png": "bba7fc465b25ca5f7b4df9ff8a0347d9",
"splash/img/light-4x.png": "53f8202f2fc02049a995dfb50c69e154",
"version.json": "9747350c5e1de049cf960c42101f15c3"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
