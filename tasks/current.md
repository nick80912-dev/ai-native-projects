# CURRENT(現在正在做的)

> 更新於 2026-07-20。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- Ledger 2.2.5 已依 iOS App 實機截圖再修正時間欄：專用 flex wrapper 接管寬度，原生 time input 改由零 flex basis 填滿，避免 `width:100%` 在 iOS 吃掉右側群組 padding；SW cache 順延至 v31，等待 Bar 真機複驗。
- Ledger 2.2.5 時間欄位右側對齊補正已實作：單／多品項共用 datetime grid、field wrapper 與 input 的 bounded content-box 規則，時間右側與日期欄一致且保留白底群組內距；Service Worker cache 由 v29 順延至 v30。
- Ledger 2.2.5 第二輪手機回饋精修已實作：單品項代購改為無重複標題的淡暖紅群組列並將 Toggle 靠右；單／多品項日期與時間皆改為上下直列且維持既有字級與月曆線條 SVG；新增代購對象控制移至對象按鈕下方完整列。Service Worker cache 已由 v28 順延至 v29。
- Ledger 2.2.5 第一輪手機回饋精修已實作：完整紀錄選取時 batch 預設收合並可點卡展開；多品項代購採 A 精修版、單品項代購採 B 開關，兩者共用既有代購 state 與 renderer；日期／時間版型已由本輪直列設計取代。
- Ledger 2.2.5 已在 `dev` 完成增量實作，等待 Bar 手機驗收，未經 Bar 驗收不得標示完成。Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄；Repository、Queue、Apps Script、結算、墓碑資料契約及 localStorage key 均未變更。
- 最近消費改為依目前個人／團體及正式／TEST 軌別，只顯示最新一個仍有有效消費的日期及該日全部實體紀錄；最新日全刪後回退下一個有效日期，batchId 摘要維持既有行為。
- 完整紀錄延用同一套 `selectionMode`／`selectedRecordIds`、卡片 renderer、batch 三態與刪除流程；全選限定目前搜尋／篩選結果，個人維持本機真刪，團體維持逐筆墓碑並以既有 `enqueueBatch` 一次入列。
- 篩選面板已加入保留搜尋字的「清除篩選」；類別與支付方式改為 34px／8px 圓角矩形，支援換行及截斷，兩區重用 `ledger-entry-divider`。現行產品沒有日期範圍 filter state，日期／類別仍是分組控制。
- 底部分帳按鈕可從導航實際可點擊的完整紀錄返回分帳首頁，首頁再次點擊捲頂；Bottom Sheet、明細、資訊面板與對話框仍覆蓋導航，不強制顯示且不會丟失未儲存表單。Service Worker cache 最新為 v31。

## 🔨 進行中
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

## Ledger 消費卡與日期加總設計（2026-07-20，待實作）

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
