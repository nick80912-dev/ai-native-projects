/* 篩選 chip 的數量語意(2026-08-02)
   ============================================================
   同一個視覺樣式,三種不同實體:
     全部 5   → 商場數
     想逛 2   → 想逛「店家」數
     永旺… 24 → 該商場的店家數
   使用者無從分辨。這裡不硬把資料含義統一,只讓兩個語意含糊的**全域** chip
   把單位寫出來;各購物地點 chip 維持純數字 —— 名稱＋數字在情境中已無歧義。

   單位文字必須放在計數元素**之外**,否則 #shopWantTotal 的就地更新
   (applyWantToggleInPlace)會把單位一起洗掉。
   ============================================================ */
const assert = require('assert');
const { readIndexHtml } = require('./support/source');

const html = readIndexHtml();

const start = html.indexOf('function renderShopResults(');
const end = html.indexOf('function isSupportedPersonalStateVersion(', start);
assert(start >= 0 && end > start, 'renderShopResults 區段可定位');
const source = html.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');

/* 全域 chip:單位寫出來 */
assert(source.indexOf("'全部<small>'+malls.length+' 個地點</small>'") > 0
  || /全部<small>'\+malls\.length\+' 個地點/.test(source),
  '「全部」chip 標明計數的是地點數');
assert(/想逛<small><span id="shopWantTotal">'\+wantTotal\+'<\/span> 家<\/small>/.test(source),
  '「想逛」chip 標明計數的是家數,且單位在計數元素之外');

/* 各購物地點 chip 維持純數字 */
assert(/escapeHtml\(label\)\+'<small>'\+m\.stores\.length\+'<\/small>/.test(source),
  '各購物地點 chip 維持純數字,不加單位');

/* 就地更新仍只碰數字 —— 單位不得落在 #shopWantTotal 內 */
const spanStart = source.indexOf('<span id="shopWantTotal">');
const spanEnd = source.indexOf('</span>', spanStart);
assert(spanStart >= 0 && spanEnd > spanStart, '#shopWantTotal 是獨立的計數元素');
const inner = source.slice(spanStart + '<span id="shopWantTotal">'.length, spanEnd);
assert.strictEqual(inner, "'+wantTotal+'", '#shopWantTotal 內只有數字,單位在外');

console.log('shop chip label tests passed');
