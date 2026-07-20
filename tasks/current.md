# CURRENT(現在正在做的)

> 更新於 2026-07-20。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- Ledger 三秒記帳整合批次已實作：類別群組雙幣合計與 batch 不拆分、104px 同鍵收合 Popover、團體帳單／品項分攤繼承、預設類別收合、FAB 同手勢金額 focus、個人 5 秒復原，以及個人／團體分流 Toast、重複確認與 idempotency 回歸。SW cache 已由 v33 順延至 v34。
- 自動化 QA 已通過：39 個 `tests/*.test.js` 逐一 Node 執行、文件標題檢查與 diff check 均為 0 failures；375px／390px Browser QA 及 iOS 鍵盤／行動裝置驗收仍待 Bar，整合批次不得標記為完成或推送。
- Ledger 2.2.5 消費卡與日期加總已實作：卡片右側雙幣金額／`⋯` 垂直置中；首頁最新日及完整紀錄日期列新增固定 `¥JPY ≈ NT$TWD` 加總；完整紀錄結果摘要縮為 11px。SW cache 順延至 v32，等待 Bar 手機驗收。
- Ledger 2.2.5 已依 iOS App 實機截圖再修正時間欄：專用 flex wrapper 接管寬度，原生 time input 改由零 flex basis 填滿，避免 `width:100%` 在 iOS 吃掉右側群組 padding；SW cache 順延至 v31，等待 Bar 真機複驗。
- Ledger 2.2.5 時間欄位右側對齊補正已實作：單／多品項共用 datetime grid、field wrapper 與 input 的 bounded content-box 規則，時間右側與日期欄一致且保留白底群組內距；Service Worker cache 由 v29 順延至 v30。
- Ledger 2.2.5 第二輪手機回饋精修已實作：單品項代購改為無重複標題的淡暖紅群組列並將 Toggle 靠右；單／多品項日期與時間皆改為上下直列且維持既有字級與月曆線條 SVG；新增代購對象控制移至對象按鈕下方完整列。Service Worker cache 已由 v28 順延至 v29。
- Ledger 2.2.5 第一輪手機回饋精修已實作：完整紀錄選取時 batch 預設收合並可點卡展開；多品項代購採 A 精修版、單品項代購採 B 開關，兩者共用既有代購 state 與 renderer；日期／時間版型已由本輪直列設計取代。
- Ledger 2.2.5 已在 `dev` 完成增量實作，等待 Bar 手機驗收，未經 Bar 驗收不得標示完成。Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄；Repository、Queue、Apps Script、結算、墓碑資料契約及 localStorage key 均未變更。
- 最近消費改為依目前個人／團體及正式／TEST 軌別，只顯示最新一個仍有有效消費的日期及該日全部實體紀錄；最新日全刪後回退下一個有效日期，batchId 摘要維持既有行為。
- 完整紀錄延用同一套 `selectionMode`／`selectedRecordIds`、卡片 renderer、batch 三態與刪除流程；全選限定目前搜尋／篩選結果，個人維持本機真刪，團體維持逐筆墓碑並以既有 `enqueueBatch` 一次入列。
- 篩選面板已加入保留搜尋字的「清除篩選」；類別與支付方式改為 34px／8px 圓角矩形，支援換行及截斷，兩區重用 `ledger-entry-divider`。現行產品沒有日期範圍 filter state，日期／類別仍是分組控制。
- 底部分帳按鈕可從導航實際可點擊的完整紀錄返回分帳首頁，首頁再次點擊捲頂；Bottom Sheet、明細、資訊面板與對話框仍覆蓋導航，不強制顯示且不會丟失未儲存表單。Service Worker cache 最新為 v34。

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

# Ledger Category, Inheritance, and Three-Second Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成類別分組雙幣加總、104px 操作選單、團體多品項分攤繼承、預設類別收合，以及不阻擋個人快速記帳的 FAB／Toast／重複提醒。

**Architecture:** 所有功能維持單頁 `index.html` 現有 renderer 與 draft state 架構。歷史加總重用既有金額 helper；品項分攤重用 `participantMode`；快速記帳把同步 focus、個人 undo snapshot 與重複判定拆成獨立 helper，團體確認只暫存 prepared records，確認前不觸碰 Queue。

**Tech Stack:** Vanilla HTML／CSS／JavaScript、Node `assert`／`vm` tests、Playwright Browser QA、Service Worker app shell。

## Global Constraints

- 工作分支固定 `dev`；動工前 `origin/dev...dev` 必須為 `0 0` 且 working tree 乾淨。
- 僅修改 `index.html`、`sw.js`、必要 `tests/*.test.js`、`07_CHANGELOG.md`、`tasks/current.md`。
- 不修改 `.ai-manifest.json`、Schema、validator、Apps Script、Repository、Queue／Retry／Flush、結算、墓碑契約、localStorage key、治理文件或非分帳頁面。
- 不修改也不評估替換金額 input type、`inputmode`、整數解析、貼上清洗、千分位或幣別小數位。
- 個人帳仍為本機真實紀錄；不得新增個人雲端 Queue、墓碑或刪除同步流程。
- 團體 retry 沿用既有 client-generated ID；server `dup` 維持成功語意，不新增 server conflict response。
- 所有可聚焦 `input`、`textarea`、`select` computed font-size 至少 16px，viewport 仍允許縮放。
- 修改 app shell 時，`CACHE_NAME` 只從 `okayama-trip-v33` 順延至 `okayama-trip-v34`；SHELL、install、activate、fetch 不變。
- 禁止 push／merge `main`，禁止部署 Netlify；未經 Bar 手機驗收不得標示完成。

## File Map

- `index.html`: scoped CSS、歷史 renderer、團體品項 draft／renderer、FAB focus、Toast、undo、重複判定與團體確認 UI。
- `tests/ledger-history-search.test.js`: 類別分組後的可見結果加總。
- `tests/ledger-list-actions.test.js`: 104px Popover 與既有 toggle 行為。
- `tests/ledger-multi-item.test.js`: inherit/custom 分攤資料流及編輯推導。
- `tests/ledger-form-223.test.js`: 分攤位置、品項控制列與預設類別收合 renderer。
- `tests/ledger-dashboard.test.js`: FAB 專用入口。
- `tests/ledger-three-second-entry.test.js`: 新增本批專用 focus、Toast、undo、重複判定及團體 prepared-record 確認測試。
- 既有 SW tests: cache v34 斷言。
- `07_CHANGELOG.md`, `tasks/current.md`: 本批狀態、QA、SW 與等待 Bar 驗收。

---

### Task 1: 類別分組雙幣加總與 104px Popover

**Files:**
- Modify: `index.html:511-536,4756-4760`
- Modify: `tests/ledger-history-search.test.js`
- Modify: `tests/ledger-list-actions.test.js`

**Interfaces:**
- Consumes: `renderLedgerDateSummary(label,records,showCount)`, `groupLedgerDisplayUnitsByCategory(records)`。
- Produces: `ledgerRecordsForDisplayUnits(units) -> LedgerRecord[]`。

- [ ] **Step 1: 寫入失敗測試**

在 `tests/ledger-history-search.test.js` 的 renderer sandbox 加入：

```js
const categoryUnits=[
  {type:'record',records:[{amountJpy:500,amountTwd:110}]},
  {type:'batch',records:[{amountJpy:300,amountTwd:66},{amountJpy:200,amountTwd:44}]}
];
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(sandbox.ledgerRecordsForDisplayUnits(categoryUnits))).map(record=>record.amountJpy),
  [500,300,200]
);
const categoryHtml=sandbox.renderLedgerHistoryGrouped([
  {id:'food',category:'餐飲',amountJpy:500,amountTwd:110,batchId:''}
],false,'JPY');
assert(categoryHtml.includes('餐飲'));
assert(categoryHtml.includes('¥500 ≈ NT$110'));
```

在 `tests/ledger-list-actions.test.js` 將 CSS 斷言改為：

```js
assert(/\.ledger-action-popover\{[^}]*width:104px[^}]*box-sizing:border-box[^}]*padding:4px/.test(html));
assert(html.includes('編輯 ✏️')&&html.includes('刪除 🗑️'));
```

- [ ] **Step 2: 執行測試並確認紅燈**

Run:

```powershell
node tests\ledger-history-search.test.js
node tests\ledger-list-actions.test.js
```

Expected: 第一個測試因 `ledgerRecordsForDisplayUnits` 不存在或類別列沒有金額失敗；第二個測試因實際寬度仍為 118px 失敗。

- [ ] **Step 3: 實作最小 renderer 與 CSS**

在 `groupLedgerDisplayUnitsByCategory` 後加入：

```js
function ledgerRecordsForDisplayUnits(units){
  return (units||[]).reduce(function(records,unit){
    return records.concat(unit&&Array.isArray(unit.records)?unit.records:[]);
  },[]);
}
```

將類別分組 branch 改為：

```js
var groups=groupLedgerDisplayUnitsByCategory(records);
return Object.keys(groups).map(function(key){
  var units=groups[key],groupRecords=ledgerRecordsForDisplayUnits(units);
  return '<section class="ledger-date-group">'+renderLedgerDateSummary(key,groupRecords,false)+units.map(function(unit){
    return unit.type==='batch'?renderLedgerBatchCard(unit.records,shared,currency):renderLedgerRecentRecord(unit.records[0],shared,currency);
  }).join('')+'</section>';
}).join('');
```

只將 `.ledger-action-popover` 的 `width:118px` 改為 `width:104px`，其他宣告不變。

- [ ] **Step 4: 執行綠燈與相鄰回歸**

Run:

```powershell
node tests\ledger-history-search.test.js
node tests\ledger-list-actions.test.js
node tests\ledger-225.test.js
node tests\ledger-mobile-hotfix.test.js
```

Expected: 全部 exit 0。

- [ ] **Step 5: 提交 Task 1**

```powershell
git add -- index.html tests/ledger-history-search.test.js tests/ledger-list-actions.test.js
git commit -m "feat: add ledger category group totals"
```

---

### Task 2: 團體多品項 inherit/custom 分攤與欄位順序

**Files:**
- Modify: `index.html:515-521,4127-4144,4276-4310,4420-4455,4474-4479`
- Modify: `tests/ledger-multi-item.test.js`
- Modify: `tests/ledger-form-223.test.js`

**Interfaces:**
- Produces: `sameLedgerParticipantSelection(left,right) -> boolean`。
- Produces: `setLedgerItemParticipantMode(key,enabled) -> void`。
- Consumes: `participantMode`, `draft.participants`, `renderLedgerParticipantGroup(label,selected,itemKey,retainedText)`。

- [ ] **Step 1: 寫入 inherit/custom 資料測試**

在 `tests/ledger-multi-item.test.js` sandbox 加入：

```js
assert.strictEqual(sandbox.sameLedgerParticipantSelection(['Amy','Bar'],['bar',' Amy ']),true);
assert.strictEqual(sandbox.sameLedgerParticipantSelection(['Amy'],['Amy','Bar']),false);

const modeDraft={track:'shared',participants:['Bar','Amy'],items:[{
  key:'i1',participantMode:'inherit',participants:[]
}]};
sandbox.ledgerUiState={draft:modeDraft};
sandbox.setLedgerItemParticipantMode('i1',true);
assert.strictEqual(modeDraft.items[0].participantMode,'custom');
assert.deepStrictEqual(JSON.parse(JSON.stringify(modeDraft.items[0].participants)),['Bar','Amy']);
sandbox.setLedgerItemParticipantMode('i1',false);
assert.strictEqual(modeDraft.items[0].participantMode,'inherit');
assert.deepStrictEqual(JSON.parse(JSON.stringify(modeDraft.items[0].participants)),[]);
```

加入 source assertions：

```js
assert(uiSource.includes("item.participantMode==='custom'?renderLedgerItemParticipants(item):''"));
assert(uiSource.includes("<span>單項分攤</span>"));
assert(uiSource.includes("renderLedgerMultiBillInfo(draft)+renderLedgerTrackSpecificFields(draft)+renderLedgerMultiItemFields(draft)"));
```

- [ ] **Step 2: 執行測試並確認紅燈**

Run:

```powershell
node tests\ledger-multi-item.test.js
node tests\ledger-form-223.test.js
```

Expected: helper、mode toggle 或新 renderer 順序不存在而失敗。

- [ ] **Step 3: 實作集合比較與 mode toggle**

加入：

```js
function sameLedgerParticipantSelection(left,right){
  var normalize=function(values){return (values||[]).map(canonicalMemberName).filter(Boolean).sort();};
  var a=normalize(left),b=normalize(right);
  return a.length===b.length&&a.every(function(value,index){return value===b[index];});
}
function setLedgerItemParticipantMode(key,enabled){
  var draft=ledgerUiState.draft,item=ledgerDraftItem(key);
  if(!draft||draft.track!=='shared'||!item)return;
  updateLedgerDraftItem(key,enabled?{
    participantMode:'custom',participants:(draft.participants||[]).slice()
  }:{participantMode:'inherit',participants:[]});
}
```

在 `ledgerDraftFromRecords` 的 shared item branch 改為：

```js
item.participants=parseParticipants(record,function(){})||[];
item.participantMode=sameLedgerParticipantSelection(item.participants,draft.participants)?'inherit':'custom';
if(item.participantMode==='inherit')item.participants=[];
```

- [ ] **Step 4: 實作品項控制與整單分攤順序**

在 `renderLedgerDraftItem` 建立：

```js
var participantFlag='<label class="ledger-compact-check ledger-item-flag '+(item.participantMode==='custom'?'on':'')+'"><input type="checkbox" '+(item.participantMode==='custom'?'checked':'')+' onchange="setLedgerItemParticipantMode(\''+jsString(item.key)+'\',this.checked)"><span class="ledger-item-flag-check" aria-hidden="true">✓</span><span>單項分攤</span></label>';
var thirdFlag=draft.track==='personal'?proxyFlag:participantFlag;
var controls='<div class="ledger-item-control-row"><button type="button" class="ledger-item-category-toggle" aria-expanded="'+(item.categoryOpen?'true':'false')+'" onclick="toggleLedgerItemCategory(\''+jsString(item.key)+'\')"><span class="ledger-item-category-face"><span>'+escapeHtml(ledgerCategoryEmoji(item.category)+' '+item.category)+'</span><span>⌄</span></span></button>'+taxFlag+thirdFlag+'</div>';
var participants=draft.track==='shared'&&item.participantMode==='custom'?renderLedgerItemParticipants(item):'';
```

將 multi fields 順序改為：

```js
var fields=draft.multi?
  renderLedgerMultiBillInfo(draft)+renderLedgerTrackSpecificFields(draft)+renderLedgerMultiItemFields(draft):
  renderLedgerSingleBasicInfo(draft)+renderLedgerStoreField(draft)+renderLedgerSingleItemCategory(draft)+renderLedgerPaymentFields(draft,false)+renderLedgerTrackSpecificFields(draft);
```

- [ ] **Step 5: 執行測試與儲存／結算回歸**

Run:

```powershell
node tests\ledger-multi-item.test.js
node tests\ledger-form-223.test.js
node tests\ledger-settlement.test.js
node tests\ledger-entry-settings.test.js
```

Expected: 全部 exit 0；inherit 使用整單 participants，custom 使用品項 participants。

- [ ] **Step 6: 提交 Task 2**

```powershell
git add -- index.html tests/ledger-multi-item.test.js tests/ledger-form-223.test.js
git commit -m "feat: add inherited item participant controls"
```

---

### Task 3: 預設類別緊湊收合選擇器

**Files:**
- Modify: `index.html:515-521,4120-4156,4318-4334,4449`
- Modify: `tests/ledger-multi-item.test.js`
- Modify: `tests/ledger-form-223.test.js`

**Interfaces:**
- Adds transient draft field: `categoryApplyOpen:boolean`，不得被 persist。
- Produces: `toggleLedgerCategoryApply() -> void`。

- [ ] **Step 1: 寫入失敗測試**

```js
const newDraft=plain(sandbox.createLedgerEntryDraft('personal'));
assert.strictEqual(newDraft.categoryApplyOpen,false);
assert(uiSource.includes('function toggleLedgerCategoryApply('));
assert(uiSource.includes('ledger-category-apply-main'));
assert(uiSource.includes("draft.categoryApplyOpen?'':'hidden'"));
assert(uiSource.includes("<span>套用至全部</span>")||uiSource.includes('套用至全部'));
```

在既有 `selectLedgerCategoryApply` sandbox 驗證：

```js
draft.categoryApplyOpen=true;
sandbox.selectLedgerCategoryApply('交通');
assert.strictEqual(draft.categoryApply,'交通');
assert.strictEqual(draft.categoryApplyOpen,false);
```

- [ ] **Step 2: 執行測試並確認紅燈**

Run:

```powershell
node tests\ledger-multi-item.test.js
node tests\ledger-form-223.test.js
```

Expected: `categoryApplyOpen` 或收合 renderer assertions 失敗。

- [ ] **Step 3: 實作 transient state 與 handlers**

在 `createLedgerEntryDraft` 回傳物件加入 `categoryApplyOpen:false`，並實作：

```js
function toggleLedgerCategoryApply(){
  var draft=ledgerUiState.draft;if(!draft)return;
  draft.categoryApplyOpen=!draft.categoryApplyOpen;
  withLedgerSheetPosition(renderLedgerEntrySheet);
}
function selectLedgerCategoryApply(value){
  var draft=ledgerUiState.draft;if(!draft)return;
  updateLedgerCategoryApply(draft,value);
  draft.categoryApplyOpen=false;
  withLedgerSheetPosition(renderLedgerEntrySheet);
}
```

- [ ] **Step 4: 實作緊湊 renderer 與 scoped CSS**

```js
function renderLedgerCategoryApply(draft){
  var current=ledgerCategoryEmoji(draft.categoryApply)+' '+draft.categoryApply;
  return '<div class="ledger-sheet-field ledger-category-apply"><div class="ledger-category-apply-heading"><span class="ledger-sheet-label">預設類別</span><span class="ledger-category-apply-help">新品項自動帶入，可逐筆調整</span></div><div class="ledger-category-apply-main"><button type="button" class="ledger-item-category-toggle" aria-expanded="'+(draft.categoryApplyOpen?'true':'false')+'" onclick="toggleLedgerCategoryApply()"><span class="ledger-item-category-face"><span>'+escapeHtml(current)+'</span><span>⌄</span></span></button><button type="button" class="ledger-category-apply-all" onclick="applyLedgerCategoryApplyToAll()">套用至全部</button></div><div class="ledger-category-apply-options" '+(draft.categoryApplyOpen?'':'hidden')+'><div class="ledger-sheet-choice-grid">'+ledgerSheetChoiceButtons(ledgerCategoryStore.all(),draft.categoryApply,'selectLedgerCategoryApply','ledger-form-open-choice')+'</div></div></div>';
}
```

CSS 使用：

```css
.ledger-category-apply-main{display:flex;align-items:center;gap:7px;min-width:0}
.ledger-category-apply-main .ledger-item-category-toggle{flex:0 1 120px}
.ledger-category-apply-all{min-height:34px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--sea-deep);padding:6px 10px;font:inherit;font-size:12px;font-weight:900}
.ledger-category-apply-options{margin-top:7px}
.ledger-category-apply-options[hidden]{display:none}
```

- [ ] **Step 5: 執行測試並提交**

```powershell
node tests\ledger-multi-item.test.js
node tests\ledger-form-223.test.js
node tests\ledger-mobile-hotfix.test.js
git add -- index.html tests/ledger-multi-item.test.js tests/ledger-form-223.test.js
git commit -m "feat: collapse the default category picker"
```

Expected: tests exit 0；375px 控制列不需依賴水平捲動。

---

### Task 4: FAB 同手勢鏈 focus 與 focus 字級保護

**Files:**
- Modify: `index.html:4195-4205,4829-4833`
- Modify: `tests/ledger-dashboard.test.js`
- Create: `tests/ledger-three-second-entry.test.js`

**Interfaces:**
- Produces: `openLedgerEntrySheet(options?:{focusAmount?:boolean}) -> void`。
- Produces: `openLedgerQuickEntryFromFab() -> void`。

- [ ] **Step 1: 建立專用失敗測試**

`tests/ledger-three-second-entry.test.js` 建立 function extractor 與 fake DOM，核心 assertions：

```js
assert(html.includes('function openLedgerQuickEntryFromFab('));
assert(html.includes('onclick="openLedgerQuickEntryFromFab()"'));
const openSource=extractFunction(html,'openLedgerEntrySheet');
assert(openSource.indexOf('renderLedgerEntrySheet()')<openSource.indexOf("document.getElementById('ledgerAmount')"));
assert(openSource.indexOf("document.getElementById('ledgerAmount')")<openSource.indexOf('requestAnimationFrame'));
assert(!/Promise|setTimeout/.test(openSource.slice(openSource.indexOf("document.getElementById('ledgerAmount')"),openSource.indexOf('requestAnimationFrame'))));
assert(/input,select,textarea\{font-size:16px/.test(html));
assert(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(html));
```

- [ ] **Step 2: 執行測試並確認紅燈**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-dashboard.test.js
```

Expected: FAB wrapper 或同步 focus assertions 失敗。

- [ ] **Step 3: 實作同步 focus**

```js
function openLedgerQuickEntryFromFab(){openLedgerEntrySheet({focusAmount:true});}
function openLedgerEntrySheet(options){
  options=options||{};
  if(isTimeSimulationActive()){toast('時間模擬中不可新增支出');return;}
  if(!memberIsAllowed(getCurrentMember())){openMemberSelector(true);return;}
  ledgerBackgroundScrollY=window.scrollY||window.pageYOffset||0;
  closeLedgerEntrySheet(false);
  ledgerUiState.draft=createLedgerEntryDraft(ledgerUiState.track);ledgerUiState.editing=null;ledgerUiState.sheet='entry';
  var overlay=document.createElement('div');overlay.id='ledgerEntrySheet';overlay.className='ledger-sheet-overlay';
  document.body.appendChild(overlay);document.body.classList.add('ledger-sheet-open');renderLedgerEntrySheet();
  if(options.focusAmount){var amount=document.getElementById('ledgerAmount');if(amount&&!amount.disabled)try{amount.focus({preventScroll:true});}catch(ignore){amount.focus();}}
  requestAnimationFrame(function(){var sheet=overlay.querySelector('.ledger-sheet');if(sheet)sheet.scrollTop=0;});
}
```

將 FAB onclick 改為 `openLedgerQuickEntryFromFab()`。

- [ ] **Step 4: 執行測試並提交**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-dashboard.test.js
node tests\ios-zoom-guard.test.js
git add -- index.html tests/ledger-dashboard.test.js tests/ledger-three-second-entry.test.js
git commit -m "feat: focus ledger amount from the FAB"
```

Expected: 全部 exit 0；編輯入口 source 不傳 `focusAmount:true`。

---

### Task 5: 個人 5 秒復原與非阻斷重複提示

**Files:**
- Modify: `index.html:1110-1127,2941-2955,3012-3050,4483-4532`
- Modify: `tests/ledger-three-second-entry.test.js`
- Modify: `tests/ledger-quick-entry.test.js`

**Interfaces:**
- Extends: `toast(msg,actionText,actionFn,durationMs?)`，既有三參數呼叫不變。
- Produces: `ledgerClientCreatedAt(record) -> number|null`。
- Produces: `ledgerPotentialDuplicate(candidate,records,options) -> LedgerRecord|null`。
- Produces: `formatLedgerPrimaryTotal(currency,records) -> string`。
- Produces: `undoPersonalLedgerSave(snapshots) -> boolean`。

- [ ] **Step 1: 寫入 helper 與 undo 失敗測試**

在 `tests/ledger-three-second-entry.test.js` 加入：

```js
assert.strictEqual(sandbox.ledgerClientCreatedAt({id:'1784512800000-abcd'}),1784512800000);
assert.strictEqual(sandbox.ledgerClientCreatedAt({id:'legacy-id'}),null);
const candidate={id:'1784512809000-new1',member:'Bar',category:'餐飲',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''};
const duplicate={id:'1784512800000-old1',member:'Bar',category:'餐飲',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''};
assert.strictEqual(sandbox.ledgerPotentialDuplicate(candidate,[duplicate],{editing:false,addAnother:false}).id,duplicate.id);
assert.strictEqual(sandbox.ledgerPotentialDuplicate(candidate,[duplicate],{editing:false,addAnother:true}),null);
assert.strictEqual(sandbox.formatLedgerPrimaryTotal('JPY',[candidate]),'¥500');
assert.strictEqual(sandbox.formatLedgerPrimaryTotal('TWD',[candidate]),'NT$110');
```

建立兩個 undo cases：

```js
let stored=[Object.assign({},candidate)],messages=[],renderCount=0;
sandbox.personalLedgerRepository={all(){return stored.map(record=>Object.assign({},record));}};
sandbox.deletePersonalLedgerRecords=function(ids){stored=stored.filter(record=>ids.indexOf(record.id)<0);return ids.length;};
sandbox.renderSplit=function(){renderCount++;};
sandbox.toast=function(message){messages.push(message);};
assert.strictEqual(sandbox.undoPersonalLedgerSave([Object.assign({},candidate)]),true);
assert.strictEqual(stored.length,0);
assert.strictEqual(messages.pop(),'已復原');

stored=[Object.assign({},candidate,{category:'交通'})];
assert.strictEqual(sandbox.undoPersonalLedgerSave([Object.assign({},candidate)]),false);
assert.strictEqual(stored.length,1);
assert.strictEqual(messages.pop(),'紀錄已修改，無法復原');
```

- [ ] **Step 2: 執行測試並確認紅燈**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-quick-entry.test.js
```

Expected: 新 helpers 與 5 秒 Toast assertions 失敗。

- [ ] **Step 3: 擴充 Toast duration，不影響其他頁面**

```js
function toast(msg,actionText,actionFn,durationMs){
  var el=document.getElementById('toast');
  toastAction=typeof actionFn==='function'?actionFn:null;
  if(toastAction){
    el.innerHTML='<span>'+escapeHtml(msg)+'</span><button class="toast-action" onclick="runToastAction()">'+escapeHtml(actionText||'復原')+'</button>';
    el.classList.add('has-action');
  }else{el.textContent=msg;el.classList.remove('has-action');}
  el.classList.add('show');
  var fallback=toastAction?3500:2000,delay=Number(durationMs)>0?Number(durationMs):fallback;
  clearTimeout(toastTimer);toastTimer=setTimeout(clearToast,delay);
}
```

- [ ] **Step 4: 實作重複判定與主幣格式**

```js
function ledgerClientCreatedAt(record){
  var match=/^(\d{13})-/.exec(String(record&&record.id||'')),value=match?Number(match[1]):NaN;
  return isFinite(value)?value:null;
}
function ledgerPrimaryAmount(record){
  return String(record&&record.inputCurrency||'JPY').toUpperCase()==='TWD'?Number(record&&record.amountTwd||0):Number(record&&record.amountJpy||0);
}
function ledgerPotentialDuplicate(candidate,records,options){
  options=options||{};
  if(!candidate||candidate.batchId||options.editing||options.addAnother)return null;
  var created=ledgerClientCreatedAt(candidate);if(created===null)return null;
  return (records||[]).filter(function(record){
    var at=ledgerClientCreatedAt(record);
    return record&&record.id!==candidate.id&&!record.batchId&&!isDeletionRecord(record)&&!isIdentityRegistrationRecord(record)&&at!==null&&Math.abs(created-at)<=90000&&
      canonicalMemberName(record.member)===canonicalMemberName(candidate.member)&&
      String(record.inputCurrency||'JPY').toUpperCase()===String(candidate.inputCurrency||'JPY').toUpperCase()&&
      ledgerPrimaryAmount(record)===ledgerPrimaryAmount(candidate)&&String(record.category||'')===String(candidate.category||'');
  })[0]||null;
}
function formatLedgerPrimaryTotal(currency,records){
  var field=currency==='TWD'?'amountTwd':'amountJpy',total=(records||[]).reduce(function(sum,record){return sum+Number(record&&record[field]||0);},0);
  return currency==='TWD'?'NT$'+Math.round(total).toLocaleString():'¥'+Math.round(total).toLocaleString();
}
```

- [ ] **Step 5: 實作個人 snapshot undo 與成功 Toast**

```js
function ledgerRecordSnapshot(record){return JSON.stringify(record);}
function undoPersonalLedgerSave(snapshots){
  var current=personalLedgerRepository.all(),byId={};current.forEach(function(record){byId[record.id]=record;});
  var unchanged=(snapshots||[]).length&&(snapshots||[]).every(function(snapshot){return byId[snapshot.id]&&ledgerRecordSnapshot(byId[snapshot.id])===ledgerRecordSnapshot(snapshot);});
  if(!unchanged){toast('紀錄已修改，無法復原');return false;}
  deletePersonalLedgerRecords(snapshots.map(function(record){return record.id;}));renderSplit();toast('已復原');return true;
}
function showPersonalLedgerSavedToast(draft,records,possibleDuplicate){
  var snapshots=(records||[]).map(function(record){return Object.assign({},record);});
  var detail=draft.multi?records.length+' 筆':String(records[0]&&records[0].category||'');
  var message='已儲存 '+formatLedgerPrimaryTotal(draft.currency,records)+' · '+detail+(possibleDuplicate?' · 可能重複':'');
  toast(message,'復原',function(){undoPersonalLedgerSave(snapshots);},5000);
}
```

在 `saveLedgerEntry` 建立 records 後、persist 前，以 `personalLedgerRepository.all()` 判定個人 duplicate；成功後個人呼叫 `showPersonalLedgerSavedToast`，團體先保留既有分支供 Task 6 替換。

- [ ] **Step 6: 執行測試並提交**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-quick-entry.test.js
node tests\ledger-dual-track.test.js
node tests\ledger-editing.test.js
git add -- index.html tests/ledger-three-second-entry.test.js tests/ledger-quick-entry.test.js
git commit -m "feat: add personal ledger save undo"
```

Expected: 個人不進 Queue；新 Toast 取代前一個 action；編輯過的相同 ID 不被 undo 刪除。

---

### Task 6: 團體 prepared-record 重複確認、同步文案與 idempotency 回歸

**Files:**
- Modify: `index.html:500,4483-4532`
- Modify: `tests/ledger-three-second-entry.test.js`
- Modify: `tests/ledger-quick-entry.test.js`
- Modify: `tests/ledger-sync.test.js`

**Interfaces:**
- Produces: `confirmSharedLedgerDuplicate(record) -> Promise<boolean>`。
- Produces: `closeLedgerDuplicateConfirm(approved) -> void`。
- Produces: `commitLedgerEntrySave(draft,editing,records,addAnother,possibleDuplicate) -> Promise<Result>`。

- [ ] **Step 1: 寫入確認前不 enqueue 的失敗測試**

在 `tests/ledger-three-second-entry.test.js` 使用可控 Promise／fake DOM 驗證：

```js
const prepared=[{id:'1784512809000-new1',member:'Bar',category:'餐飲',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''}];
let enqueueCalls=0,submittedIds=[];
sandbox.ledgerRepository={enqueueBatch(records){enqueueCalls++;submittedIds=records.map(record=>record.id);return {ok:true,queued:true,records,pending:1};}};
const confirmation=sandbox.confirmSharedLedgerDuplicate(prepared[0]);
assert.strictEqual(enqueueCalls,0);
sandbox.closeLedgerDuplicateConfirm(true);
assert.strictEqual(await confirmation,true);
assert.deepStrictEqual(prepared.map(record=>record.id),['1784512809000-new1']);
```

Source assertions：Dialog 有 `取消`／`仍要儲存`；已知離線文案為 `尚未同步，連線恢復後將自動重試`；一般文案含 `將自動同步`。

- [ ] **Step 2: 執行測試並確認紅燈**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-quick-entry.test.js
node tests\ledger-sync.test.js
```

Expected: confirm helper、prepared record flow 或新文案不存在而失敗。

- [ ] **Step 3: 實作小型團體重複 Dialog**

```js
var ledgerDuplicateResolve=null;
function confirmSharedLedgerDuplicate(record){
  return new Promise(function(resolve){
    ledgerDuplicateResolve=resolve;
    var overlay=document.createElement('div');overlay.id='ledgerDuplicateDialog';overlay.className='settings-overlay state-dialog-overlay ledger-duplicate-overlay';
    overlay.innerHTML='<section class="settings-panel state-dialog-panel ledger-duplicate-panel" role="dialog" aria-modal="true" aria-labelledby="ledgerDuplicateTitle"><div class="settings-head"><h2 id="ledgerDuplicateTitle">可能重複</h2></div><p class="settings-help">90 秒內已有一筆相同的 '+escapeHtml(formatLedgerPrimaryTotal(String(record.inputCurrency||'JPY').toUpperCase(),[record]))+'「'+escapeHtml(record.category)+'」。</p><div class="settings-actions"><button class="btn ghost" onclick="closeLedgerDuplicateConfirm(false)">取消</button><button class="btn" onclick="closeLedgerDuplicateConfirm(true)">仍要儲存</button></div></section>';
    document.body.appendChild(overlay);
  });
}
function closeLedgerDuplicateConfirm(approved){
  var overlay=document.getElementById('ledgerDuplicateDialog');if(overlay)overlay.remove();
  var resolve=ledgerDuplicateResolve;ledgerDuplicateResolve=null;if(resolve)resolve(!!approved);
}
```

CSS：

```css
.ledger-duplicate-overlay{display:grid;place-items:center;padding:16px;background:rgba(10,45,50,.38)}
.ledger-duplicate-panel{width:min(100%,320px);padding:16px;border-radius:10px;background:var(--paper);box-shadow:var(--shadow-lg)}
```

- [ ] **Step 4: 重構 save，使確認沿用同一批 IDs**

將目前 persist 後處理抽成 `commitLedgerEntrySave(draft,editing,records,addAnother,possibleDuplicate)`；`saveLedgerEntry` 在 records 建立後執行：

```js
var existing=draft.track==='personal'?personalLedgerRepository.all():ledgerTrackRecords();
var possibleDuplicate=records.length===1?ledgerPotentialDuplicate(records[0],existing,{editing:!!editing,addAnother:!!addAnother}):null;
if(draft.track==='shared'&&possibleDuplicate){
  return confirmSharedLedgerDuplicate(records[0]).then(function(approved){
    if(!approved)return {ok:false,cancelled:true};
    return commitLedgerEntrySave(draft,editing,records,addAnother,possibleDuplicate);
  });
}
return commitLedgerEntrySave(draft,editing,records,addAnother,possibleDuplicate);
```

`commitLedgerEntrySave` 必須直接使用傳入的 `records`，不得再次呼叫 `buildLedgerExpenseRecords`。團體成功 Toast：

```js
var detail=draft.multi?records.length+' 筆':String(records[0]&&records[0].category||'');
var message=(typeof navigator!=='undefined'&&navigator.onLine===false)?
  '尚未同步，連線恢復後將自動重試':
  '已儲存 '+formatLedgerPrimaryTotal(draft.currency,records)+' · '+detail+'，將自動同步';
toast(message);
```

- [ ] **Step 5: 加強既有 idempotency assertions**

在 `tests/ledger-sync.test.js` 明確斷言同一 queued record 的每次 `post` ID 相同、`dup:true` 後 pending 為 0，且不增加第二筆 queued record。不得更改 production repository code。

- [ ] **Step 6: 執行測試並提交**

```powershell
node tests\ledger-three-second-entry.test.js
node tests\ledger-quick-entry.test.js
node tests\ledger-sync.test.js
node tests\ledger-entry-settings.test.js
node tests\ledger-tombstone-deletion.test.js
git add -- index.html tests/ledger-three-second-entry.test.js tests/ledger-quick-entry.test.js tests/ledger-sync.test.js
git commit -m "feat: guard shared duplicate ledger entries"
```

Expected: 取消時 enqueue 0 次；核准時 enqueue 1 次且 IDs 等於 prepared IDs；Repository／Queue source 無功能 diff。

---

### Task 7: SW v34、文件、完整測試與 Browser QA

**Files:**
- Modify: `sw.js:9`
- Modify: existing SW-version tests
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify (ignored QA harness): `.superpowers/qa/ledger-feedback-browser.js`

**Interfaces:**
- Produces: `CACHE_NAME = 'okayama-trip-v34'`；其他 SW 內容不變。

- [ ] **Step 1: 先更新所有 SW 版本測試**

```powershell
rg -l "okayama-trip-v33" tests | ForEach-Object { (Get-Content $_ -Raw) -replace 'okayama-trip-v33','okayama-trip-v34' | Set-Content $_ -NoNewline }
node tests\pwa-shell.test.js
```

Expected: FAIL，實際 v33、預期 v34。這是機械測試版本更新；不得改動測試其他內容。

- [ ] **Step 2: 只 bump CACHE_NAME**

```js
var CACHE_NAME = 'okayama-trip-v34';
```

Run: `node tests\pwa-shell.test.js`
Expected: `PWA shell tests passed`。

- [ ] **Step 3: 更新文件**

`07_CHANGELOG.md` 新增本批：類別分組合計、104px Popover、團體整單／單項分攤繼承、預設類別收合、FAB 同手勢 focus、個人 5 秒復原、雙軌 Toast、重複提示、idempotency 回歸及 SW v34。

`tasks/current.md` 標示各 Task 實作狀態、375px／390px QA、iOS focus 待 Bar 真機驗收；未經 Bar 驗收不得標示完成。

- [ ] **Step 4: 執行全部 38 個既有 tests 加本批新 test**

```powershell
$failed=@();$tests=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
foreach($test in $tests){node $test.FullName;if($LASTEXITCODE -ne 0){$failed+=$test.Name}}
Write-Output ("TEST_COUNT="+$tests.Count)
if($failed.Count){throw ('FAILED: '+($failed -join ', '))}
node tools\check-doc-titles.js
git diff --check
```

Expected: 39 個 tests 全部 exit 0；文件標題與 diff check 通過。

- [ ] **Step 5: 375px／390px Browser QA**

逐一驗證：

```text
- 按類別每組 9px 雙幣加總，搜尋／篩選後即時重算
- 多品項群組合計不拆 batch
- Popover 實際外框 104px，同鍵收合
- 團體整單分攤在品項前；inherit 收合、custom 展開
- 預設類別初始收合，選取後收合，套用全部常駐
- FAB 點擊後 document.activeElement.id === 'ledgerAmount'
- input／textarea／select computed font-size >= 16px
- 個人 Toast 5 秒復原、可能重複不阻擋
- 團體重複取消不入列、仍要儲存只入列一次
- Dynamic Type 115%、scrollWidth <= clientWidth、pageerror=0
```

桌面 Browser QA 只能驗證 focus element，軟體鍵盤是否彈出仍需 Bar 在 iOS Safari／App 真機驗收。

- [ ] **Step 6: 禁止範圍與 SW 稽核**

```powershell
git diff --name-only e60882d
git diff -- .ai-manifest.json schema.js validator.js apps-script netlify.toml manifest.webmanifest tools
git diff -- sw.js
```

Expected: 第一個命令只列允許檔案；第二個命令無輸出；`sw.js` diff 只有 `CACHE_NAME` v33→v34。

- [ ] **Step 7: 最終提交與 dev push**

```powershell
git add -- index.html sw.js 07_CHANGELOG.md tasks/current.md tests
git commit -m "feat: streamline three-second ledger entry"
git push origin dev
```

Expected: push 只更新 `origin/dev`；`origin/dev...dev` 為 `0 0`；working tree 乾淨。不建立 main merge，不部署 Netlify。

## Ledger 類別加總、緊湊操作選單與多品項繼承控制設計（2026-07-20，已確認，實作計畫已建立）

### 變更目的
- 讓完整紀錄按類別分組時，能直接看見每一組目前可見結果的雙幣合計。
- 再縮減 `⋯` 操作 Popover 的橫向占用，但不改變既有操作內容及關閉規則。
- 讓團體多品項預設使用整單分攤，只有例外品項才展開單項分攤，降低表單長度。
- 將整單分攤放在品項之前，建立「先設定預設、再設定例外」的閱讀順序。
- 將多品項預設類別改為緊湊選擇器，需要時才展開完整類別。

### 方案決策
- 採用既有 state 延伸的行內收合方案，不使用原生 `<details>`，也不新增巢狀 Modal／Bottom Sheet。
- 類別加總沿用 `ledgerAmountTotals(records)`、`formatLedgerInlineTotals(totals)` 及 `.ledger-date-total`，不建立第二套金額計算或近似樣式。
- 單項分攤沿用既有 `participantMode: 'inherit' | 'custom'`；只新增控制此既有語意的 UI，不新增儲存欄位。
- 預設類別展開狀態只存在目前表單 draft，關閉表單即消失，不寫入 localStorage 或資料紀錄。

### 「3 秒記帳」產品原則
- 快速記帳主路徑為：點擊 FAB → Sheet 與單品項金額欄同步掛載 → 金額欄立即取得 focus → 輸入金額 → 儲存；動畫不得阻斷首次 focus。
- 系統可以提醒可能重複，但除非會影響共享資料，不得在個人軌儲存前增加確認步驟。
- 本批不修改也不評估替換金額 input type、`inputmode`、整數解析、貼上清洗、千分位或幣別小數位；維持既有正安全整數資料契約。
- 所有可取得 focus 的 `input`、`textarea`、`select`，computed font-size 不得低於 16px；不得以禁止 viewport 縮放規避 iOS 自動縮放。

### FAB 直達金額輸入（P0）
- 只套用分帳首頁的新增消費 FAB，不強制套用編輯、會員選擇、表單驗證錯誤或其他程式化開啟入口。
- FAB 點擊的同步事件鏈內，先建立 draft、掛載 Sheet、render 出可互動的 `#ledgerAmount`，隨即呼叫 `focus()`。
- 首次 focus 不得放在 Promise、動畫完成 callback、`requestAnimationFrame` 或非必要 `setTimeout` 後；Sheet 視覺動畫可在 focus 後繼續。
- 若時間模擬阻擋新增、身分尚未建立或金額欄未成功掛載，維持既有替代流程，不對隱藏或不存在的 input 呼叫 focus。

### 儲存 Toast 雙軌分流（P0）
- 個人單品項成功顯示 `已儲存 {主幣格式金額} · 類別`（例如 `¥500` 或 `NT$100`）；多品項顯示整批主幣總額及品項數，並提供唯一操作 `復原`。
- 個人復原期限固定 5 秒；同一時間只顯示最新 Toast，新 Toast 出現時前一筆復原立即失效，不保留不可見的背景復原入口。
- 個人復原捕捉本次新增的完整 record ID 陣列及內容快照；執行前確認所有目標仍存在且未被後續編輯。符合時從個人本機正式紀錄真刪並顯示 `已復原`；若內容已變更則不刪除並顯示 `紀錄已修改，無法復原`。
- 個人帳不進入團體同步 Queue，因此復原不得新增 Queue 取消、雲端刪除或墓碑流程。
- 個人可能重複時，Toast 文案追加 `· 可能重複`，唯一操作仍為 `復原`，不另設「查看」。
- 團體成功入列顯示 `已儲存 {主幣格式金額} · 類別，將自動同步`，不提供 Toast 復原；多品項顯示整批主幣總額及品項數。
- 儲存當下已知離線時，團體 Toast 改為 `尚未同步，連線恢復後將自動重試`；其他延遲或失敗沿用現有首頁 pending 狀態及紀錄卡徽章，不擴充 Repository／Queue callback 契約。
- 團體誤記仍可由最近消費或完整紀錄立即進入既有編輯／墓碑刪除流程。
- 5 秒時限只套用本批個人記帳復原 Toast，不改動其他頁面既有 Toast 時限。

### 柔性重複提示（P1）
- 個人軌一律先完成儲存，再以非阻斷 Toast 提示；不得顯示儲存前確認 Dialog。
- 個人軌可能重複條件為：同記帳身分、同個人軌、同輸入幣別、同主幣金額、同類別、client 建立時間差不超過 90 秒、單品項、非編輯、非「儲存並再記一筆」；候選只取個人本機正式有效紀錄。
- 團體軌只有候選同時符合下列條件才在 enqueue 前顯示確認：同建立者、同團體軌、同輸入幣別、同主幣金額、同類別、建立時間差不超過 90 秒、單品項、非編輯、非「儲存並再記一筆」。
- 候選集合包含目前有效團體紀錄及待同步 Queue；墓碑、身分註冊、已被刪除目標、batch 及無法可靠取得 client 建立時間的舊紀錄均排除，寧可不提示也不製造誤報。
- 建立時間只接受現有 client-generated ID 的毫秒時間前綴；不新增 `createdAt` 欄位，也不將使用者可編輯的消費發生時間誤當建立時間。
- 團體確認文案為 `90 秒內已有一筆相同的 {主幣格式金額}「類別」。`，操作為左側 `取消`、右側主操作 `仍要儲存`。
- 確認 Dialog 開啟前只建立本次待提交 records，不得先寫入 Queue；使用者選擇「仍要儲存」後，必須提交同一批 prepared records 及原 client-generated IDs，不得重新產生第二批 ID。
- 因原生 `confirm()` 無法保證核准文案與按鈕主次，團體重複確認使用既有視覺 token 的小型對話框；不得影響未命中重複條件的 3 秒主路徑。

### Idempotency 與併發邊界（P0 回歸）
- client-generated ID 必須在首次 enqueue 前建立；同一 Queue 項目的所有 retry 沿用同一 ID。
- server 回傳既有 `duplicate／dup` acknowledgement 時維持視為成功，移除對應 Queue 項目且 UI 不建立第二份資料。
- 本批只增加既有 idempotency 回歸測試，不修改 Repository、Queue／Retry／Flush 或 Apps Script 回應契約。
- 「伺服器已有同 ID 但內容不同」目前缺少 server payload 可供比對，明確排除本批；若未來需要衝突處理，必須另案取得修改 Apps Script／資料契約的授權。

### 完整紀錄按類別加總
- 按日期與按類別均使用兩欄標題列：左側為日期／類別，右側為 `¥JPY ≈ NT$TWD`。
- 類別右側金額使用與日期右側完全相同的 9px 字級、顏色、字重、單行及 tabular number 規則。
- 每組只加總目前搜尋、篩選、帳本軌別及 TEST 狀態下仍可見的有效實體消費紀錄；墓碑與非消費紀錄不計入。
- 現有多品項 batch 仍保持完整摘要卡並歸入「多品項」群組，不依品項類別拆散；「多品項」右側合計為該組所有 batch 實體紀錄總和。
- 類別分組順序、卡片 renderer、多選範圍及批次刪除行為不變。

### `⋯` 操作 Popover
- 外框寬度由 118px 改為 104px，並維持 `box-sizing:border-box`，104px 指實際外框寬度。
- 4px 內距、36px 操作列、12px 字級、圓角、陰影、警示色及 `編輯 ✏️`／`刪除 🗑️` 文案均不變。
- 同一個 `⋯` 再點一次收合；點另一張卡切換；外部點擊、Escape、scroll、resize 關閉規則不變。
- 個人真刪、團體墓碑、batch 操作及編輯流程不變。

### 團體多品項整單分攤位置
- 團體多品項表單順序調整為：帳單資訊 → 分攤成員 → 品項 → 稅與優惠券 → 更多細節 → 儲存操作。
- 只調整團體多品項；團體單品項的欄位順序維持現況，個人帳不顯示分攤成員群組。
- 整單分攤仍使用既有 `draft.participants`，新建團體草稿仍預設全選目前可用成員。

### 品項列的單項分攤
- 團體多品項控制列顯示 `[ 類別⌄ ] [ 免稅品 ] [ 單項分攤 ]`；按鈕尺寸與個人多品項的「代購」控制一致。
- 新增品項的 `participantMode` 預設為 `inherit`，按鈕未選且不展開群組；儲存時使用當下 `draft.participants`，因此整單分攤後續變更會自動套用。
- 點擊未選的「單項分攤」時，將 mode 改為 `custom`、以當下整單分攤複製成初始名單、顯示 `✓ 單項分攤` 並展開既有成員群組。
- custom 模式下逐員勾選只更新該品項；整單分攤後續變更不覆蓋它。
- 再次點擊已選的「單項分攤」時，立即將 mode 改回 `inherit`、收合群組；隱藏的舊自訂名單不參與儲存。下次重新開啟時，再以當下整單分攤初始化。
- 編輯既有 batch 時，因資料契約沒有保存 inherit/custom UI 標記，載入時以「品項 participants 是否與整單 participants 集合相同」推導：相同視為 inherit 並收合，不同視為 custom 並展開。比較採 canonical member key 且不受順序影響。
- 至少一位分攤成員的既有驗證、participants JSON、結算及儲存語意維持不變。

### 預設類別收合選擇器
- 標題列維持「預設類別　新品項自動帶入，可逐筆調整」及既有 10px 輔助文字。
- 主要列固定顯示 `[ emoji 目前類別⌄ ] [ 套用至全部 ]`；「套用至全部」不因類別選項收合而隱藏。
- 預設為收合；點目前類別選擇器後，在主要列下方展開既有類別選項。
- 選取類別後沿用既有規則：只更新尚未手動調整類別的品項，然後自動收合選項。
- 「套用至全部」沿用既有差異確認流程，只有確認後才覆蓋所有有效品項並重設手動調整標記。
- 使用 draft 內的 transient `categoryApplyOpen` 控制展開；新增、編輯、切換軌別及儲存並再記一筆皆預設收合。

### 影響範圍與禁止事項
- 僅修改 `index.html`、`sw.js`、必要 tests、`07_CHANGELOG.md` 及 `tasks/current.md`。
- 不修改 Schema、validator、Apps Script、Repository、Queue／Retry／Flush、結算、墓碑契約、localStorage key、治理文件或非分帳頁面。
- 不新增 package.json，不部署 Netlify，不 push／merge `main`。
- 若修改 app shell，Service Worker 僅將 `CACHE_NAME` 由 v33 順延至 v34；SHELL、install、activate、fetch 不變。

### 測試與 Browser QA
- 類別分組：每組雙幣合計、搜尋／篩選後重算、個人／團體、TEST／正式、墓碑排除及「多品項」群組合計。
- Popover：104px 實際外框、文案／圖示／高度／字級不變、同鍵收合、切換其他卡及既有關閉事件。
- 團體多品項：整單分攤位於品項前、新增品項預設 inherit、開啟 custom 時複製整單、關閉恢復 inherit、整單變更只影響 inherit、編輯時依成員集合推導模式。
- 預設類別：初始收合、目前類別及套用按鈕常駐、展開選項、選取後收合、只更新未手動品項、套用全部確認流程不變。
- FAB：同一 click stack 完成 Sheet／金額欄掛載及 focus；不得以 RAF／Promise／timer 首次 focus；阻擋新增時不得錯誤 focus。
- Focus 字級：所有可聚焦 input／textarea／select computed font-size 均至少 16px，viewport 仍允許縮放。
- 個人 Toast：5 秒、最新 Toast 取代舊復原、單筆／batch 真刪、成功回饋、編輯後快照不符時拒絕復原、可能重複仍只有「復原」。
- 團體 Toast：一般入列顯示「將自動同步」、已知離線顯示自動重試、無復原、既有 pending UI 與編輯／墓碑入口不變。
- 重複提示：個人永不阻擋；團體完整條件、Queue 候選、排除 batch／編輯／再記一筆／舊 ID、取消不入列、仍要儲存沿用 prepared IDs。
- Idempotency：retry ID 穩定、dup 視為成功、Queue 不殘留且 UI 不重複；不新增 server 衝突契約。
- 375px／390px 驗證 Dynamic Type 115%、控制列不溢出、成員群組換行、無水平捲動及 `pageerror=0`。
- 全部 `tests/*.test.js` 逐一 Node exit 0、文件標題檢查通過、允許範圍與禁止檔案 diff 稽核通過。

### 回滾
- 以本批 commits 反向還原 `index.html`、tests、文件及 SW cache 單版增量；因無資料契約、Schema 或 localStorage 變更，不需要資料遷移或清理。

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
