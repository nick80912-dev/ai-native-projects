/* app-version.js 缺失時的降級契約(2026-07-30 C2)
   ============================================================
   背景:app-version.js 是獨立外部 script。離線且 CacheStorage 未命中、或部署缺檔時,
   `var APP_VERSION` 根本不存在,任何裸讀都是 ReferenceError。
   2026-07-30 的隔離實驗實測到:舊版 SW 在此情境下會把 index.html 當成 app-version.js
   回傳,APP_VERSION 變成 undefined,而 renderSettingsDataPage() 直接拋錯 —— 使用者
   要用來做備份／還原的那一頁整頁打不開。

   本檔鎖住的契約:
     1. appVersion() 取不到時回空字串,appVersionLabel() 回「未知」,兩者都不得拋錯
     2. renderSettingsDataPage() 在完全沒有 APP_VERSION 的環境下仍能算出 HTML
     3. index.html 內不得有 helper 以外的裸讀 APP_VERSION
   ============================================================ */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' exists');
  let cursor = source.indexOf('{', start), depth = 0;
  for (; cursor < source.length; cursor++) {
    if (source[cursor] === '{') depth++;
    if (source[cursor] === '}') depth--;
    if (depth === 0) return source.slice(start, cursor + 1);
  }
  throw new Error('could not extract ' + name);
}

const HELPER_OPEN = '/* ---- APP_VERSION SAFE ACCESS (C2) ----';
const HELPER_CLOSE = '/* ---- /APP_VERSION SAFE ACCESS ---- */';
const helperStart = html.indexOf(HELPER_OPEN);
const helperEnd = html.indexOf(HELPER_CLOSE, helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'the safe-access block keeps its stable markers');
const helperSource = html.slice(helperStart, helperEnd);

/* ---- 1. helper 在沒有 APP_VERSION 的環境下的行為 ---- */
const bare = vm.createContext({});
vm.runInContext(helperSource, bare);
assert.strictEqual(bare.appVersion(), '', 'appVersion() degrades to an empty string');
assert.strictEqual(bare.appVersionLabel(), '未知', 'appVersionLabel() degrades to 未知');

/* 有版本時照常回傳 */
const withVersion = vm.createContext({ APP_VERSION: 'v99' });
vm.runInContext(helperSource, withVersion);
assert.strictEqual(withVersion.appVersion(), 'v99', 'appVersion() returns the real version when present');
assert.strictEqual(withVersion.appVersionLabel(), 'v99', 'appVersionLabel() returns the real version when present');

/* 空字串與非字串也不得漏出去 */
for (const bad of ['', null, undefined, 0, {}]) {
  const ctx = vm.createContext({ APP_VERSION: bad });
  vm.runInContext(helperSource, ctx);
  assert.strictEqual(ctx.appVersion(), '', 'appVersion() rejects ' + JSON.stringify(bad));
  assert.strictEqual(ctx.appVersionLabel(), '未知', 'appVersionLabel() rejects ' + JSON.stringify(bad));
}

/* ---- 2. 資料與版本頁在沒有 APP_VERSION 時仍可算出 HTML ---- */
const dataPage = vm.createContext({
  escapeHtml(value) { return String(value); },
  renderSettingsHeader(title) { return '<h2>' + title + '</h2>'; },
  renderAppReleaseNotes() { return '<div class="settings-release-list"></div>'; },
});
vm.runInContext(helperSource, dataPage);
vm.runInContext(extractFunction(html, 'renderSettingsDataPage'), dataPage);

let markup;
assert.doesNotThrow(() => { markup = dataPage.renderSettingsDataPage(); },
  'the data-and-version page opens even when app-version.js never loaded');
assert.ok(markup.includes('SW 未知'), 'a missing version degrades to SW 未知 instead of throwing');
assert.ok(markup.includes('複製備份 JSON') && markup.includes('從 JSON 還原'),
  'backup and restore stay reachable without the version file');

/* 有版本時顯示真實版本 */
const dataPageOk = vm.createContext({
  APP_VERSION: 'v99',
  escapeHtml(value) { return String(value); },
  renderSettingsHeader(title) { return '<h2>' + title + '</h2>'; },
  renderAppReleaseNotes() { return ''; },
});
vm.runInContext(helperSource, dataPageOk);
vm.runInContext(extractFunction(html, 'renderSettingsDataPage'), dataPageOk);
assert.ok(dataPageOk.renderSettingsDataPage().includes('SW v99'), 'the real version is shown when available');

/* ---- 3. index.html 內不得有 helper 以外的裸讀 ---- */
/* 結束標記本身也含 APP_VERSION 字樣,一併排除 */
const outsideHelper = html.slice(0, helperStart) + html.slice(helperEnd + HELPER_CLOSE.length);
const bareReads = outsideHelper.match(/\bAPP_VERSION\b/g) || [];
assert.deepStrictEqual(bareReads, [],
  '除了安全取值區塊,index.html 任何地方都不得直接引用 APP_VERSION(改用 appVersion()／appVersionLabel())');

console.log('app-version fallback tests passed');
