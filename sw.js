/* ===== sw.js — App 外殼離線防線 =====
   策略(2026-07-11 定案,2026-07-30 依 C1／C1.5 實證修訂;對應 16_OPS_PLAYBOOK 部署章節):
   1. 只管「同源 App 外殼」(index.html / schema.js / validator.js / app-version.js / manifest / icons)
   2. 外殼採 network-first:有網路永遠拿最新版,離線退回快取 → 沒訊號也打得開 App
   3. CSV 資料(docs.google.com)一律放行不攔截 → 資料層維持既有三層防線
      (BUILTIN → localStorage → background sync),SW 與資料層職責不重疊
   4. 版本升級:改下方 SW_VERSION,並同步 app-version.js;
      tools/check-app-version.js 會在兩者不一致時直接讓 CI 失敗

   ── 為什麼版本寫在本檔頂層,而不是 importScripts 進來(2026-07-30 實證)──
   Service Worker 的更新檢查只對「頂層 sw.js」強制繞過 HTTP cache;importScripts 匯入的
   檔案在 updateViaCache 預設值 'imports' 下**會**經過 HTTP cache。GitHub Pages 對
   app-version.js 送 max-age=600,實測會讓版本升級被靜默吃掉:更新檢查期間 app-version.js
   的 HTTP 請求次數為 0,SW 判定「沒變」而不安裝新版。版本寫在本檔頂層,才能保證每次升版
   sw.js 位元組必變、更新必被偵測。app-version.js 仍留在 SHELL —— index.html 要載它,
   離線必須有。

   ── 為什麼 install 用 reload、日常 fetch 用 no-cache(2026-07-30 實證)──
   預設 cache mode 下,新版 SW 的 install 會從 HTTP cache 拿到**舊版** SHELL:實測新快取
   裡裝的全是舊世代內容,整個 install 期間 SHELL 資源的 HTTP 請求次數為 0;重載後更出現
   「新版 index.html 配舊版 schema.js」的靜默混版本狀態。
   實測 reload 與 no-cache 皆可解:
     install 用 reload —— 一次性,正確性優先,一律重新下載
     日常 fetch 用 no-cache —— 允許 304,省行動網路流量(index.html 約 726KB)
   兩者都不影響離線 fallback:網路失敗仍會 reject 進 catch(已實測關閉伺服器後完整離線載入)。
*/
var SW_VERSION='v111';
var CACHE_NAME='okayama-trip-'+SW_VERSION;
var SHELL = [
  './',
  './index.html',
  './app-version.js',
  './builtin-snapshot.js',
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
  if(isNavigate||relative===''||relative==='index.html')return 'html';
  if(relative==='app-version.js')return 'app';
  if(relative==='builtin-snapshot.js')return 'builtin';
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
  return caches.match(request,{ignoreSearch:true}).then(function(hit){
    if(hit)return hit;
    if(isNavigate)return caches.match('./index.html').then(function(page){
      if(!page)return offlineMiss();
      return scopeRelativePath(request.url)==='index.html'?page:scopedIndexResponse(page);
    });
    return offlineMiss();
  });
}

self.addEventListener('install', function(e){
  e.waitUntil(
    /* addAll 維持原子語意:任一資源失敗則 install 失敗、新 SW 不啟用、舊 SW 續命。
       改傳 Request 物件只為指定 cache:'reload',不改變原子性。 */
    Promise.all(SHELL.map(function(url){
      var request=new Request(url,{cache:'reload'});
      return fetch(request).then(function(response){
        if(!response||!response.ok)throw new Error('App Shell fetch failed: '+url);
        return responseMatchesWorker(request,response,url==='./'||url==='./index.html').then(function(matches){
          if(!matches)throw new Error('App Shell generation mismatch: '+url);
          return {request:request,response:response};
        });
      });
    })).then(function(entries){
      return caches.open(CACHE_NAME).then(function(cache){
        return Promise.all(entries.map(function(entry){return cache.put(entry.request,entry.response);}));
      });
    }).then(function(){return self.skipWaiting();})
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
