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
var SW_VERSION='v75';
var CACHE_NAME='okayama-trip-'+SW_VERSION;
var SHELL = [
  './',
  './index.html',
  './app-version.js',
  './shopping-photo-store.js',
  './schema.js',
  './validator.js',
  './manifest.webmanifest',
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

self.addEventListener('install', function(e){
  e.waitUntil(
    /* addAll 維持原子語意:任一資源失敗則 install 失敗、新 SW 不啟用、舊 SW 續命。
       改傳 Request 物件只為指定 cache:'reload',不改變原子性。 */
    caches.open(CACHE_NAME).then(function(c){
      return c.addAll(SHELL.map(function(url){ return new Request(url, { cache:'reload' }); }));
    }).then(function(){ return self.skipWaiting(); })
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

  /* 同源外殼:network-first(繞過 HTTP cache 但允許 304),失敗退快取 */
  e.respondWith(
    fetch(new Request(e.request, { cache:'no-cache' })).then(function(res){
      if(res && res.ok){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request, { ignoreSearch:true }).then(function(hit){
        if(hit) return hit;
        /* 只有整頁導覽才退回 index.html;script / manifest / 圖片等子資源一律不得。 */
        if(isNavigate) return caches.match('./index.html').then(function(page){ return page || offlineMiss(); });
        return offlineMiss();
      });
    })
  );
});
