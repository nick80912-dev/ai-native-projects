# CURRENT(現在正在做的)

> 更新於 2026-07-20。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- Ledger 2.2.5 日期金額、操作 Popover 與團體分攤精修已實作：日期右側雙幣加總為 9px；Popover 為 118px 並支援同鍵收合；帳單與單項分攤共用淡綠群組，新建團體草稿維持全員預選。SW cache 順延至 v33，等待 Bar 手機驗收。
- Ledger 2.2.5 消費卡與日期加總已實作：卡片右側雙幣金額／`⋯` 垂直置中；首頁最新日及完整紀錄日期列新增固定 `¥JPY ≈ NT$TWD` 加總；完整紀錄結果摘要縮為 11px。SW cache 順延至 v32，等待 Bar 手機驗收。
- Ledger 2.2.5 已依 iOS App 實機截圖再修正時間欄：專用 flex wrapper 接管寬度，原生 time input 改由零 flex basis 填滿，避免 `width:100%` 在 iOS 吃掉右側群組 padding；SW cache 順延至 v31，等待 Bar 真機複驗。
- Ledger 2.2.5 時間欄位右側對齊補正已實作：單／多品項共用 datetime grid、field wrapper 與 input 的 bounded content-box 規則，時間右側與日期欄一致且保留白底群組內距；Service Worker cache 由 v29 順延至 v30。
- Ledger 2.2.5 第二輪手機回饋精修已實作：單品項代購改為無重複標題的淡暖紅群組列並將 Toggle 靠右；單／多品項日期與時間皆改為上下直列且維持既有字級與月曆線條 SVG；新增代購對象控制移至對象按鈕下方完整列。Service Worker cache 已由 v28 順延至 v29。
- Ledger 2.2.5 第一輪手機回饋精修已實作：完整紀錄選取時 batch 預設收合並可點卡展開；多品項代購採 A 精修版、單品項代購採 B 開關，兩者共用既有代購 state 與 renderer；日期／時間版型已由本輪直列設計取代。
- Ledger 2.2.5 已在 `dev` 完成增量實作，等待 Bar 手機驗收，未經 Bar 驗收不得標示完成。Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄；Repository、Queue、Apps Script、結算、墓碑資料契約及 localStorage key 均未變更。
- 最近消費改為依目前個人／團體及正式／TEST 軌別，只顯示最新一個仍有有效消費的日期及該日全部實體紀錄；最新日全刪後回退下一個有效日期，batchId 摘要維持既有行為。
- 完整紀錄延用同一套 `selectionMode`／`selectedRecordIds`、卡片 renderer、batch 三態與刪除流程；全選限定目前搜尋／篩選結果，個人維持本機真刪，團體維持逐筆墓碑並以既有 `enqueueBatch` 一次入列。
- 篩選面板已加入保留搜尋字的「清除篩選」；類別與支付方式改為 34px／8px 圓角矩形，支援換行及截斷，兩區重用 `ledger-entry-divider`。現行產品沒有日期範圍 filter state，日期／類別仍是分組控制。
- 底部分帳按鈕可從導航實際可點擊的完整紀錄返回分帳首頁，首頁再次點擊捲頂；Bottom Sheet、明細、資訊面板與對話框仍覆蓋導航，不強制顯示且不會丟失未儲存表單。Service Worker cache 最新為 v33。

## 🔨 進行中
- 本輪日期金額／Popover／團體分攤已通過 TDD 與 375px／390px Browser QA：日期 9px、結果摘要 11px、Popover 118px／12px／同鍵收合、帳單與單項分攤共用群組、新建團體草稿全員預選、無水平溢出且 `pageerror=0`；仍等待 Bar 手機驗收。
- 消費卡／日期加總已依 TDD 通過 helper、首頁最新日、完整紀錄搜尋／篩選範圍、按類別排除、卡片右側置中與 11px 摘要測試；375px／390px Browser QA 通過固定雙幣加總、垂直中心、無水平溢出及 `pageerror=0`。
- iOS 時間欄位第三輪修正已依 TDD 加入專用 wrapper 與零 flex basis 回歸斷言；桌面瀏覽器檢查僅作一般回歸，不再視為 iOS Safari 實機驗收，最終寬度結果等待 Bar 複驗。
- 時間欄位補正已通過 375px／390px Browser QA：單／多品項的日期與時間 input 右邊界誤差均不超過 1px，群組右側保留至少 10px 內距；模擬 Dynamic Type 115% 時 `12:05`／`22:15` 完整，無水平溢出且 `pageerror=0`。仍待 Bar iOS Safari 真機驗收。
- 第二輪精修已通過 38 個 Node tests、文件標題檢查及 375px／390px Browser QA：單／多品項日期時間直列、既有 12px 標籤／16px 輸入字級、月曆線條 SVG、淡暖紅代購列、右側 Toggle、對象置中與新增對象下移皆符合；無水平溢出且 `pageerror=0`。
- 本輪精修已依 TDD 驗證：全套 38 個 Node tests 與文件標題檢查通過；375px／390px Browser QA 通過 batch 預設收合／點卡展開、半選狀態、日期 Popover、單品項 B 開關、多品項 A 精修版、28px 對象、30px 新增控制、無水平溢出及 `pageerror=0`。允許檔案 diff 稽核僅有 `index.html`、`sw.js`、必要 tests、`07_CHANGELOG.md` 與本檔。
- 38 個 `tests/*.test.js` 逐一以 Node 執行及文件標題檢查皆通過；允許檔案 diff 稽核未發現 Schema、Apps Script、Repository／Queue、結算、墓碑契約、治理文件或非分帳頁變動。
- 375px／390px Browser QA 已通過最新日 1／3／10 筆、完整紀錄選取與半選、個人／團體批次刪除、清除篩選、34px／8px 篩選矩形、divider、分帳 tab 返回、隱藏導航、Dynamic Type 115%、無水平溢出及 `pageerror=0`；仍等待 Bar 真機驗收。

## ⏸ 等 Bar 動作
1. 驗收 dev 的 375px／390px 與 iOS 真機：最新日最近消費、完整紀錄多選、個人／團體批次刪除、清除篩選、篩選版面、分帳 tab 快捷返回及主頁捲頂。
2. 回歸 Dynamic Type 115%、未儲存表單、TEST／正式隔離、batchId、Queue、墓碑、結算與離線補送；未經 Bar 驗收不得標示完成。
3. 驗收通過後再核准 PR merge `dev → main`；本批不得部署 Netlify。

## 下一棒
→ 等待 Bar 手機驗收；通過後另案處理 `dev → main`。回滾依 `16_OPS_PLAYBOOK.md` §A。

## Ledger 消費卡與日期加總設計（2026-07-20，已實作，待 Bar 驗收）

### 消費卡右側對齊
- 首頁最近消費與完整紀錄共用同一規則：卡片右側雙幣金額及 `⋯` 功能鈕改為垂直置中，兩者維持平行。
- 單筆卡與多品項摘要卡皆適用；多品項展開後的子卡沿用相同規則。
- 採 Grid 原生對齊，不使用固定 top、額外向下 margin、負 margin 或 transform，避免不同卡片高度再次偏移。
- 選取模式仍不 render `⋯`，checkbox、卡片高度、開明細與 batch 展開行為不變。

### 首頁最新日摘要
- 「最近消費」下方摘要列左側維持 `YYYY/MM/DD · N 筆紀錄`，右側新增該最新有效日期的加總：`¥3,500 ≈ NT$770`。
- 雙幣順序固定為 JPY 再 TWD，不隨首頁顯示幣別切換；字級、字重與顏色沿用現有日期／筆數次要樣式。
- 金額取目前個人／團體及正式／TEST 軌別最新有效日期內的全部有效實體紀錄；多品項逐筆加總一次，不因 batch 摘要卡重複計算。
- 刪除最新日全部紀錄並回退下一有效日期時，日期、筆數與雙幣加總同步更新。

### 完整紀錄日期加總
- 按日期分組時，每個日期標題列右側顯示該組加總：`¥3,500 ≈ NT$770`；日期與金額保持同一列。
- 加總範圍只包含目前搜尋與篩選後仍顯示的有效實體紀錄，搜尋、篩選、清除篩選或刪除後立即重算。
- 按類別分組時不顯示日期日加總，避免類別名稱被誤認為日期摘要。
- 個人／團體、正式／TEST、墓碑排除及既有有效紀錄規則維持不變。

### 完整紀錄結果摘要
- 完整紀錄日期上方的 `找到 N 筆 · 金額` 摘要改為 11px，沿用次要灰色並降低視覺層級。
- 摘要格式使用固定雙幣順序：`找到 12 筆 · ¥3,500 ≈ NT$770`，筆數與金額同樣只計算目前搜尋／篩選結果。

### 手機與資料限制
- 日期摘要列採左右雙欄布局；右側雙幣金額保持單行，375px／390px 優先縮小欄間距，不縮字、不截斷金額且不得產生水平捲動。
- 不新增 Schema、資料欄位、localStorage key 或永久 state；所有加總均由目前 renderer 收到的有效紀錄即時計算。
- 不修改 Repository、Queue／Retry／Flush、結算、墓碑契約或 Apps Script。

### 驗收重點
- 首頁及完整紀錄的單筆／batch 卡：金額與 `⋯` 垂直置中，選取模式行為不變。
- 首頁最新日日期、實體筆數與固定 `JPY ≈ TWD` 加總正確，最新日刪除後同步回退。
- 完整紀錄按日期的每日加總只計搜尋／篩選結果；按類別不顯示日加總。
- `找到 N 筆 · ¥JPY ≈ NT$TWD` 為 11px 次要摘要。
- 375px／390px 無截斷、無水平溢出，個人／團體與正式／TEST 隔離正確。

# Ledger Card Alignment and Daily Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將消費卡右側金額與 `⋯` 垂直置中，並在首頁最新日與完整紀錄日期列加入固定 `JPY ≈ TWD` 的即時加總。

**Architecture:** 在 `index.html` 增加純函式 `ledgerAmountTotals(records)` 與 `formatLedgerInlineTotals(totals)`，所有首頁、日期分組及完整紀錄摘要共用，避免三處各自計算。日期摘要由共用 renderer 產生，輸入永遠是目前 renderer 已隔離及篩選後的有效實體紀錄；不建立持久 state，也不改資料契約。

**Tech Stack:** Vanilla HTML／CSS／JavaScript、Node `assert` tests、既有靜態單檔 renderer、Service Worker app shell。

## Global Constraints

- 僅修改 `index.html`、`sw.js`、必要既有 tests、`07_CHANGELOG.md` 與 `tasks/current.md`。
- 不修改 Schema、Apps Script、Repository、Queue／Retry／Flush、結算、墓碑契約、localStorage key、資料欄位、治理文件或非分帳頁。
- 雙幣格式固定為 `¥3,500 ≈ NT$770`，不隨首頁 display currency 切換順序。
- 完整紀錄日期加總與結果摘要只計目前搜尋／篩選後結果；按類別分組不顯示日加總。
- 375px／390px 不得截斷右側雙幣金額或產生水平捲動。
- 若修改 app shell，`CACHE_NAME` 只從 v31 順延至 v32；不得修改 SHELL、install、activate 或 fetch。

---

### Task 1: 共用雙幣加總與格式函式

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `index.html:4563-4565`

**Interfaces:**
- Consumes: `{amountJpy:number|string, amountTwd:number|string}[]`。
- Produces: `ledgerAmountTotals(records) -> {amountJpy:number, amountTwd:number}`。
- Produces: `formatLedgerInlineTotals(totals) -> string`，固定回傳 `¥JPY ≈ NT$TWD`。

- [ ] **Step 1: 先寫失敗測試**

在 `tests/ledger-225.test.js` 的 renderer sandbox 載入兩個新函式，加入：

```js
const totals=plain(rendererSandbox.ledgerAmountTotals([
  {amountJpy:1200,amountTwd:264},
  {amountJpy:'2300',amountTwd:'506'}
]));
assert.deepStrictEqual(totals,{amountJpy:3500,amountTwd:770});
assert.strictEqual(rendererSandbox.formatLedgerInlineTotals(totals),'¥3,500 ≈ NT$770');
```

- [ ] **Step 2: 執行測試並確認因函式不存在而失敗**

Run: `node tests/ledger-225.test.js`

Expected: FAIL，訊息包含 `ledgerAmountTotals is not a function` 或 sandbox 尚未定義該函式。

- [ ] **Step 3: 加入最小純函式實作**

在 `formatLedgerCurrencyAmount` 附近加入：

```js
function ledgerAmountTotals(records){
  return (records||[]).reduce(function(sum,record){
    sum.amountJpy+=Number(record&&record.amountJpy||0);
    sum.amountTwd+=Number(record&&record.amountTwd||0);
    return sum;
  },{amountJpy:0,amountTwd:0});
}
function formatLedgerInlineTotals(totals){
  totals=totals||{};
  return '¥'+Math.round(Number(totals.amountJpy||0)).toLocaleString()+' ≈ NT$'+Math.round(Number(totals.amountTwd||0)).toLocaleString();
}
```

- [ ] **Step 4: 執行單一測試確認通過**

Run: `node tests/ledger-225.test.js`

Expected: `ledger 2.2.5 tests passed`，exit 0。

- [ ] **Step 5: 提交此獨立變更**

```powershell
git add -- index.html tests/ledger-225.test.js
git commit -m "refactor: share ledger dual-currency totals"
```

### Task 2: 日期摘要、首頁最新日與完整紀錄範圍

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/ledger-history-search.test.js`
- Modify: `index.html:4648-4653`
- Modify: `index.html:4723-4755`
- Modify: `index.html:4791-4799`

**Interfaces:**
- Consumes: Task 1 的 `ledgerAmountTotals` 與 `formatLedgerInlineTotals`。
- Produces: `renderLedgerDateSummary(label,records,showCount) -> escaped HTML string`。
- Updates: `ledgerHistorySummary(records)` 固定輸出 `找到 N 筆 · ¥JPY ≈ NT$TWD`。

- [ ] **Step 1: 寫首頁、日期分組及篩選範圍失敗測試**

在 `tests/ledger-225.test.js` 加入 renderer assertions：

```js
const summaryHtml=rendererSandbox.renderLedgerDateSummary('2026/07/20',[
  {amountJpy:1200,amountTwd:264},
  {amountJpy:2300,amountTwd:506}
],true);
assert(summaryHtml.includes('2026/07/20 · 2 筆紀錄'));
assert(summaryHtml.includes('¥3,500 ≈ NT$770'));
```

並斷言：

```js
const recentGroupsSource=extractFunction(html,'renderLedgerRecentGroups');
const historyGroupedSource=extractFunction(html,'renderLedgerHistoryGrouped');
const renderSplitSource=extractFunction(html,'renderSplit');
assert(renderSplitSource.includes('renderLedgerDateSummary(recentDate,recent,true)'));
assert(recentGroupsSource.includes('renderLedgerDateSummary(label,group.records,false)'));
assert(historyGroupedSource.includes("historyGrouping==='date'")&&historyGroupedSource.includes('ledger-date-label'));
assert(!historyGroupedSource.includes('renderLedgerDateSummary(key'));
```

在 `tests/ledger-history-search.test.js` 以已篩選的兩筆紀錄呼叫 `ledgerHistorySummary`，斷言：

```js
assert.strictEqual(summary,'找到 2 筆 · ¥3,500 ≈ NT$770');
```

- [ ] **Step 2: 執行兩個測試並確認新摘要尚未存在**

Run: `node tests/ledger-225.test.js; node tests/ledger-history-search.test.js`

Expected: FAIL，原因是 `renderLedgerDateSummary` 未定義或舊摘要格式不符。

- [ ] **Step 3: 實作共用日期摘要 renderer**

在 `renderLedgerRecentGroups` 前加入：

```js
function renderLedgerDateSummary(label,records,showCount){
  var countText=showCount?' · '+(records||[]).length+' 筆紀錄':'';
  return '<div class="ledger-date-summary"><span>'+escapeHtml(String(label||'')+countText)+'</span><span class="ledger-date-total">'+escapeHtml(formatLedgerInlineTotals(ledgerAmountTotals(records)))+'</span></div>';
}
```

將日期分組 renderer 改為只在 `hideDateLabel===false` 時呼叫：

```js
(hideDateLabel?'':renderLedgerDateSummary(label,group.records,false))
```

- [ ] **Step 4: 將首頁摘要移到完整寬度的獨立列**

首頁 section header 維持「最近消費／選取／查看全部」主列，日期摘要放在該主列下方、卡片清單上方：

```js
var recentSummary=recent.length?renderLedgerDateSummary(recentDate,recent,true):'';
```

輸出結構：

```html
<div class="ledger-section-head">...</div>
${recentSummary}
<div class="ledger-recent-list">...</div>
```

不得再把日期摘要塞在 `.ledger-recent-heading` 與右側操作按鈕競爭寬度。

- [ ] **Step 5: 重用共用 helpers 改寫完整紀錄結果摘要**

```js
function ledgerHistorySummary(records){
  records=records||[];
  return '找到 '+records.length+' 筆 · '+formatLedgerInlineTotals(ledgerAmountTotals(records));
}
```

`renderLedgerHistoryResults()` 與 `renderLedgerFullHistory()` 均繼續傳入 `visible`，確保摘要及日期 groups 只計搜尋／篩選結果。按類別分支維持純類別 label，不呼叫日期摘要 renderer。

- [ ] **Step 6: 執行目標測試確認通過**

Run: `node tests/ledger-225.test.js; node tests/ledger-history-search.test.js`

Expected: 兩者 exit 0。

- [ ] **Step 7: 提交功能變更**

```powershell
git add -- index.html tests/ledger-225.test.js tests/ledger-history-search.test.js
git commit -m "feat: add ledger daily dual-currency totals"
```

### Task 3: 卡片垂直置中與 375px／390px 日期列版面

**Files:**
- Modify: `tests/ledger-mobile-hotfix.test.js`
- Modify: `tests/ledger-list-actions.test.js`
- Modify: `index.html:511-512`

**Interfaces:**
- Consumes: Task 2 產生的 `.ledger-date-summary` 與 `.ledger-date-total`。
- Produces: 共用 CSS；不改 renderer 互動介面。

- [ ] **Step 1: 寫 CSS 契約失敗測試**

在 `tests/ledger-mobile-hotfix.test.js` 加入：

```js
assert(/\.ledger-dual-amounts\{[^}]*align-content:center/.test(html));
assert(/\.ledger-record-menu-button\{[^}]*align-self:center/.test(html));
assert(/\.ledger-date-summary\{[^}]*grid-template-columns:minmax\(0,1fr\) auto[^}]*font-size:11px/.test(html));
assert(/\.ledger-date-total\{[^}]*white-space:nowrap/.test(html));
assert(/\.ledger-history-summary\{[^}]*font-size:11px/.test(html));
```

在 `tests/ledger-list-actions.test.js` 保留並補強：選取模式不產生 `ledger-record-menu-button`，一般模式仍能呼叫 `openLedgerRecordActions`。

- [ ] **Step 2: 執行目標測試確認 CSS 尚未符合**

Run: `node tests/ledger-mobile-hotfix.test.js; node tests/ledger-list-actions.test.js`

Expected: FAIL 於 `align-content:center`、`align-self:center` 或新日期摘要 class。

- [ ] **Step 3: 實作最小 CSS**

調整既有規則並新增：

```css
.ledger-dual-amounts{align-content:center}
.ledger-record-menu-button{align-self:center}
.ledger-date-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;min-width:0;margin-top:2px;color:var(--ink-faint);font-size:11px;font-weight:900;letter-spacing:.04em}
.ledger-date-summary>span:first-child{min-width:0}
.ledger-date-total{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.ledger-history-summary{font-size:11px;font-weight:800}
```

不要增加 top／transform／負 margin，也不要用全域 `overflow-x:hidden`。

- [ ] **Step 4: 執行目標測試確認通過**

Run: `node tests/ledger-mobile-hotfix.test.js; node tests/ledger-list-actions.test.js`

Expected: 兩者 exit 0。

- [ ] **Step 5: 進行 Browser QA**

以 375px／390px 各驗證個人與團體：

```text
- 單筆卡右側金額與 ⋯ 垂直置中
- batch 摘要卡右側金額與 ⋯ 垂直置中
- 選取模式不 render ⋯
- 首頁最新日摘要固定顯示 JPY ≈ TWD
- 完整紀錄按日期每組顯示當日加總
- 搜尋／篩選後日期加總與找到 N 筆摘要同步更新
- 按類別不顯示日加總
- scrollWidth <= clientWidth
- pageerror=0
```

- [ ] **Step 6: 提交版面變更**

```powershell
git add -- index.html tests/ledger-mobile-hotfix.test.js tests/ledger-list-actions.test.js
git commit -m "style: center ledger card actions and totals"
```

### Task 4: Service Worker、文件與完整驗證

**Files:**
- Modify: `sw.js:9`
- Modify: `tests/pwa-shell.test.js`
- Modify: 其他既有 SW 版本斷言 tests
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: Tasks 1–3 完成的 app shell。
- Produces: `CACHE_NAME = 'okayama-trip-v32'`；不改其他 SW 行為。

- [ ] **Step 1: 先將所有 SW 版本測試由 v31 改為 v32**

至少更新：

```text
tests/ios-zoom-guard.test.js
tests/ledger-221-ui.test.js
tests/ledger-225.test.js
tests/ledger-mobile-hotfix.test.js
tests/ledger-ui-polish.test.js
tests/pwa-shell.test.js
```

- [ ] **Step 2: 執行 PWA 測試確認 v31 會失敗**

Run: `node tests/pwa-shell.test.js`

Expected: FAIL，實際 `okayama-trip-v31`、預期 `okayama-trip-v32`。

- [ ] **Step 3: 僅修改 CACHE_NAME**

```js
var CACHE_NAME = 'okayama-trip-v32';
```

不得修改 `SHELL`、install、activate 或 fetch。

- [ ] **Step 4: 更新文件狀態**

`07_CHANGELOG.md` 只新增本批：卡片右側置中、首頁最新日固定雙幣加總、完整紀錄篩選後日加總、11px 結果摘要及 SW v32。

`tasks/current.md` 將本設計標示為已實作但等待 Bar 375px／390px 與 iOS 真機驗收；未經驗收不得標示完成。

- [ ] **Step 5: 執行完整驗證**

```powershell
$failed=@()
$tests=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
foreach($test in $tests){ node $test.FullName; if($LASTEXITCODE -ne 0){$failed+=$test.Name} }
if($failed.Count){ throw ('FAILED: '+($failed -join ', ')) }
node tools/check-doc-titles.js
git diff --check
git status --short
```

Expected: 38 個 tests 全部 exit 0；文件檢查 exit 0；status 僅列允許檔案。

- [ ] **Step 6: 稽核禁止範圍**

```powershell
git diff -- schema.js validator.js apps-script .ai-manifest.json PROJECT_CONSTITUTION.md netlify.toml manifest.webmanifest
```

Expected: 無輸出。另確認 `git diff -- sw.js` 只有 `CACHE_NAME` 一行。

- [ ] **Step 7: 提交並推送 dev**

```powershell
git add -- index.html sw.js 07_CHANGELOG.md tasks/current.md tests
git commit -m "feat: add ledger daily totals and align card actions"
git push origin dev
```

禁止 push／merge `main`，禁止部署 Netlify。

## Ledger 日期金額、操作 Popover 與分攤成員精修設計（2026-07-20，已實作，待 Bar 驗收）

### 日期右側雙幣金額
- 首頁最新有效日期右側及完整紀錄每日右側的 `¥JPY ≈ NT$TWD`，由 11px 調整為 9px；只有右側金額縮小，左側日期與筆數維持原尺寸與顏色。
- 金額固定單行、固定 JPY 再 TWD，不影響完整紀錄上方維持 11px 的 `找到 N 筆 · ¥JPY ≈ NT$TWD` 摘要。

### `⋯` 操作 Popover
- Popover 寬度由約 144px 縮至約 118px，內距 4px，每列約 36px，字級 12px。
- 選項顯示 `編輯 ✏️` 與 `刪除 🗑️`，圖示置於文字後方；刪除保留既有警示色。
- 第一次點同一張卡的 `⋯` 開啟；第二次點同一個 `⋯` 收合；點另一張卡的 `⋯` 關閉舊 Popover 並開啟新卡選單。
- 使用 Popover DOM 的 record／batch 識別資料判斷切換，不新增永久 state；外部點擊、Escape、捲動及 resize 關閉行為維持不變。
- 編輯、個人本機真刪、團體墓碑刪除及 batch 刪除流程不變。

### 團體分攤成員群組
- 整張帳單的「分攤成員」及多品項每項的「單項分攤成員」均改為獨立 `ledger-participant-group` 視覺元件，不直接耦合代購 CSS class。
- 群組採淡綠低飽和背景、細綠灰邊框、9px 圓角及約 7px 內距；標題文案維持不變。
- 成員選項改為約 28px 高、7px 圓角長方形及 10px 字級，與代購對象內容尺寸相同；支援換行且不產生水平捲動。
- 已選顯示 `✓ 成員名`、淡綠底及深綠框；未選為白底、細灰框及成員名。

### 分攤狀態與契約
- 新開團體新增消費時，所有目前正式成員預設全選；加測試保護現有 `createLedgerEntryDraft('shared')` 行為，不新增 state。
- 編輯既有紀錄依原紀錄 participants，不強制全選；單項分攤預設繼承整張帳單，逐項操作後沿用既有 custom 語意。
- 至少一位分攤成員、儲存並再記一筆、participants JSON、Schema、Repository、Queue、結算及墓碑契約均不變。

### 驗收重點
- 375px／390px：首頁與完整紀錄的日期右側金額為 9px，日期／筆數及 11px 結果摘要不受影響且無水平溢出。
- 單筆及 batch 卡的 `⋯` 可開啟、同一按鈕二次點擊可收合、切換另一張卡正確，選單尺寸及兩個圖示符合規格。
- 團體單品項／多品項的帳單分攤與單項分攤群組樣式一致；新建預設全選、編輯與儲存語意不變。
- 個人帳不顯示分攤群組，非分帳頁面不受影響，`pageerror=0`。

# Ledger Popover and Participant Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將日期右側雙幣金額縮為 9px、精簡並支援二次點擊收合的紀錄操作 Popover，以及統一團體帳單／單項分攤成員群組。

**Architecture:** 日期金額只調整 `.ledger-date-total` 的 scoped CSS。Popover 以 DOM `data-action-key` 判斷同一 record／batch 的再次點擊，不建立永久 UI state；分攤成員由共用 `renderLedgerParticipantGroup`／`renderLedgerParticipantChoices` renderer 產生兩層群組，資料仍使用既有 draft participants。

**Tech Stack:** Vanilla HTML／CSS／JavaScript、Node `assert`／`vm` tests、既有單檔 renderer、Service Worker app shell。

## Global Constraints

- 僅修改 `index.html`、`sw.js`、必要既有 tests、`07_CHANGELOG.md` 與 `tasks/current.md`。
- 日期右側雙幣金額為 9px；日期／筆數維持 11px，完整紀錄結果摘要維持 11px。
- Popover 顯示 `編輯 ✏️`、`刪除 🗑️`，約 118px 寬、4px 內距、36px 列高及 12px 字級。
- 團體新建表單正式成員預設全選；編輯、單項 custom、至少一人及儲存並再記一筆語意不變。
- 不修改 Schema、participants JSON、Apps Script、Repository、Queue／Retry／Flush、結算、墓碑契約、localStorage key、資料欄位、治理文件或非分帳頁。
- 若修改 app shell，`CACHE_NAME` 只從 v32 順延至 v33；不得修改 SHELL、install、activate 或 fetch。

---

### Task 1: 日期右側金額縮為 9px

**Files:**
- Modify: `tests/ledger-mobile-hotfix.test.js`
- Modify: `index.html:535-540`

**Interfaces:**
- Consumes: 現有 `.ledger-date-summary`／`.ledger-date-total`。
- Produces: 只對右側加總生效的 9px CSS，不改 renderer。

- [ ] **Step 1: 寫失敗測試**

在 `tests/ledger-mobile-hotfix.test.js` 加入：

```js
assert(/\.ledger-date-total\{[^}]*font-size:9px[^}]*white-space:nowrap/.test(html),'daily total alone is reduced to 9px');
assert(/\.ledger-history-summary\{[^}]*font-size:11px/.test(html),'history result summary stays 11px');
```

- [ ] **Step 2: 執行並確認目前缺少 9px**

Run: `node tests/ledger-mobile-hotfix.test.js`

Expected: FAIL 於 `daily total alone is reduced to 9px`。

- [ ] **Step 3: 修改 scoped CSS**

```css
.ledger-date-total{font-size:9px;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
```

不得縮小 `.ledger-date-summary` 或 `.ledger-history-summary`。

- [ ] **Step 4: 執行目標測試**

Run: `node tests/ledger-mobile-hotfix.test.js`

Expected: exit 0。

- [ ] **Step 5: 提交**

```powershell
git add -- index.html tests/ledger-mobile-hotfix.test.js
git commit -m "style: reduce ledger daily total size"
```

### Task 2: 精簡並切換 `⋯` 操作 Popover

**Files:**
- Modify: `tests/ledger-list-actions.test.js`
- Modify: `index.html:511-512`
- Modify: `index.html:4695-4718`

**Interfaces:**
- Consumes: `openLedgerRecordActions(id,event,isBatch)` 既有呼叫介面。
- Produces: Popover DOM `dataset.actionKey`，格式為 `record:<id>` 或 `batch:<id>`。
- Preserves: `closeLedgerRecordActions()`、編輯及個人／團體／batch 刪除 handlers。

- [ ] **Step 1: 寫互動與文案失敗測試**

在 `tests/ledger-list-actions.test.js` 加入 `vm` sandbox，抽出 `openLedgerRecordActions`／`closeLedgerRecordActions`，以可追蹤的 fake document 驗證：

```js
const vm=require('vm');
function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');assert(start>=0,name+' exists');
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){if(source[cursor]==='{')depth++;if(source[cursor]==='}')depth--;if(depth===0)return source.slice(start,cursor+1);}
  throw new Error('could not extract '+name);
}
const actionHost={current:null};
const fakeDocument={
  getElementById(){return actionHost.current;},
  createElement(){
    return {dataset:{},style:{},offsetWidth:118,offsetHeight:80,setAttribute(){},remove(){if(actionHost.current===this)actionHost.current=null;}};
  },
  body:{appendChild(node){actionHost.current=node;}}
};
const actionsSandbox={
  document:fakeDocument,window:{innerWidth:390,innerHeight:844},ledgerUiState:{track:'personal'},
  ledgerTrackRecords(){return [{id:'a'},{id:'b'}];},toast(){},jsHtmlAttrString(value){return String(value);}
};
vm.createContext(actionsSandbox);
vm.runInContext(extractFunction(html,'closeLedgerRecordActions')+'\n'+extractFunction(html,'openLedgerRecordActions'),actionsSandbox);
const trigger={getBoundingClientRect(){return {left:300,right:344,top:100,bottom:144};}};
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:a');
assert(actionHost.current.innerHTML.includes('編輯 ✏️'));
assert(actionHost.current.innerHTML.includes('刪除 🗑️'));
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current,null,'same ellipsis closes the popover');
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
actionsSandbox.openLedgerRecordActions('b',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:b','different ellipsis switches the popover');
```

另加入 CSS assertions：

```js
assert(/\.ledger-action-popover\{[^}]*width:118px[^}]*padding:4px/.test(html));
assert(/\.ledger-action-popover button\{[^}]*min-height:36px[^}]*font-size:12px/.test(html));
```

- [ ] **Step 2: 執行並確認舊 Popover 不會 toggle**

Run: `node tests/ledger-list-actions.test.js`

Expected: FAIL，第二次點擊後 Popover 仍存在或缺少 `data-action-key`。

- [ ] **Step 3: 實作 DOM key toggle**

在 `openLedgerRecordActions` 開頭、查找 record 前加入：

```js
var actionKey=(isBatch?'batch:':'record:')+String(id||'');
var existing=document.getElementById('ledgerRecordActionPopover');
if(existing&&existing.dataset.actionKey===actionKey){closeLedgerRecordActions();return;}
```

建立新 Popover 後設定：

```js
popover.dataset.actionKey=actionKey;
popover.innerHTML='<button role="menuitem" onclick="closeLedgerRecordActions();editLedgerRecord(\''+safeId+'\')">編輯 ✏️</button><button role="menuitem" class="danger" onclick="closeLedgerRecordActions();'+remove+'">刪除 🗑️</button>';
```

不同 key 仍執行既有 `closeLedgerRecordActions()` 後建立新選單。

- [ ] **Step 4: 縮小 Popover CSS**

將既有規則調整為：

```css
.ledger-action-popover{width:118px;padding:4px;gap:2px}
.ledger-action-popover button{min-height:36px;font-size:12px;padding:6px 8px}
```

保留現有 border、背景、陰影、定位與 danger 顏色。

- [ ] **Step 5: 執行目標測試**

Run: `node tests/ledger-list-actions.test.js`

Expected: exit 0，涵蓋開啟、同 key 收合、不同 key 切換與既有 handlers。

- [ ] **Step 6: 提交**

```powershell
git add -- index.html tests/ledger-list-actions.test.js
git commit -m "feat: refine and toggle ledger action popover"
```

### Task 3: 共用團體分攤成員群組

**Files:**
- Modify: `tests/ledger-form-223.test.js`
- Modify: `tests/ledger-multi-item.test.js`
- Modify: `index.html:515-516`
- Modify: `index.html:4117-4120`
- Modify: `index.html:4415-4442`

**Interfaces:**
- Produces: `renderLedgerParticipantChoices(selected,itemKey) -> HTML string`。
- Produces: `renderLedgerParticipantGroup(label,selected,itemKey,retainedText) -> HTML string`。
- Consumes: `registeredMembersForCurrentMode()`、`toggleLedgerParticipant(name)`、`toggleLedgerItemParticipant(key,name)`。

- [ ] **Step 1: 寫預設全選與 renderer 失敗測試**

在 `tests/ledger-form-223.test.js` 加入：

```js
const sharedDraft=plain(sandbox.createLedgerEntryDraft('shared'));
assert.deepStrictEqual(sharedDraft.participants,['Bar','Amy'],'new shared draft selects all registered members');
assert(html.includes('function renderLedgerParticipantGroup('));
assert(html.includes('ledger-participant-group'));
assert(html.includes('ledger-participant-choice'));
assert(/\.ledger-participant-group\{[^}]*border-radius:9px[^}]*padding:7px/.test(html));
assert(/\.ledger-participant-choice\{[^}]*min-height:28px[^}]*border-radius:7px[^}]*font-size:10px/.test(html));
```

在 `tests/ledger-multi-item.test.js` 保留既有 participants JSON assertions，並新增靜態斷言「分攤成員」及「單項分攤成員」都呼叫共用 group renderer。

```js
const uiHtml=fs.readFileSync('index.html','utf8');
assert(uiHtml.includes("renderLedgerParticipantGroup('單項分攤成員',item.participants,item.key,''"));
assert(uiHtml.includes("renderLedgerParticipantGroup('分攤成員',draft.participants,null"));
```

- [ ] **Step 2: 執行並確認共用 renderer／CSS 尚不存在**

Run: `node tests/ledger-form-223.test.js; node tests/ledger-multi-item.test.js`

Expected: FAIL 於 `renderLedgerParticipantGroup` 或 scoped CSS；既有預設全選及 JSON tests 應維持 PASS。

- [ ] **Step 3: 實作共用選項 renderer**

```js
function renderLedgerParticipantChoices(selected,itemKey){
  return registeredMembersForCurrentMode().map(function(entry){
    var on=(selected||[]).some(function(name){return canonicalMemberName(name)===entry.key;});
    var action=itemKey?"toggleLedgerItemParticipant('"+jsString(itemKey)+"','"+jsString(entry.name)+"')":"toggleLedgerParticipant('"+jsString(entry.name)+"')";
    return '<button class="ledger-participant-choice '+(on?'on':'')+'" aria-pressed="'+(on?'true':'false')+'" onclick="'+action+'">'+(on?'✓ ':'')+escapeHtml(entry.name)+'</button>';
  }).join('');
}
```

- [ ] **Step 4: 實作共用群組 renderer 並替換兩層 UI**

```js
function renderLedgerParticipantGroup(label,selected,itemKey,retainedText){
  var id=itemKey?'':' id="ledgerParticipants"';
  return '<div class="ledger-sheet-field ledger-participant-group"'+id+'><span class="ledger-sheet-label">'+escapeHtml(label)+'</span><div class="ledger-sheet-choice-grid">'+renderLedgerParticipantChoices(selected,itemKey||null)+'</div>'+(retainedText?'<div class="ledger-sheet-retained">'+escapeHtml(retainedText)+'</div>':'')+'</div>';
}
```

`renderLedgerItemParticipants(item)` 回傳：

```js
return renderLedgerParticipantGroup('單項分攤成員',item.participants,item.key,'');
```

`renderLedgerTrackSpecificFields(draft)` 的 shared 分支回傳：

```js
return renderLedgerParticipantGroup('分攤成員',draft.participants,null,draft.participantsRetained?'沿用上一筆：'+draft.participants.length+' 人':'');
```

- [ ] **Step 5: 加入 scoped CSS**

```css
.ledger-participant-group{padding:7px;border:1px solid #cfe0dd;border-radius:9px;background:#f3f8f6}
.ledger-participant-group>.ledger-sheet-label{margin-bottom:6px}
.ledger-participant-choice{min-height:28px;border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--ink-soft);padding:4px 7px;font:inherit;font-size:10px;font-weight:800}
.ledger-participant-choice.on{border-color:var(--sea-deep);background:var(--mint);color:var(--sea-deep)}
```

只作用於團體分攤，不修改全域 `.ledger-sheet-choice`。

- [ ] **Step 6: 執行分攤與資料契約測試**

Run: `node tests/ledger-form-223.test.js; node tests/ledger-multi-item.test.js; node tests/ledger-settlement.test.js`

Expected: 三者 exit 0；新建預設全選、既有 JSON 及結算結果不變。

- [ ] **Step 7: 提交**

```powershell
git add -- index.html tests/ledger-form-223.test.js tests/ledger-multi-item.test.js
git commit -m "style: group shared ledger participants"
```

### Task 4: SW、文件與完整驗證

**Files:**
- Modify: `sw.js:9`
- Modify: 所有既有 SW 版本 assertions tests
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Produces: `CACHE_NAME = 'okayama-trip-v33'`；其他 SW 內容不變。

- [ ] **Step 1: 先將 SW tests 由 v32 改為 v33**

更新：`tests/ios-zoom-guard.test.js`、`tests/ledger-221-ui.test.js`、`tests/ledger-225.test.js`、`tests/ledger-mobile-hotfix.test.js`、`tests/ledger-ui-polish.test.js`、`tests/pwa-shell.test.js`。

- [ ] **Step 2: 執行 PWA 測試確認紅燈**

Run: `node tests/pwa-shell.test.js`

Expected: FAIL，實際 v32、預期 v33。

- [ ] **Step 3: 僅修改 CACHE_NAME**

```js
var CACHE_NAME = 'okayama-trip-v33';
```

- [ ] **Step 4: 更新文件**

`07_CHANGELOG.md` 新增本批 9px 日期金額、Popover 尺寸／圖示／toggle、兩層分攤群組、預設全選保護及 SW v33。

`tasks/current.md` 標示已實作、375px／390px Browser QA 結果及等待 Bar 手機驗收，未經驗收不得標示完成。

- [ ] **Step 5: Browser QA**

375px／390px 驗證：

```text
- 日期右側雙幣金額 computed font-size = 9px
- 日期／筆數及找到 N 筆摘要 computed font-size = 11px
- Popover 寬約 118px、列高約 36px，文字與圖示完整
- 同一 ⋯ 第二次點擊收合；不同 ⋯ 正確切換
- 團體單品／多品帳單分攤及單項分攤為淡綠群組
- 成員預設全選，按鈕 28px／7px／10px 並可換行
- 個人帳不顯示分攤群組
- scrollWidth <= clientWidth；pageerror=0
```

- [ ] **Step 6: 完整自動驗證與禁止範圍稽核**

```powershell
$failed=@(); $tests=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
foreach($test in $tests){node $test.FullName;if($LASTEXITCODE -ne 0){$failed+=$test.Name}}
if($failed.Count){throw ('FAILED: '+($failed -join ', '))}
node tools/check-doc-titles.js
git diff --check
git diff -- schema.js validator.js apps-script .ai-manifest.json PROJECT_CONSTITUTION.md netlify.toml manifest.webmanifest
```

Expected: 38 個 tests 全部 exit 0；文件檢查 exit 0；禁止範圍 diff 無輸出；`git diff -- sw.js` 只有 CACHE_NAME。

- [ ] **Step 7: 提交並推送 dev**

```powershell
git add -- index.html sw.js 07_CHANGELOG.md tasks/current.md tests
git commit -m "feat: refine ledger popover and participant groups"
git push origin dev
```

禁止 push／merge `main`，禁止部署 Netlify。
