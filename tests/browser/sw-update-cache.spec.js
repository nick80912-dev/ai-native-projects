/* Service Worker 更新與快取正確性 —— C1.5 實證的瀏覽器回歸
   ============================================================
   2026-07-30 在隔離實驗中實測到兩個缺陷,本檔用**真實的 sw.js**把它們鎖住:
     1. 舊寫法下,新版 SW 的 install 會從 HTTP cache 拿到舊版 SHELL
        → 新快取名稱裝舊內容,且重載後出現「新版 index.html 配舊版 schema.js」
     2. 任何同源子資源在離線且未命中時都會 fallback 成 index.html
        → <script> 拿到 HTML,APP_VERSION 變成 undefined

   伺服器一律送 Cache-Control: max-age=600(模仿 GitHub Pages);
   用 no-store 的 static-server.js 測不出這兩件事,故本檔自帶 versioned-server。
   ============================================================ */
const { test, expect } = require('./support/test');
const { createVersionedServer } = require('./support/versioned-server');
const fs=require('fs');
const path=require('path');
/* 目前版本一律取自單一來源(見 tests/support/version.js);versioned-server 會把
   SW_VERSION／APP_VERSION 改寫成 '<目前版本>-QAGEN<N>'。之前這裡寫死 'v73',
   升版時整個檔會紅 —— 那正是 version.js 當初要消滅的「記得改 N 個地方」。 */
const { appVersion } = require('../support/version');
const VERSION = appVersion();
const PREVIOUS_VERSION = 'v' + (Number(VERSION.slice(1)) - 1);
const V110_WORKER=fs.readFileSync(path.join(__dirname,'..','fixtures','sw-v110-production.js'),'utf8');
const STABLE_V110_MODULES=['navigation-intent.js','diagnostic-impact.js','today-view.js','shopping-photo-store.js','buy-to-ledger.js','ledger-ui-state.js','shopping-ui-state.js','trip-progression.js','schema.js','validator.js'];

/* 每個 test 自己起一台伺服器,並用 port 0 讓 OS 配發:
   - 固定埠會在前一次執行留下 socket 時偶發衝突(實際遇過一次全套執行才失敗、單獨執行通過)
   - 每 test 一台則讓「測 2 中途關掉伺服器」不會影響其他 test 的執行順序 */
let server = null;
let ORIGIN = '';

test.beforeEach(async () => {
  server = createVersionedServer({ generation: 1, versions: { 1: PREVIOUS_VERSION, 2: VERSION } });
  const port = await server.listen(0);
  ORIGIN = 'http://127.0.0.1:' + port;
});

test.afterEach(async () => {
  if (server) { await server.close(); server = null; }
});

async function activeCacheReport(page) {
  return page.evaluate(async () => {
    const report = {};
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      report[key] = {};
      for (const request of await cache.keys()) {
        const pathname = new URL(request.url).pathname;
        if (!/(^\/$|index\.html$|app-version\.js$|builtin-snapshot\.js$|schema\.js$)/.test(pathname)) continue;
        const body = await (await cache.match(request)).text();
        const found = /QAGEN\d+/.exec(body);
        report[key][pathname] = found ? found[0] : '(no marker)';
      }
    }
    return report;
  });
}

async function waitForActiveWorker(page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!(registration && registration.active && navigator.serviceWorker.controller);
  }, null, { timeout: 20000 });
}

/* 在「關掉伺服器模擬斷網」之前必須確定 SHELL 真的已經落進 CacheStorage。
   只等 registration.active 不夠保險 —— 一旦搶在 install 完成前斷網,
   失敗原因會長得像產品缺陷,其實是測試自己的競態。 */
async function waitForShellCached(page,expectedKey,expectedAssets) {
  await page.waitForFunction(async ({expected,assets}) => {
    const keys = await caches.keys();
    if (!keys.length || (expected && !keys.includes(expected))) return false;
    const cache = await caches.open(expected||keys[0]);
    const cached = (await cache.keys()).map((request) => new URL(request.url).pathname);
    return !!navigator.serviceWorker.controller&&assets.every((asset) => cached.some(pathname=>pathname.endsWith('/'+asset)));
  }, {expected:expectedKey||'',assets:expectedAssets||['index.html','app-version.js','builtin-snapshot.js','shopping-photo-store.js','buy-to-ledger.js','schema.js']}, { timeout: 20000 });
  await page.waitForTimeout(200);
}

test('SW 更新後新快取實際裝入新版資源,且 index／版本檔／schema 不混版本', async ({ page }) => {
  if(server)await server.close();
  server=createVersionedServer({
    generation:1,bridgeGeneration:1,versions:{1:PREVIOUS_VERSION,2:VERSION},
    workerSources:{1:V110_WORKER},stablePaths:STABLE_V110_MODULES
  });
  ORIGIN='http://127.0.0.1:'+await server.listen(0);
  await page.goto(ORIGIN + '/index.html');
  await waitForActiveWorker(page);
  await waitForShellCached(page,'okayama-trip-'+PREVIOUS_VERSION+'-QAGEN1',['index.html','app-version.js','shopping-photo-store.js','buy-to-ledger.js','schema.js']);

  /* 第 1 步:舊版資源先進入 HTTP cache(max-age=600),並確認 gen1 已落在 CacheStorage */
  const expectedFirstKey='okayama-trip-'+PREVIOUS_VERSION+'-QAGEN1';
  let first={};
  await expect.poll(async () => {
    first=await activeCacheReport(page);
    return Object.keys(first);
  }, {timeout:20000}).toEqual([expectedFirstKey]);
  const firstKey = Object.keys(first)[0];
  for (const [pathname, marker] of Object.entries(first[firstKey])) {
    expect(marker, pathname + ' 應為 gen1').toBe('QAGEN1');
  }

  /* 第 2 步:同 URL 部署新版 */
  server.setGeneration(2);

  /* The active old worker keeps one coherent generation until the new worker installs. */
  const transitional=await page.evaluate(async() => {
    const [html,app,schema]=await Promise.all([
      fetch('./index.html').then(response=>response.text()),
      fetch('./app-version.js').then(response=>response.text()),
      fetch('./schema.js').then(response=>response.text())
    ]);
    return {
      appVersion:(/APP_VERSION='([^']+)'/.exec(app)||[])[1],
      indexGen:(/QA_INDEX_GEN='([^']+)'/.exec(html)||[])[1],
      schemaGen:(/QA_SCHEMA_GEN='([^']+)'/.exec(schema)||[])[1]
    };
  });
  expect(transitional).toEqual({
    appVersion:PREVIOUS_VERSION+'-QAGEN1',indexGen:'QAGEN1',schemaGen:'QAGEN1'
  });
  const transitionalCache=await activeCacheReport(page);
  for(const marker of Object.values(transitionalCache[expectedFirstKey]))expect(marker).toBe('QAGEN1');

  /* 第 3 步:立即執行 SW update */
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  /* activate 會刪掉舊快取,但刪除是非同步的;輪詢到只剩新快取為止 */
  await expect.poll(async () => page.evaluate(() => caches.keys()), { timeout: 20000 })
    .toEqual(['okayama-trip-'+VERSION+'-QAGEN2']);

  /* 新 CacheStorage 必須裝新版,而不是 HTTP cache 裡的舊版 —— 這是本檔的核心斷言 */
  const second = await activeCacheReport(page);
  expect(Object.keys(second)).toEqual(['okayama-trip-'+VERSION+'-QAGEN2']);
  const entries = second['okayama-trip-'+VERSION+'-QAGEN2'];
  expect(Object.keys(entries).length).toBeGreaterThan(0);
  for (const [pathname, marker] of Object.entries(entries)) {
    const expected=pathname.endsWith('/schema.js')?'QAGEN1':'QAGEN2';
    expect(marker, pathname + ' 必須符合 immutable generation；穩定模組可沿用相同 bytes').toBe(expected);
  }

  /* 第 4 步:activate 後重新載入,network-first 不得再交出 HTTP cache 的舊版 */
  await page.reload();
  await waitForActiveWorker(page);
  /* schema.js 在 index.html 內是**內嵌**的,頁面不會以外部 script 載入它,
     所以這裡改用一次經過 SW 的 fetch 來看「App 現在會拿到哪一版 schema.js」。 */
  const runtime = await page.evaluate(async () => {
    const schema = await (await fetch('./schema.js')).text();
    const found = /QAGEN\d+/.exec(schema);
    return {
      appVersion: typeof APP_VERSION === 'undefined' ? null : APP_VERSION,
      builtinVersion: typeof BUILTIN_ASSET_VERSION === 'undefined' ? null : BUILTIN_ASSET_VERSION,
      indexGen: typeof QA_INDEX_GEN === 'undefined' ? null : QA_INDEX_GEN,
      schemaGen: found ? found[0] : null,
    };
  });
  expect(runtime.appVersion).toBe(VERSION+'-QAGEN2');
  expect(runtime.builtinVersion).toBe(VERSION+'-QAGEN2');
  expect(runtime.indexGen).toBe('QAGEN2');
  expect(runtime.schemaGen).toBe('QAGEN1');
  /* schema 是與 production predecessor byte-identical 的 reused module；三個 version-bearing 資產必須是 gen2。 */
  expect(new Set([runtime.appVersion,runtime.builtinVersion]).size).toBe(1);
});

test('斷網後仍可完整離線載入,且未快取的子資源不得收到 index.html', async ({ page, context }) => {
  server.setGeneration(2);
  await page.goto(ORIGIN + '/index.html');
  await waitForActiveWorker(page);

  await waitForShellCached(page,'okayama-trip-'+VERSION+'-QAGEN2');
  await page.reload();
  await waitForActiveWorker(page);
  await waitForShellCached(page,'okayama-trip-'+VERSION+'-QAGEN2');

  /* 用瀏覽器原生離線模式讓頁面與 SW 的 network fetch 一起失敗；
     直接關 socket 會讓 Chromium 偶發在導覽進入 SW 前先回 ERR_CONNECTION_REFUSED。 */
  await context.setOffline(true);
  await page.waitForFunction(() => navigator.onLine === false);

  /* page.reload() 走 CDP Page.reload,在伺服器剛關閉時偶發直接回 ERR_CONNECTION_REFUSED、
     未形成這裡真正要驗證的正常 navigation request。明確 goto 與下方 deep-link 驗證同路徑。 */
  await page.goto(ORIGIN + '/index.html');
  await waitForActiveWorker(page);
  await waitForShellCached(page,'okayama-trip-'+VERSION+'-QAGEN2');

  /* 導覽請求:離線仍要完整載入 */
  const offline = await page.evaluate(async () => {
    const schemaResponse = await caches.match('./schema.js');
    const schema = schemaResponse ? await schemaResponse.text() : '';
    const found = /QAGEN\d+/.exec(schema);
    return {
      appVersion: typeof APP_VERSION === 'undefined' ? null : APP_VERSION,
      builtinVersion: typeof BUILTIN_ASSET_VERSION === 'undefined' ? null : BUILTIN_ASSET_VERSION,
      indexGen: typeof QA_INDEX_GEN === 'undefined' ? null : QA_INDEX_GEN,
      schemaGen: found ? found[0] : null,
      schemaCached: !!schemaResponse,
      schemaLength: schema.length,
      schemaTail: schema.slice(-80),
      cacheKeys: await caches.keys(),
      hasApp: !!document.getElementById('tripTabs'),
      hasBuyToLedger: typeof TripBuyToLedger !== 'undefined',
    };
  });
  expect(offline.appVersion).toBe(VERSION+'-QAGEN2');
  expect(offline.builtinVersion).toBe(VERSION+'-QAGEN2');
  expect(offline.indexGen).toBe('QAGEN2');
  expect(offline.schemaGen,JSON.stringify(offline)).toBe('QAGEN2');
  expect(offline.hasApp).toBe(true);
  expect(offline.hasBuyToLedger).toBe(true);

  /* 非 navigation 子資源、離線且未快取 → 必須是錯誤回應,不得是 index.html */
  const miss = await page.evaluate(async () => {
    try {
      const response = await fetch('./never-cached-subresource.js');
      const body = await response.text();
      return { rejected:false, status:response.status, type:response.headers.get('content-type'), head:body.slice(0, 40) };
    } catch (error) {
      /* Chromium 在實體伺服器剛關閉時可能把同一個離線 miss 表示為 network rejection；
         安全契約是「錯誤且沒有 HTML body」，SW 的精確 504 實作另由 pwa-shell.test.js 鎖定。 */
      return { rejected:true, status:0, type:null, head:'' };
    }
  });
  expect([0,504]).toContain(miss.status);
  expect(miss.head).not.toContain('<!doctype');
  expect(miss.head).not.toContain('<html');
  expect(miss.head.trim()).toBe('');

  /* 導覽請求、離線且未快取的路徑 → 仍應拿到 index.html(單頁 App 的正常行為)。
     navigate mode 的 Request 無法用 fetch() 手工構造,只能做真的導覽。 */
  await page.goto(ORIGIN + '/deep/link/that/never/existed');
  const navigated = await page.evaluate(() => ({
    indexGen: typeof QA_INDEX_GEN === 'undefined' ? null : QA_INDEX_GEN,
    hasApp: !!document.getElementById('tripTabs'),
  }));
  expect(navigated.indexGen, '離線導覽到未知路徑仍應由 index.html 接手').toBe('QAGEN2');
  expect(navigated.hasApp).toBe(true);
});

test('a mixed-generation App Shell makes the new SW install fail and preserves the active cache',async({page})=>{
  if(server)await server.close();
  server=createVersionedServer({
    generation:1,bridgeGeneration:1,versions:{1:PREVIOUS_VERSION,2:VERSION},
    workerSources:{1:V110_WORKER},stablePaths:STABLE_V110_MODULES,
    resourceVersions:{2:{'shell/v113/builtin-snapshot.js':PREVIOUS_VERSION}}
  });
  ORIGIN='http://127.0.0.1:'+await server.listen(0);
  await page.goto(ORIGIN+'/index.html');
  await waitForActiveWorker(page);
  const oldKey='okayama-trip-'+PREVIOUS_VERSION+'-QAGEN1';
  await waitForShellCached(page,oldKey,['index.html','app-version.js','shopping-photo-store.js','buy-to-ledger.js','schema.js']);
  const before=await page.evaluate(async key=>{
    const cache=await caches.open(key),report={};
    for(const request of await cache.keys()){
      const path=new URL(request.url).pathname;
      if(/(index\.html|app-version\.js|schema\.js)$/.test(path))report[path]=await (await cache.match(request)).text();
    }
    return report;
  },oldKey);
  server.setGeneration(2);
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await page.waitForTimeout(1000);
  await expect.poll(()=>page.evaluate(()=>caches.keys())).toEqual([oldKey]);
  const after=await page.evaluate(async key=>{
    const cache=await caches.open(key),report={};
    for(const request of await cache.keys()){
      const path=new URL(request.url).pathname;
      if(/(index\.html|app-version\.js|schema\.js)$/.test(path))report[path]=await (await cache.match(request)).text();
    }
    return report;
  },oldKey);
  expect(after).toEqual(before);
  await page.reload();
  const runtime=await page.evaluate(async()=>{
    const schema=await fetch('./schema.js').then(response=>response.text());
    return {app:APP_VERSION,hasInlineBuiltin:typeof BUILTIN==='object',asset:typeof BUILTIN_ASSET_VERSION==='undefined'?null:BUILTIN_ASSET_VERSION,index:QA_INDEX_GEN,schema:(/QA_SCHEMA_GEN='([^']+)'/.exec(schema)||[])[1]};
  });
  expect(runtime).toEqual({
    app:PREVIOUS_VERSION+'-QAGEN1',hasInlineBuiltin:true,asset:null,index:'QAGEN1',schema:'QAGEN1'
  });
});

test('version-bound App Shell updates and offline deep links work under the GitHub Pages subpath',async({page,context})=>{
  if(server)await server.close();
  const basePath='/ai-native-projects/';
  server=createVersionedServer({
    generation:1,basePath,bridgeGeneration:1,versions:{1:PREVIOUS_VERSION,2:VERSION},
    workerSources:{1:V110_WORKER},stablePaths:STABLE_V110_MODULES
  });
  ORIGIN='http://127.0.0.1:'+await server.listen(0);
  await page.goto(ORIGIN+basePath+'index.html');
  await waitForActiveWorker(page);
  await waitForShellCached(page,'okayama-trip-'+PREVIOUS_VERSION+'-QAGEN1',['index.html','app-version.js','shopping-photo-store.js','buy-to-ledger.js','schema.js']);
  server.setGeneration(2);
  const transitional=await page.evaluate(async()=>{
    const bodies=await Promise.all(['index.html','app-version.js','schema.js'].map(path=>fetch('./'+path).then(response=>response.text())));
    return bodies.map(body=>(/QAGEN\d+/.exec(body)||[])[0]);
  });
  expect(transitional).toEqual(['QAGEN1','QAGEN1','QAGEN1']);
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await expect.poll(()=>page.evaluate(()=>caches.keys())).toEqual(['okayama-trip-'+VERSION+'-QAGEN2']);
  await page.reload();
  expect(await page.evaluate(()=>[BUILTIN_HTML_VERSION,APP_VERSION,BUILTIN_ASSET_VERSION])).toEqual([
    VERSION+'-QAGEN2',VERSION+'-QAGEN2',VERSION+'-QAGEN2'
  ]);
  await context.setOffline(true);
  await page.goto(ORIGIN+basePath+'deep/link');
  await expect(page.locator('#view-today')).not.toBeEmpty();
  expect(page.url()).toContain(basePath+'deep/link');
});
