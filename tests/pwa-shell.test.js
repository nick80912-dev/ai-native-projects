const assert = require('assert');
const { appVersion, swVersion } = require('./support/version');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function assertPngSize(filePath, expectedSize) {
  const png = fs.readFileSync(filePath);
  assert.strictEqual(png.readUInt32BE(16), expectedSize, `${path.basename(filePath)} width is ${expectedSize}px`);
  assert.strictEqual(png.readUInt32BE(20), expectedSize, `${path.basename(filePath)} height is ${expectedSize}px`);
}

const indexPath = path.join(root, 'index.html');
const manifestPath = path.join(root, 'manifest.webmanifest');
const serviceWorkerPath = path.join(root, 'sw.js');
const versionPath = path.join(root, 'app-version.js');
const netlifyPath = path.join(root, 'netlify.toml');
const peachBadgePath = path.join(root, 'okayama-peach-badge.png');

assert.ok(fs.existsSync(indexPath), 'PWA entrypoint index.html exists');
assert.ok(fs.existsSync(manifestPath), 'web app manifest exists');
assert.ok(fs.existsSync(serviceWorkerPath), 'service worker exists');
assert.ok(fs.existsSync(versionPath), 'shared app-version.js exists');
assert.ok(fs.existsSync(netlifyPath), 'Netlify configuration exists');
assert.ok(fs.existsSync(peachBadgePath), 'header peach badge exists');
const peachBadge = fs.readFileSync(peachBadgePath);
assert.strictEqual(peachBadge.readUInt32BE(16), 256, 'peach badge is 256px wide');
assert.strictEqual(peachBadge.readUInt32BE(20), 256, 'peach badge is 256px high');
assert.strictEqual(
  sha256(peachBadgePath),
  '0B048181F89CA9D602CC6DCDE07C9242AA0D7CDB87BE47FB82DD72EB2B449D2C',
  'header peach badge remains byte-for-byte unchanged',
);
assert.ok(!fs.existsSync(path.join(root, 'okayama-traveler-icon.png')), 'rejected traveler asset is absent');

const index = fs.readFileSync(indexPath, 'utf8');
const versionSource = fs.readFileSync(versionPath, 'utf8');
assert.match(versionSource, /^var APP_VERSION='v\d+';\s*$/, 'app-version.js keeps its single-line contract');
assert.strictEqual(appVersion(), swVersion(), 'app-version.js and the sw.js version marker agree');
assert.match(index, /<script src="app-version\.js"><\/script>/, 'index loads the shared version before the inline app');
assert.match(index, /<title>TripPilot<\/title>/, 'index uses the TripPilot browser title');
assert.match(index, /<link rel="manifest" href="manifest\.webmanifest">/, 'index links the manifest');
assert.match(index, /<link rel="icon" type="image\/png" sizes="32x32" href="icon-32\.png">/, 'index links the favicon');
assert.match(index, /<link rel="apple-touch-icon" sizes="180x180" href="icon-180\.png">/, 'index links the Apple touch icon');
assert.match(index, /navigator\.serviceWorker\.register\('sw\.js'\)/, 'index registers the service worker');

assert.match(index, /<img class="logo" id="diagnosticBadge" src="okayama-peach-badge\.png" alt="岡山桃子">/, 'header uses the diagnostic peach badge');
assert.match(index, /id="brandTitle"/, 'header keeps the dynamic itinerary title');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.start_url, './index.html', 'manifest starts at the deploy entrypoint');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-192.png'), 'manifest includes the 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-512.png'), 'manifest includes the 512px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-192.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-512.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 512px icon');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
/* ---- 2026-07-30 反向改寫的三項契約(原契約鎖的正是本批要移除的設計)----
   舊契約:sw.js 必須 importScripts app-version.js、CACHE_NAME 必須由 imported APP_VERSION 推導、
           sw.js 不得出現版本字面。
   C1／C1.5 實證推翻了它:imported script 在 updateViaCache 預設值 'imports' 下會走 HTTP cache,
   GitHub Pages 的 max-age=600 因此吃掉版本升級。版本必須寫在 sw.js 頂層。
   這裡是「反向改寫」而非刪除 —— 新契約同樣被鎖住,不允許回頭。 */
assert.match(serviceWorker, /^var SW_VERSION='v\d+';$/m, 'service worker carries its own top-level version marker');
assert.match(serviceWorker, /var CACHE_NAME='okayama-trip-'\+SW_VERSION;/, 'cache name derives from the service worker own version');
assert.doesNotMatch(serviceWorker, /importScripts\(/, 'service worker no longer imports any script for its version');
/* 只看程式碼:註解刻意保留 APP_VERSION 的來龍去脈,那是說明不是依賴 */
const swCode = serviceWorker.replace(/\/\*[\s\S]*?\*\//g, '');
assert.doesNotMatch(swCode, /\bAPP_VERSION\b/, 'service worker code never references the imported APP_VERSION');
assert.match(serviceWorker, /'\.\/app-version\.js'/, 'App Shell still caches the version file for the App and offline use');
assert.doesNotMatch(serviceWorker, /okayama-trip-v72/, 'retired v72 cache is not retained');
assert.doesNotMatch(serviceWorker, /okayama-trip-v18/, 'retired v18 cache is not retained');

/* ---- C1.5 實證的 cache mode 契約 ---- */
assert.match(serviceWorker, /new Request\(url, \{ cache:'reload' \}\)/, 'install refetches the shell bypassing the HTTP cache');
assert.match(serviceWorker, /fetch\(new Request\(e\.request, \{ cache:'no-cache' \}\)\)/, 'network-first revalidates instead of trusting the HTTP cache');

/* ---- fallback 資源型別契約(Test D 實證:子資源拿到 index.html 會被當 JS 解析)---- */
assert.match(serviceWorker, /var isNavigate = e\.request\.mode === 'navigate';/, 'the fetch handler distinguishes navigation requests');
assert.match(serviceWorker, /if\(isNavigate\) return caches\.match\('\.\/index\.html'\)/, 'only navigations fall back to index.html');
assert.match(serviceWorker, /function offlineMiss\(\)/, 'non-navigation cache misses get a dedicated offline response');
assert.match(serviceWorker, /status: 504/, 'the offline miss response is an error status, not HTML');
assert.match(serviceWorker, /'\.\/icon-maskable-192\.png'/, 'service worker caches the maskable 192px icon');
assert.match(serviceWorker, /'\.\/icon-maskable-512\.png'/, 'service worker caches the maskable 512px icon');

const appBuild = index.match(/var APP_BUILD=/);
assert.strictEqual(appBuild, null, 'retired diagnostic build metadata stays absent');

const netlify = fs.readFileSync(netlifyPath, 'utf8');
assert.match(netlify, /for = "\/sw\.js"/, 'Netlify disables caching for the service worker');
assert.match(netlify, /for = "\/index\.html"/, 'Netlify disables stale entrypoint caching');
assert.match(netlify, /for = "\/app-version\.js"/, 'Netlify pins the version file header as a defensive measure');

/* ---- index.html:APP_VERSION 一律走安全 helper(缺檔時不得 ReferenceError)---- */
assert.match(index, /function appVersion\(\)\{/, 'index defines the safe version accessor');
assert.match(index, /function appVersionLabel\(\)\{/, 'index defines the display-safe version accessor');
assert.match(index, /appVersion:travelNoteBoundedText\(appVersion\(\),24\)/, 'travel notes read the version through the helper');
assert.match(index, /SW '\+escapeHtml\(appVersionLabel\(\)\)/, 'the data-and-version page reads the version through the helper');
const releaseNotes = /var APP_RELEASE_NOTES=\[([\s\S]*?)\n\];/.exec(index);
assert.ok(releaseNotes, 'release notes list is present');
assert.ok(releaseNotes[1].includes("{version:'" + appVersion() + "'"), 'release notes carry an entry for the current version');

for (const size of [16, 32, 120, 152, 167, 180, 192, 512]) {
  const iconPath = path.join(root, `icon-${size}.png`);
  assert.ok(fs.existsSync(iconPath), `icon-${size}.png exists`);
  assertPngSize(iconPath, size);
}
for (const size of [192, 512]) {
  const iconPath = path.join(root, `icon-maskable-${size}.png`);
  assert.ok(fs.existsSync(iconPath), `icon-maskable-${size}.png exists`);
  assertPngSize(iconPath, size);
}
assert.notStrictEqual(
  sha256(path.join(root, 'icon-512.png')),
  '2879A46287F38D9B9AF7DC2E296B54530A41ACA0861B4D2F639C86BDDB061BB6',
  'the legacy 512px PWA icon has been replaced',
);

console.log('PWA shell tests passed');
