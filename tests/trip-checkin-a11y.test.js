/* 行程打卡控制的語意(2026-08-02,v82)
   ============================================================
   打卡是行程頁最常被點的控制項,卻是
     <div class="chk" onclick="onCheck(...)">
   沒有 role、沒有 tabindex、沒有狀態語意 —— 完全無法以鍵盤操作,
   螢幕閱讀器也讀不出打過卡沒有。這與 v81 為 .store-row 修掉的是同一個缺陷,
   本檔沿用同一套樣板:role="checkbox" + aria-checked + activateKeyboardButton。

   與購物頁的差別:.chk 是一個獨立的小方塊,列內文字不在它裡面,
   因此**必須**自帶 aria-label,否則可及名稱是空的。
   ============================================================ */
const assert = require('assert');
const { readIndexHtml } = require('./support/source');

const html = readIndexHtml();

/* renderItem 含多個正則字面值,用具名邊界切片而非 extractFunction */
const start = html.indexOf('function renderItem(');
const end = html.indexOf('function renderDayHeader(', start) > start
  ? html.indexOf('function renderDayHeader(', start)
  : html.indexOf('function renderTrip(', start);
assert(start >= 0 && end > start, 'renderItem 區段可定位');
const source = html.slice(start, end);

/* ---- 控制項語意 ---- */
assert(source.indexOf('role="checkbox"') > 0, '打卡是 checkbox,不是無語意的 div');
assert(source.indexOf('tabindex="0"') > 0, '打卡可被鍵盤聚焦');
assert(/aria-checked="'\+\(done\?'true':'false'\)\+'"/.test(source),
  'aria-checked 隨打卡狀態變化');
assert(source.indexOf('aria-label') > 0,
  '.chk 內沒有列文字,必須自帶可及名稱,否則螢幕閱讀器只會唸「核取方塊」');
assert(source.indexOf('onkeydown="activateKeyboardButton(') > 0,
  '鍵盤啟用沿用既有 helper(同時支援 Enter 與 Space)');
assert(/aria-hidden="true"/.test(source), '✓ 只是視覺重複,狀態由 aria-checked 承載');

/* ---- 鍵盤與滑鼠必須可區分 ---- */
/* <div tabindex="0"> 被點擊時同樣會取得焦點,無法用 document.activeElement 反推,
   因此由 keydown handler 明確傳旗標。 */
assert(/onCheck\(\\'[^)]*\\',true\)/.test(source) || source.indexOf(",true)") > 0,
  '鍵盤路徑必須明確傳入 fromKeyboard 旗標');
assert.doesNotMatch(source, /onclick="onCheck\([^"]*,\s*true\)/,
  '滑鼠路徑不得傳 fromKeyboard —— 滑鼠操作不主動搶焦點');

/* ---- 焦點還原與 fallback ---- */
const checkStart = html.indexOf('function onCheck(');
const checkEnd = html.indexOf('function renderItem(', checkStart);
const checkSource = html.slice(checkStart, checkEnd);
assert(/function onCheck\(id,fromKeyboard\)/.test(checkSource),
  'onCheck 接受 fromKeyboard 旗標');
assert(checkSource.indexOf('restoreTripCheckFocus(') > 0, '鍵盤打卡後還原焦點');

const restoreStart = html.indexOf('function restoreTripCheckFocus(');
assert(restoreStart > 0, 'restoreTripCheckFocus 存在');
const restoreEnd = html.indexOf('\n}', restoreStart);
const restoreSource = html.slice(restoreStart, restoreEnd);
assert(restoreSource.indexOf('trip-filter-btn') > 0,
  '沒有下一筆時退到篩選按鈕,而不是把焦點丟掉');

/* ---- 焦點看得見 ---- */
assert.match(html, /\.chk:focus-visible\{[^}]*outline:/, '打卡控制有可見的鍵盤焦點外框');

/* ---- 行程篩選(v133 backlog #46 起以 aria-pressed 暴露狀態) ----
   v186(Bar 2026-11-11 UI/UX 第 3 項):整列兩格切換改成一個小開關「隱藏已完成」。
   仍是 aria-pressed 按鈕;class 名稱 .trip-filter-btn 刻意保留 —— 上面的焦點還原退路靠它。 */
assert.match(html, /class="trip-filter-btn trip-hide-toggle'\+\(tripHideDone\?' on':''\)\+'" aria-pressed="'\+\(tripHideDone\?'true':'false'\)\+'" onclick="setTripHideDone\(!tripHideDone\)"/,
  '「隱藏已完成」是一個以 aria-pressed 暴露狀態的開關');
assert.doesNotMatch(html, /trip-filter-track/, '舊的兩格 segmented 篩選與其樣式已移除');
assert.match(html, /\.trip-hide-toggle\{[^}]*min-height:32px/, '小開關仍保有可點的高度');

console.log('trip check-in a11y tests passed');
