var CACHE = 'cache-update-and-refresh';

// if(!Cache.prototype.addAll){
    Cache.prototype.addAll = function(requests){
        var cache = this;
        return Promise.all(requests.map(function(request){
            if(!(request instanceof Request)){
                request = new Request(request);
            }
            console.log("Request:",request);
            return fetch(request.clone()).then(function(res){
                console.log("response:",res);
                if (res && res.status === 200) { // >=200 & <300 return OK
                    console.log("put:",res);
                    window.testingkeys = res.headers.keys().clone();
                    return cache.put(request, res);
                }
            });
        }));
    }
    Cache.prototype.add = function(request){
        console.log("add:",request);
        return this.addAll([request]);
    }
// }

var urlsToCache = [
    'https://g.alicdn.com/secdev/sufei_data/2.0.4/index.js',
    'https://g.alicdn.com/mui/fetch/4.1.8/??jsonp.js,fetch.js,tool.js',
    'https://img.alicdn.com/bao/uploaded/i4/TB1i5udPFXXXXXqXVXXXXXXXXXX_!!0-item_pic.jpg_220x10000Q50s50.jpg_.webp'
];

// On install, cache some resource.
self.addEventListener('install', function(evt) {
  console.log('The service worker is being installed.');
  // Open a cache and use `addAll()` with an array of assets to add all of them
  // to the cache. Ask the service worker to keep installing until the
  // returning promise resolves.
  evt.waitUntil(caches.open(CACHE).then(function (cache) {
    cache.add('./caching.html');
    cache.addAll(urlsToCache);
  }));
});

// On fetch, use cache but update the entry with the latest contents
// from the server.
self.addEventListener('fetch', function(evt) {
  console.log('The service worker is serving the asset:'+evt.request);
  // You can use `respondWith()` to answer ASAP...
  evt.respondWith(fromCache(evt.request));
  // ...and `waitUntil()` to prevent the worker to be killed until
  // the cache is updated.
  evt.waitUntil(
    update(evt.request)
    // Finally, send a message to the client to inform it about the
    // resource is up to date.
    .then(refresh)
  );
});

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}


// Update consists in opening the cache, performing a network request and
// storing the new response data.
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response.clone()).then(function () {
        return response;
      });
    });
  });
}

// Sends a message to the clients.
function refresh(response) {
  return self.clients.matchAll().then(function (clients) {
    clients.forEach(function (client) {
      // Encode which resource has been updated. By including the
      // [ETag](https://en.wikipedia.org/wiki/HTTP_ETag) the client can
      // check if the content has changed.
      var message = {
        type: 'refresh',
        url: response.url,
        // Notice not all servers return the ETag header. If this is not
        // provided you should use other cache headers or rely on your own
        // means to check if the content has changed.
        eTag: response.headers.get('ETag')
      };
      // Tell the client about the update.
      client.postMessage(JSON.stringify(message));
    });
  });
}
