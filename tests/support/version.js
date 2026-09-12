/* tests/support/version.js — 目前版本的單一推導來源(測試用)
   ============================================================
   為什麼要有這個檔:2026-07-30 之前,共 8 個測試檔各自硬編碼 `var APP_VERSION='v72'`,
   每次升版都要記得改 8 個地方 —— 那只是把「記得改兩個地方」換成「記得改八個地方」,
   不是機制性防呆。凡是要斷言「目前版本」的測試,一律從這裡取值。

   ⚠️ 不適用的情況(依 Bar 2026-07-30 裁定,不得機械式替換):
     - 歷史 release note 的版本(v68–v72 等)→ 保留原字面
     - migration／升降版 fixture 的舊版本 → 保留原字面
     - 已淘汰 cache 名稱的負向斷言(如 okayama-trip-v18/v20)→ 保留原字面
   ============================================================ */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

/* App 端版本:目前 generation 的 immutable app-version.js 是唯一來源。 */
function appVersion() {
  const current=swVersion();
  const source = read(path.join('shell',current,'app-version.js'));
  const m = /^var APP_VERSION='([^']+)';\s*$/.exec(source);
  if (!m) throw new Error('current app-version.js 不是預期的單行格式,實際:' + JSON.stringify(source));
  return m[1];
}

/* Service Worker 端版本:sw.js 自帶,刻意與 app-version.js 分開儲存。
   兩者必須相等 —— 這正是 tools/check-app-version.js 在守的不變式。 */
function swVersion() {
  const m = /var SW_VERSION='([^']+)';/.exec(read('sw.js'));
  if (!m) throw new Error('sw.js 缺少頂層 SW_VERSION 版本標記');
  return m[1];
}

function expectedCacheName() {
  return 'okayama-trip-' + swVersion();
}

/* 目前 generation 的路徑與內容 —— 測試不得自己拼 `shell/vNNN/...`。
   2026-09-11:當時 59 個測試檔各自硬編碼 `shell/<current>/index.html`,共 74 處,
   每次升版都要手工掃一遍 —— 正是這個 helper 當初(2026-07-30)要消滅的同一個問題,
   只是從版本字串搬到了路徑層。凡是要取用「目前 generation」的資產,一律走這裡。

   ⚠️ 仍不適用(沿用 Bar 2026-07-30 裁定):合成版本 fixture(v898/v899/v900)、
   歷史 release note 版本、migration 舊版本、已淘汰 cache 名稱的負向斷言 —— 一律保留字面。 */
function shellPath(file) {
  return file ? 'shell/' + swVersion() + '/' + file : 'shell/' + swVersion();
}

/* 目前 generation 的 App 文件內容。取代 fs.readFileSync('shell/vNNN/index.html','utf8')。 */
function appHtml() {
  return read(shellPath('index.html'));
}

module.exports = { root, read, appVersion, swVersion, expectedCacheName, shellPath, appHtml };
