/* 店家列的控制項語意與鍵盤操作(2026-08-02)
   ============================================================
   店家列是購物頁最常被點的控制項(實測 101 家店),卻是
   `<div class="store-row" onclick="toggleWant(…)">` —— 沒有 role、沒有 tabindex、
   沒有狀態語意;勾選與否只是 .st-chk 裡的一個 ✓ 字元。完全無法以鍵盤操作,
   螢幕閱讀器也讀不出已勾選。

   採 role="checkbox" + aria-checked 而非 role="button" + aria-pressed:
   這是二元選取,視覺上本來就是核取方塊,語音回報「未勾選／已勾選」比「按鈕」精確。
   觸控區維持現狀(實測 63px,本來就足夠)。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();

function slice(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert(start >= 0 && end > start, '找不到區段:' + startMarker);
  return html.slice(start, end);
}

const sandbox = { escapeHtml(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); } };
vm.createContext(sandbox);
vm.runInContext(slice('function jsString(', 'function timestampDate('), sandbox);
vm.runInContext(slice('function storeRow(', 'function renderShop('), sandbox);
const { storeRow } = sandbox;

const STORE = { name: 'UNIQLO', cat: '服飾', floor: '4F', must: '', taxfree: '', note: '' };


(function () {
  const off = storeRow(STORE, 'w2:pP001:4F:UNIQLO', false);
  const on = storeRow(STORE, 'w2:pP001:4F:UNIQLO', true);

  assert(off.indexOf('role="checkbox"') > 0, '店家列是 checkbox 而不是無語意的 div');
  assert(off.indexOf('tabindex="0"') > 0, '店家列可被鍵盤聚焦');
  assert(off.indexOf('aria-checked="false"') > 0, '未勾選時 aria-checked 為 false');
  assert(on.indexOf('aria-checked="true"') > 0, '已勾選時 aria-checked 為 true');
  assert(off.indexOf('onkeydown="activateKeyboardButton(') > 0, '鍵盤啟用沿用既有 helper');
  assert.match(off, /class="st-chk[^"]*"\s+aria-hidden="true"/, '✓ 只是視覺重複,狀態由 aria-checked 承載');

  /* 可及名稱取自列內文字,不另造 aria-label */
  assert(off.indexOf('aria-label') < 0, '不另造 aria-label —— 列內文字即為可及名稱');
  assert(off.indexOf('UNIQLO') > 0 && off.indexOf('服飾') > 0, '店名與分類仍在可及名稱內');
})();

/* 就地更新必須同步 aria-checked,否則語音狀態與畫面不一致 */
(function () {
  const source = extractFunction(html, 'applyWantToggleInPlace');
  assert(source.indexOf('aria-checked') > 0, '就地更新同步 aria-checked');
})();

/* 鍵盤焦點必須看得見 */
assert.match(html, /\.store-row:focus-visible\{[^}]*outline:/, '店家列有可見的鍵盤焦點外框');

/* 重繪會把整個 DOM 換掉,焦點會掉回 body —— 鍵盤使用者連按第二下就沒有作用 */
(function () {
  const source = extractFunction(html, 'toggleWant');
  assert(source.indexOf('focusShopRow(') > 0, '重繪後把鍵盤焦點放回同一家店');
  assert(source.indexOf('data-want') > 0, '只在焦點原本就在該列時才還原,滑鼠點選不搶焦點');
  extractFunction(html, 'focusShopRow');
})();

console.log('shop row a11y tests passed');
