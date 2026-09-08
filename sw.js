/* ===== sw.js — App 外殼離線防線 =====
   策略(2026-07-11 定案,2026-07-30 依 C1／C1.5 實證修訂;對應 16_OPS_PLAYBOOK 部署章節):
   1. 只管同源 App Shell；root index／app-version 是 frozen v110 bridge，current version-bearing assets 在 shell/v113/
   2. 已安裝外殼採 cache-first:同一個 worker 生命週期固定同世代資產;新版由 install 驗證完成後原子切換
   3. CSV 資料(docs.google.com)一律放行不攔截 → 資料層維持既有三層防線
      (BUILTIN → localStorage → background sync),SW 與資料層職責不重疊
   4. 版本升級:改下方 SW_VERSION,並同步 shell/<version>/app-version.js 與 immutable path;
      tools/check-app-version.js 會在兩者不一致時直接讓 CI 失敗

   ── 為什麼版本寫在本檔頂層,而不是 importScripts 進來(2026-07-30 實證)──
   Service Worker 的更新檢查只對「頂層 sw.js」強制繞過 HTTP cache;importScripts 匯入的
   檔案在 updateViaCache 預設值 'imports' 下**會**經過 HTTP cache。GitHub Pages 對
   version script 送 max-age=600,實測會讓版本升級被靜默吃掉:更新檢查期間 version script
   的 HTTP 請求次數為 0,SW 判定「沒變」而不安裝新版。版本寫在本檔頂層,才能保證每次升版
   sw.js 位元組必變、更新必被偵測。current generation version script 仍留在 SHELL，離線必須有；
   root app-version.js 則刻意 frozen at v110，不參與 current identity。

   ── 為什麼 install 用 reload、非外殼同源 fetch 用 no-cache(2026-07-30 實證)──
   預設 cache mode 下,新版 SW 的 install 會從 HTTP cache 拿到**舊版** SHELL:實測新快取
   裡裝的全是舊世代內容,整個 install 期間 SHELL 資源的 HTTP 請求次數為 0;重載後更出現
   「新版 index.html 配舊版 schema.js」的靜默混版本狀態。
   實測 reload 與 no-cache 皆可解:
     install 用 reload —— 一次性,正確性優先,一律重新下載
     非外殼同源 fetch 用 no-cache —— 允許 304,兼顧流量與更新
   已安裝外殼不再逐次打網路,避免舊 worker 把新部署的 runtime module 寫入舊世代快取。
*/
var SW_VERSION='v113';
var CACHE_NAME='okayama-trip-'+SW_VERSION;
var CURRENT_DOCUMENT='./shell/v113/index.html';
var CURRENT_APP_VERSION='./shell/v113/app-version.js';
var CURRENT_BUILTIN='./shell/v113/builtin-snapshot.js';
var SHELL = [
  './shell/v113/index.html',
  './shell/v113/app-version.js',
  './shell/v113/builtin-snapshot.js',
  './navigation-intent.js',
  './diagnostic-impact.js',
  './today-view.js',
  './shopping-photo-store.js',
  './buy-to-ledger.js',
  './ledger-ui-state.js',
  './shopping-ui-state.js',
  './trip-progression.js',
  './schema.js',
  './validator.js',
  './manifest.webmanifest',
  './okayama-peach-badge.png',
  './icon-16.png',
  './icon-32.png',
  './icon-152.png',
  './icon-167.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

/* 離線且快取未命中時的回應。**不得**回傳 index.html —— 讓 <script> 拿到 HTML 會解析失敗,
   實測會使 APP_VERSION 變成 undefined 並讓「資料與版本」頁拋 ReferenceError。 */
function offlineMiss(){
  return new Response('', { status: 504, statusText: 'Offline and not cached' });
}

function scopeRelativePath(url){
  var pathname=new URL(url,self.location.origin).pathname;
  var scopePath=new URL(self.registration.scope).pathname;
  if(pathname.indexOf(scopePath)!==0)return null;
  return pathname.slice(scopePath.length).replace(/^\/+/, '');
}

function versionedShellKind(url,isNavigate){
  var relative=scopeRelativePath(url);
  if(isNavigate||relative==='shell/v113/index.html')return 'html';
  if(relative==='shell/v113/app-version.js')return 'app';
  if(relative==='shell/v113/builtin-snapshot.js')return 'builtin';
  return '';
}

function isKnownShellRequest(url,isNavigate){
  if(isNavigate)return true;
  var relative=scopeRelativePath(url);
  if(relative===null)return false;
  return SHELL.some(function(entry){return entry.replace(/^\.\//,'')===relative;});
}

function responseShellVersion(kind,source){
  var patterns={html:/BUILTIN_HTML_VERSION='([^']+)'/,app:/APP_VERSION='([^']+)'/,builtin:/BUILTIN_ASSET_VERSION='([^']+)'/};
  var match=patterns[kind]&&patterns[kind].exec(String(source||''));
  return match&&match[1]||'';
}

function responseMatchesWorker(request,response,isNavigate){
  var kind=versionedShellKind(request.url,isNavigate);
  if(!kind)return Promise.resolve(true);
  return response.clone().text().then(function(source){return responseShellVersion(kind,source)===SW_VERSION;});
}

/* Chromium 對同源連線數有上限。若先並行 fetch 全部資源、但等 Promise.all 後才由 cache.put
   讀取 response body，未消耗的 stream 會占住連線槽並讓後續請求永遠無法開始。
   先完整讀成 Blob 再重建 Response，可釋放連線且仍維持「全部驗證後才開 cache 寫入」的原子邊界。 */
function bufferShellResponse(response){
  return response.blob().then(function(body){
    return new Response(body,{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
  });
}

function scopedIndexResponse(page){
  return page.text().then(function(source){
    var scope=String(self.registration.scope).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    var html=source.replace(/<head>/i,'<head>\n<base href="'+scope+'">');
    var headers=new Headers(page.headers);
    headers.delete('content-length');
    return new Response(html,{status:page.status,statusText:page.statusText,headers:headers});
  });
}

function cachedOrOffline(request,isNavigate){
  if(isNavigate)return caches.match(CURRENT_DOCUMENT).then(function(page){
    if(!page)return offlineMiss();
    var relative=scopeRelativePath(request.url);
    return relative===''||relative==='index.html'?page:scopedIndexResponse(page);
  });
  return caches.match(request,{ignoreSearch:true}).then(function(hit){
    if(hit)return hit;
    return offlineMiss();
  });
}

self.addEventListener('install', function(e){
  e.waitUntil(
    /* 先完整下載並驗證整組資源,任一失敗就不寫入新快取、不啟用新 SW,讓舊 SW 續命。
       Request 指定 cache:'reload',避免 install 誤拿 HTTP cache 的舊世代資產。 */
    Promise.all(SHELL.map(function(url){
      var request=new Request(url,{cache:'reload'});
      return fetch(request).then(function(response){
        if(!response||!response.ok)throw new Error('App Shell fetch failed: '+url);
        return responseMatchesWorker(request,response,url===CURRENT_DOCUMENT).then(function(matches){
          if(!matches)throw new Error('App Shell generation mismatch: '+url);
          return bufferShellResponse(response).then(function(buffered){return {request:request,response:buffered};});
        });
      });
    })).then(function(entries){
      return caches.open(CACHE_NAME).then(function(cache){
        return Promise.all(entries.map(function(entry){return cache.put(entry.request,entry.response);}));
      });
    }).then(function(){return self.skipWaiting();}).catch(function(error){
      return caches.delete(CACHE_NAME).then(function(){return Promise.reject(error);});
    })
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

  var isNavigate = e.request.mode === 'navigate';
  var shellRequest = isKnownShellRequest(e.request.url,isNavigate);

  /* 已安裝的整組 App Shell 一律 cache-first,直到通過 install 驗證的新 worker 啟用。
     這會把 HTML、版本檔與所有 runtime module 凍結在同一世代。 */
  if(shellRequest)return e.respondWith(
    isNavigate?cachedOrOffline(e.request,true):
    caches.match(e.request,{ignoreSearch:true}).then(function(hit){
      return hit||cachedOrOffline(e.request,isNavigate);
    })
  );

  /* 非 App Shell 的同源 GET 維持 network-first。 */
  e.respondWith(
    fetch(new Request(e.request, { cache:'no-cache' })).then(function(res){
      if(!res||!res.ok)return res;
      return res;
    }).catch(function(){return cachedOrOffline(e.request,false);})
  );
});
