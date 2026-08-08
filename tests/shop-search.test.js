/* 購物頁搜尋的比對範圍與空狀態(2026-08-02)
   ============================================================
   兩件事:
   1. 比對範圍原本只有 s.name。每一列都顯示分類,輸入「服飾」卻找不到任何東西 ——
      看得到卻搜不到,是介面自己造成的期待落差。
   2. 沒命中的購物地點原本仍會渲染一塊只寫著「找不到」的空殼;實測搜尋 UNIQLO
      會產生 3 塊空殼,而全域空狀態因 rendered++ 無條件執行而永不出現。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html, 'shopStoreMatches'), sandbox);
const { shopStoreMatches } = sandbox;

const UNIQLO = { name: 'UNIQLO', cat: '服飾', floor: '4F' };
const MUJI = { name: '無印良品', cat: '生活雜貨', floor: '1F' };
const NO_CAT = { name: 'BEAMS', cat: '', floor: '路面店' };

/* ---- 名稱比對 ---- */
assert.strictEqual(shopStoreMatches(UNIQLO, 'uniqlo'), true, '名稱比對不分大小寫');
assert.strictEqual(shopStoreMatches(UNIQLO, 'UNIQ'), true, '名稱支援部分比對');
assert.strictEqual(shopStoreMatches(MUJI, '無印'), true, '中文名稱部分比對');
assert.strictEqual(shopStoreMatches(UNIQLO, 'zara'), false, '不相關的查詢不得命中');

/* ---- 分類比對(本次新增) ---- */
assert.strictEqual(shopStoreMatches(UNIQLO, '服飾'), true, '分類也要能搜到 —— 每一列都顯示著它');
assert.strictEqual(shopStoreMatches(MUJI, '生活'), true, '分類支援部分比對');
assert.strictEqual(shopStoreMatches(MUJI, '服飾'), false, '分類不符不得命中');
assert.strictEqual(shopStoreMatches(NO_CAT, '服飾'), false, '沒有分類的店不得因空字串而命中');

/* ---- 空查詢 ---- */
assert.strictEqual(shopStoreMatches(UNIQLO, ''), true, '空查詢一律視為命中');
assert.strictEqual(shopStoreMatches(NO_CAT, ''), true, '空查詢對沒有分類的店同樣命中');

/* ---- 殘缺資料不得拋錯 ---- */
assert.strictEqual(shopStoreMatches({}, 'x'), false, '缺欄位的店家不得讓搜尋整個炸掉');
assert.strictEqual(shopStoreMatches(null, 'x'), false, 'null 店家安全回傳 false');

/* ---- 渲染契約:搜尋分支不得再產生逐地點的空殼 ---- */
(function () {
  const start = html.indexOf('function renderShopResults(');
  const end = html.indexOf('function isSupportedPersonalStateVersion(', start);
  assert(start >= 0 && end > start, 'renderShopResults 區段可定位');
  /* 只看實際會輸出的程式碼,註解裡提到「找不到」不算 */
  const source = html.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');

  /* 「找不到」只應該出現在全域空狀態那一處,不再出現在每個購物地點區塊內 */
  const occurrences = (source.match(/找不到/g) || []).length;
  assert.strictEqual(occurrences, 1, '「找不到」只保留全域空狀態一處,不得再逐個購物地點渲染空殼');
  assert(source.indexOf('shopStoreMatches(') > 0, '搜尋一律透過 shopStoreMatches 比對');

  /* debounce 常數存在,且 shopQ 真的用到它 */
  assert.match(html, /var SHOP_SEARCH_DEBOUNCE_MS=\d+;/, 'debounce 間隔是具名常數');
  const shopQSource = extractFunction(html, 'shopQ');
  assert(shopQSource.indexOf('SHOP_SEARCH_DEBOUNCE_MS') > 0, 'shopQ 使用具名的 debounce 間隔');
  assert(shopQSource.indexOf('clearTimeout') > 0, 'shopQ 會取消前一次待執行的重繪');
})();

console.log('shop search tests passed');
