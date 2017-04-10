(function(global) {
        <!-- tangram:1749 begin-->
var cacheStorageKey =  'sw-test-2';
var disable = false;

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

// Cache.addAll polyfill
if(!Cache.prototype.addAll){
    Cache.prototype.addAll = function(requests){
        var cache = this;
        return Promise.all(requests.map(function(request){
            if(!(request instanceof Request)){
                request = new Request(request);
            }
            return fetch(request.clone(), {mode: 'no-cors'}).then(function(res){
                if (res && res.status === 200) {
                    return cache.put(request, res);
                }
            });
        }));
    }
    Cache.prototype.add = function(request){
        return this.addAll([request]);
    }
}

var cacheWhitelist = [cacheStorageKey]

self.addEventListener('install', function(e) {
    console.log('installing')

    // don't wait
    if (self.skipWaiting) {
        self.skipWaiting()
        activate(e)
    }
})

self.addEventListener('fetch', function(e) {
    console.log('fetch')

    var isNeedCache = e.request.url.indexOf('credit-search/detail') > -1

    if (isNeedCache) {
        e.respondWith(
            caches.match(e.request).then(function(response) {
                if (response) {
                    console.log(e.request.url)
                    console.log('Found response in cache:', response);                    

                    return response
                }

                return fetch(e.request.url, { mode: 'no-cors' }).then(function(response) {
                    console.log('Response from network is:', response);
                    
                    return response;
                }).catch(function(ex){
                    console.warn('request %s fail', e.request.url, ex);
                })
            })
        )
    }
})

self.addEventListener('activate', function(e) {
    console.log('activate');
    
    if (!self.skipWaiting) {
        activate(e); 
    }
})

function activate(e) {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            console.log('current cacheNames: ')
            console.log(cacheNames)
            console.log('new key is: ' + cacheStorageKey)

            if (cacheNames.length == 0) {
                addCache()
            } else {
                return Promise.all(
                    cacheNames.map(function(cacheName) {

                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            console.log('delete cache: ')
                            console.log(cacheName)

                            addCache()

                            return caches.delete(cacheName)
                        }
                    })
                )
            }
        })
    )
}

function addCache() {
    getCacheList(function(cacheList) {
        if (cacheList.length > 0) {
            console.log('begin add new cache file')

            caches.open(cacheStorageKey)
                .then(function(cache) {
                    cache.addAll(cacheList)

                    console.log('add cache success:')
                    console.log(cacheList)

                })
                .then(function() {
                    if (self.skipWaiting) {
                        self.skipWaiting()
                    }
                })
        }
    })
}

function getCacheList(callback) {

    var myDB = {
        name: 'asset',
        version: 1,
        db: null
    }

    openDB(myDB.name, myDB.version, function(e) {
        myDB.db = e.target.result;

        getDataByKey(myDB.db, 'cacheList', 'assetUrls', function(result) {
            if (callback) {
                callback(result.urls)
            }
        })
    });
}


clearCache = function clearCache() {
    return caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                console.log('clear cache: ' + cacheName);
                return caches.delete(cacheName);
            })
        );
    });
}
clearCache();

/*
 * 通过indexedDB对资源数据进行存取
 * 基本的增删改操作
 * openDB => creat transaction => get store => 
 */

function openDB (name, version, successCallback) {
    var version = version || 1;

    var request = indexedDB.open(name, version);

    request.onerror = function(e) {
        console.log(e.currentTarget.error.message);
    }

    request.onsuccess = function(e) {
        if (successCallback) {
            successCallback(e)
        }
    }

    request.onupgradeneeded = function(e) {
        var db = e.target.result;

        if (!db.objectStoreNames.contains('cacheList')) {
            db.createObjectStore('cacheList', { keyPath: 'id' })
        }

        console.log('DB version changed to ' + version)
    }
}

function updateDataByKey(db, storeName, value, cacheList, callback) {
    var transaction = db.transaction(storeName, 'readwrite');
    var store = transaction.objectStore(storeName);
    var request = store.get(value);

    request.onsuccess = function(e) {
        var item = e.target.result;

        if (!item) {
            item = {
                id: value,
                urls: cacheList[0].urls
            }
        } else {
            item.urls = cacheList[0].urls
        }

        store.put(item);

        if (callback) {
            callback();
        }
    }
}

function addData(db, storeName, cacheList) {
    var transaction = db.transaction(storeName, 'readwrite');
    var store = transaction.objectStore(storeName);

    for (var i = 0; i < cacheList.length; i++) {
        store.add(cacheList[i]);
    }
}

function closeDB(db) {
    db.close();
}

function deleteDB(name) {
    indexedDB.deleteDatabase(name);
}

function getDataByKey(db, storeName, value, callback) {
    var transaction = db.transaction(storeName, 'readwrite');
    var store = transaction.objectStore(storeName);
    var request = store.get(value);

    request.onsuccess = function(e) {
        var result = e.target.result;

        if (callback) {
            callback(result)
        }
        console.log(result)
    }
}
<!-- tangram:1749 end-->
}(self));