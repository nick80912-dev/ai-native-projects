/* ===== sw.js — App 外殼離線防線 =====
   策略(2026-07-11 定案,對應 16_OPS_PLAYBOOK 部署章節):
   1. 只管「同源 App 外殼」(index.html / schema.js / validator.js / manifest / icons)
   2. 外殼採 network-first:有網路永遠拿最新版,離線退回快取 → 沒訊號也打得開 App
   3. CSV 資料(docs.google.com)一律放行不攔截 → 資料層維持既有三層防線
      (BUILTIN → localStorage → background sync),SW 與資料層職責不重疊
   4. 版本升級:改 CACHE_NAME 尾碼(v3→v4...),activate 時自動清舊快取
*/
var CACHE_NAME = 'okayama-trip-v16';
var SHELL = [
  './',
  './index.html',
  './schema.js',
  './validator.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  /* 跨域(Google Sheets CSV、天氣 API 等)完全放行,交給 App 資料層 */
  if(url.origin !== self.location.origin) return;
  if(e.request.method !== 'GET') return;

  /* 同源外殼:network-first,失敗退快取 */
  e.respondWith(
    fetch(e.request).then(function(res){
      if(res && res.ok){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request, { ignoreSearch:true }).then(function(hit){
        return hit || caches.match('./index.html');
      });
    })
  );
});
