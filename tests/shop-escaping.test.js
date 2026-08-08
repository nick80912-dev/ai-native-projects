/* 購物頁 onclick 的屬性跳脫(2026-08-02)
   ============================================================
   四處 onclick 以 `.replace(/'/g,"\\'")` 手工跳脫,只處理單引號。
   內插的值有兩個直接來自 Google 表格:**樓層名稱**(`toggleFloor`)與
   **購物地點名稱**(篩選 chip)。含 `"` 會直接截斷 onclick="…" 屬性,
   含 `&`、`<` 也不安全。repo 早有正確的 jsHtmlAttrString() 並用在別處。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml } = require('./support/source');

const html = readIndexHtml();

/* 這三個函式都含 `/'/g` 這類帶引號的正則字面值,tests/support/source.js 的擷取器
   明載不處理(既有限制),故以具名邊界切片,與 shop-category-tags.test.js 同一手法。 */
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

/* ================= #5:跳脫 ================= */

/* onclick 屬性以雙引號界定,內插值含雙引號時絕不能提前關閉屬性 */
(function () {
  const markup = storeRow(STORE, 'w2:pP001:1F:a"b', false);
  const onclick = /onclick="([^"]*)"/.exec(markup);
  assert(onclick, 'onclick 屬性可被完整解析 —— 值裡的雙引號沒有截斷它');
  assert(onclick[1].indexOf('&quot;') >= 0, '雙引號以實體形式留在屬性內');
  assert(markup.indexOf('a"b') < 0, '原始雙引號不得裸露在 HTML 屬性中');
})();

/* 單引號界定 JS 字串,值含單引號時必須被跳脫 */
(function () {
  const markup = storeRow(STORE, "w2:pP001:1F:a'b", false);
  const onclick = /onclick="([^"]*)"/.exec(markup);
  assert(onclick, 'onclick 屬性可被完整解析');
  assert.match(onclick[1], /toggleWant\('.*\\'.*'\)/, '單引號被反斜線跳脫,不會提前關閉 JS 字串');
})();

/* & 與 < 必須成為實體 —— 實際店名已經含 &(earth music&ecology、H&M) */
(function () {
  const markup = storeRow(STORE, 'w2:pP001:1F:a&b<c', false);
  const onclick = /onclick="([^"]*)"/.exec(markup);
  assert(onclick[1].indexOf('&amp;') >= 0, '& 以實體形式輸出');
  assert(onclick[1].indexOf('&lt;') >= 0, '< 以實體形式輸出');
})();

/* 渲染區段不得再有手工跳脫 */
(function () {
  const start = html.indexOf('function storeRow(');
  const end = html.indexOf('function isSupportedPersonalStateVersion(', start);
  assert(start >= 0 && end > start, '購物頁渲染區段可定位');
  const source = html.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
  assert(source.indexOf("replace(/'/g") < 0, '購物頁不得再以手工 replace 跳脫 onclick');
  const uses = (source.match(/jsHtmlAttrString\(/g) || []).length;
  assert(uses >= 4, '四處內插(店家列／篩選 chip／想逛清單／樓層)全部走 jsHtmlAttrString,實際:' + uses);
})();


console.log('shop escaping tests passed');
