# CURRENT(現在正在做的)

> 更新於 2026-07-20。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- Ledger 2.2.5 消費卡與日期加總已實作：卡片右側雙幣金額／`⋯` 垂直置中；首頁最新日及完整紀錄日期列新增固定 `¥JPY ≈ NT$TWD` 加總；完整紀錄結果摘要縮為 11px。SW cache 順延至 v32，等待 Bar 手機驗收。
- Ledger 2.2.5 已依 iOS App 實機截圖再修正時間欄：專用 flex wrapper 接管寬度，原生 time input 改由零 flex basis 填滿，避免 `width:100%` 在 iOS 吃掉右側群組 padding；SW cache 順延至 v31，等待 Bar 真機複驗。
- Ledger 2.2.5 時間欄位右側對齊補正已實作：單／多品項共用 datetime grid、field wrapper 與 input 的 bounded content-box 規則，時間右側與日期欄一致且保留白底群組內距；Service Worker cache 由 v29 順延至 v30。
- Ledger 2.2.5 第二輪手機回饋精修已實作：單品項代購改為無重複標題的淡暖紅群組列並將 Toggle 靠右；單／多品項日期與時間皆改為上下直列且維持既有字級與月曆線條 SVG；新增代購對象控制移至對象按鈕下方完整列。Service Worker cache 已由 v28 順延至 v29。
- Ledger 2.2.5 第一輪手機回饋精修已實作：完整紀錄選取時 batch 預設收合並可點卡展開；多品項代購採 A 精修版、單品項代購採 B 開關，兩者共用既有代購 state 與 renderer；日期／時間版型已由本輪直列設計取代。
- Ledger 2.2.5 已在 `dev` 完成增量實作，等待 Bar 手機驗收，未經 Bar 驗收不得標示完成。Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄；Repository、Queue、Apps Script、結算、墓碑資料契約及 localStorage key 均未變更。
- 最近消費改為依目前個人／團體及正式／TEST 軌別，只顯示最新一個仍有有效消費的日期及該日全部實體紀錄；最新日全刪後回退下一個有效日期，batchId 摘要維持既有行為。
- 完整紀錄延用同一套 `selectionMode`／`selectedRecordIds`、卡片 renderer、batch 三態與刪除流程；全選限定目前搜尋／篩選結果，個人維持本機真刪，團體維持逐筆墓碑並以既有 `enqueueBatch` 一次入列。
- 篩選面板已加入保留搜尋字的「清除篩選」；類別與支付方式改為 34px／8px 圓角矩形，支援換行及截斷，兩區重用 `ledger-entry-divider`。現行產品沒有日期範圍 filter state，日期／類別仍是分組控制。
- 底部分帳按鈕可從導航實際可點擊的完整紀錄返回分帳首頁，首頁再次點擊捲頂；Bottom Sheet、明細、資訊面板與對話框仍覆蓋導航，不強制顯示且不會丟失未儲存表單。Service Worker cache 最新為 v32。

## 🔨 進行中
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
