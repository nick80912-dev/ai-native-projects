/* ============================================================
   tools/check-app-version.js — 版本一致性檢查
   ============================================================
   目的:讓「版本升級」不再依賴人記得改幾個地方。
   2026-07-30 之前,版本由 sw.js 用 importScripts 匯入 app-version.js 取得,
   看似單一來源;但實證顯示 imported script 會走 HTTP cache,GitHub Pages 的
   max-age=600 會讓版本升級被靜默吃掉。因此 sw.js 改為自帶版本標記 ——
   代價是版本字串出現在兩個檔案,必須由機器守住一致性,而不是靠人。

   檢查項目:
   1. app-version.js 維持單行契約,可解析出 APP_VERSION
   2. sw.js 有頂層 SW_VERSION 標記
   3. 兩者必須完全相等
   4. sw.js 的 CACHE_NAME 由 SW_VERSION 推導(不得寫死字面)
   5. sw.js 不得再 importScripts 任何檔案取版本
   6. sw.js 程式碼(不含註解)不得引用 APP_VERSION
   7. index.html 保有版本安全取值區塊與兩個 helper
   8. index.html 除該區塊外不得裸讀 APP_VERSION(會在版本檔缺失時拋 ReferenceError)
   9. APP_RELEASE_NOTES 最新一筆必須是目前版本

   零相依,Node 內建模組;執行:node tools/check-app-version.js(於 repo 根目錄)
   ============================================================ */
const fs = require('fs');

const HELPER_OPEN = '/* ---- APP_VERSION SAFE ACCESS (C2) ----';
const HELPER_CLOSE = '/* ---- /APP_VERSION SAFE ACCESS ---- */';

const errors = [];
function fail(message) { errors.push(message); }

function read(file) {
  if (!fs.existsSync(file)) { fail('缺少檔案:' + file); return ''; }
  return fs.readFileSync(file, 'utf8');
}

const versionSource = read('app-version.js');
const sw = read('sw.js');
const index = read('index.html');

/* 1 + 2 + 3:兩個版本來源都要解析得出,而且必須相等 */
const appMatch = /^var APP_VERSION='([^']+)';\s*$/.exec(versionSource);
if (!appMatch) fail('app-version.js 必須是單行 `var APP_VERSION=\'vNN\';`,實際:' + JSON.stringify(versionSource.slice(0, 80)));

const swMatch = /^var SW_VERSION='([^']+)';$/m.exec(sw);
if (!swMatch) fail('sw.js 缺少頂層版本標記 `var SW_VERSION=\'vNN\';`');

const appVersion = appMatch && appMatch[1];
const swVersion = swMatch && swMatch[1];
if (appVersion && swVersion && appVersion !== swVersion) {
  fail('版本不一致:app-version.js 是 ' + appVersion + ',sw.js 是 ' + swVersion +
    '(升版時兩個檔案都要改;這正是本檢查存在的理由)');
}

/* 4 + 5 + 6:sw.js 不得回頭依賴 imported 版本 */
if (sw && !/var CACHE_NAME='okayama-trip-'\+SW_VERSION;/.test(sw)) {
  fail('sw.js 的 CACHE_NAME 必須由 SW_VERSION 推導,不得寫死版本字面');
}
if (/importScripts\(/.test(sw)) {
  fail('sw.js 不得 importScripts —— imported script 會經過 HTTP cache,版本升級會被靜默吃掉');
}
const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, '');
if (/\bAPP_VERSION\b/.test(swCode)) {
  fail('sw.js 程式碼不得引用 APP_VERSION(註解說明歷史可以,依賴不行)');
}

/* 7 + 8:index.html 的版本安全取值 */
const helperStart = index.indexOf(HELPER_OPEN);
const helperEnd = index.indexOf(HELPER_CLOSE, helperStart);
if (helperStart < 0 || helperEnd <= helperStart) {
  fail('index.html 缺少版本安全取值區塊的起訖標記(' + HELPER_OPEN.trim() + ')');
} else {
  const helper = index.slice(helperStart, helperEnd);
  if (!/function appVersion\(\)\{/.test(helper)) fail('index.html 缺少 appVersion() helper');
  if (!/function appVersionLabel\(\)\{/.test(helper)) fail('index.html 缺少 appVersionLabel() helper');
  const outside = index.slice(0, helperStart) + index.slice(helperEnd + HELPER_CLOSE.length);
  const bare = (outside.match(/\bAPP_VERSION\b/g) || []).length;
  if (bare) {
    fail('index.html 有 ' + bare + ' 處在安全取值區塊外直接引用 APP_VERSION —— ' +
      '版本檔載不到時會拋 ReferenceError,請改用 appVersion() 或 appVersionLabel()');
  }
}

/* 9:使用者版更新說明的最新一筆要對得上目前版本 */
const notes = /var APP_RELEASE_NOTES=\[\s*\{version:'([^']+)'/.exec(index);
if (!notes) fail('index.html 找不到 APP_RELEASE_NOTES 的第一筆');
else if (appVersion && notes[1] !== appVersion) {
  fail('APP_RELEASE_NOTES 最新一筆是 ' + notes[1] + ',但目前版本是 ' + appVersion + '(升版時要補一筆使用者版說明)');
}

/* 10:Netlify 的防禦性 header(不是修復,見 netlify.toml 註解) */
const netlify = read('netlify.toml');
if (netlify && !/for = "\/app-version\.js"/.test(netlify)) {
  fail('netlify.toml 缺少 /app-version.js 的 Cache-Control 規則(防禦性設定)');
}

if (errors.length) {
  console.error('❌ 版本一致性檢查失敗(' + errors.length + ' 項):');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('✅ 版本一致性檢查通過(' + appVersion + ')');
