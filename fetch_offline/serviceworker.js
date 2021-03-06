var CACHE = 'cache-for-offline';

if(!CacheStorage.prototype.match){
    CacheStorage.prototype.match = function(request){
        var matchRequestInCache = function(key){
            return caches.open(key).then(function(cache){
                return cache.match(request);
            });
        };

        var matchRequestInCaches = function(keys){
            return matchRequestInCache(keys.shift()).then(function(res){
                if(res){
                    return res;
                }else{
                    if(keys.length){
                        return matchRequestInCaches(keys);
                    }
                }
            })
        };

        if(!(request instanceof Request)){
            request = new Request(request);
        }

        return caches.keys().then(function(keys){
            return matchRequestInCaches(keys);
        });
    }
}

self.addEventListener('activate', function () {
  self.clients.claim(); // 确保首次安装就会生效
  console.log('Service worker has been activated!');
});

self.addEventListener('fetch', function(event) {
  console.log('*Try to get asset:'+event.request.url);
  if (event.request.url.indexOf('.png') == -1) return;

  console.log('The service worker is serving the asset:'+event.request.url);

  caches.open(CACHE).then(function (cache) {
      cache.match(event.request.url).then(function (response) {
      if (response) {
          console.log('!! Found in the cache!');
          return response;
      }

      console.log('!! Need to load!');
      return fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            var responseToCache = response.clone();
            console.log('!! Save to cache!');
            cache.put(event.request, responseToCache);
          }
          return response;
      });
    });
  });
});


