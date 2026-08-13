/* 暫態 UI 狀態的落點與邊界(2026-08-02,v82)
   ============================================================
   三個症狀同一個根因:捲動位置、面板展開、操作焦點都只活在 DOM 裡,重繪即消失。
   本檔鎖住 viewUiState 的**邊界**:它是 session-only 的,不得外洩到任何持久層。

   為什麼這件事要用測試鎖:一旦有人「順手」把它存進 localStorage 或加進備份,
   就會變成跨裝置還原的一部分 —— 把 A 手機的捲動位置還原到 B 手機毫無意義,
   而且會讓備份格式再升一版。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractDeclaration, extractFunction } = require('./support/source');

const html = readIndexHtml();

/* ---- 形狀:四個分頁各有自己的位置 ---- */
const decl = extractDeclaration(html, 'viewUiState');
['today', 'trip', 'shop', 'split'].forEach((view) => {
  assert(decl.indexOf(view + ':') > 0, 'viewUiState 涵蓋 ' + view);
});
assert(decl.indexOf('scrollY') > 0, '保存捲動位置');
assert(decl.indexOf('openPanels') > 0, '行程頁保存面板展開狀態');

/* ---- session-only:不得碰任何持久層 ---- */
assert(decl.indexOf('lsGet') < 0 && decl.indexOf('localStorage') < 0,
  'viewUiState 宣告不得從 localStorage 取值');

/* 備份 payload 不得帶它 */
const exportSource = extractFunction(html, 'personalStateJson');
assert(exportSource.indexOf('viewUiState') < 0, '備份匯出不得包含暫態 UI 狀態');
const applySource = extractFunction(html, 'applyPersonalStatePayload');
assert(applySource.indexOf('viewUiState') < 0, '備份還原不得寫入暫態 UI 狀態');

/* 全域搜尋:viewUiState 不得出現在任何 lsSet／setItem 的左側 */
assert.doesNotMatch(html, /lsSet\(\s*['"][^'"]*viewUiState/, 'viewUiState 不得寫入 localStorage');
assert.doesNotMatch(html, /localStorage\.setItem\([^)]*viewUiState/, 'viewUiState 不得寫入 localStorage');

/* ---- 還原必須是瞬間的 ---- */
/* html{scroll-behavior:smooth} 會讓還原變成動畫:頁面自己滑動,快速切換還會互相打架。
   scrollTo 的 behavior:'auto' 會沿用 CSS 值,必須明寫 'instant'。 */
assert.match(html, /scroll-behavior:smooth/, '前提仍成立:html 確實設了 smooth');
const applyPosition = extractFunction(html, 'applyViewPosition');
assert(applyPosition.indexOf("behavior:'instant'") > 0,
  '捲動還原必須用 instant,否則會被 CSS 的 scroll-behavior:smooth 變成動畫');

/* ---- clamp:還原值不得超過新頁面高度 ---- */
assert(/Math\.min/.test(applyPosition), '還原值必須 clamp 到目前可捲動範圍');

/* ---- 還原在 render 之後 ---- */
const switchSource = extractFunction(html, 'switchView');
const renderAt = switchSource.indexOf('renderCurrent(');
const applyAt = switchSource.indexOf('applyViewPosition(');
assert(renderAt >= 0 && applyAt > renderAt, '位置還原必須排在 renderCurrent 之後');
assert(switchSource.indexOf('window.scrollTo({top:0})') < 0,
  'switchView 不得再無條件捲到頂 —— 那正是本批要修的缺陷');

/* ---- v108 navigation intent: adapter state is transient and uses the real module ---- */
assert.match(html,/var navigationIntentState\s*=/,'navigation intent adapter state is initialized');
const navigationDecl=extractDeclaration(html,'navigationIntentState');
assert(!/lsGet|localStorage/.test(navigationDecl),'navigation intent state is session-only');
assert(!exportSource.includes('navigationIntentState'),'backup export excludes navigation intent state');
assert(!applySource.includes('navigationIntentState'),'backup restore excludes navigation intent state');

const navigationSandbox={TripNavigationIntent:require('../navigation-intent.js')};
vm.createContext(navigationSandbox);
vm.runInContext([
  navigationDecl,
  extractFunction(html,'requestNavigationIntent'),
  extractFunction(html,'consumeNavigationIntent')
].join('\n'),navigationSandbox);
const requested=navigationSandbox.requestNavigationIntent({
  view:'shop',targetId:'shopmall_P001',sourceView:'today',sourceId:'hero',align:'start',announce:'已定位：永旺夢樂城岡山'
});
assert.strictEqual(requested.targetId,'shopmall_P001','adapter preserves the exact requested target');
assert.strictEqual(navigationSandbox.consumeNavigationIntent('trip'),null,'a different view cannot consume the target');
assert.strictEqual(navigationSandbox.consumeNavigationIntent('shop').token,requested.token,'the rendered destination consumes the target once');
assert.strictEqual(navigationSandbox.consumeNavigationIntent('shop'),null,'a consumed target cannot run again');

assert(switchSource.includes('requestNavigationIntent('),'switchView sends explicit entries through the navigation module');
assert(switchSource.includes('applyViewPosition(v)'),'switchView lets applyViewPosition consume the rendered destination');
assert(extractFunction(html,'gotoDay').includes("switchView('trip'"),'gotoDay keeps using the shared switchView seam');
assert(extractFunction(html,'backToNow').includes("switchView('trip'"),'backToNow keeps using the shared switchView seam');

console.log('view UI state tests passed');
