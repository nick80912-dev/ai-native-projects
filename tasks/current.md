# CURRENT(現在正在做的)

> 更新於 2026-07-20。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- Ledger 2.2.5 第二輪手機回饋精修已實作：單品項代購改為無重複標題的淡暖紅群組列並將 Toggle 靠右；單／多品項日期與時間皆改為上下直列且維持既有字級與月曆線條 SVG；新增代購對象控制移至對象按鈕下方完整列。Service Worker cache 已由 v28 順延至 v29。
- Ledger 2.2.5 第一輪手機回饋精修已實作：完整紀錄選取時 batch 預設收合並可點卡展開；多品項代購採 A 精修版、單品項代購採 B 開關，兩者共用既有代購 state 與 renderer；日期／時間版型已由本輪直列設計取代。
- Ledger 2.2.5 已在 `dev` 完成增量實作，等待 Bar 手機驗收，未經 Bar 驗收不得標示完成。Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄；Repository、Queue、Apps Script、結算、墓碑資料契約及 localStorage key 均未變更。
- 最近消費改為依目前個人／團體及正式／TEST 軌別，只顯示最新一個仍有有效消費的日期及該日全部實體紀錄；最新日全刪後回退下一個有效日期，batchId 摘要維持既有行為。
- 完整紀錄延用同一套 `selectionMode`／`selectedRecordIds`、卡片 renderer、batch 三態與刪除流程；全選限定目前搜尋／篩選結果，個人維持本機真刪，團體維持逐筆墓碑並以既有 `enqueueBatch` 一次入列。
- 篩選面板已加入保留搜尋字的「清除篩選」；類別與支付方式改為 34px／8px 圓角矩形，支援換行及截斷，兩區重用 `ledger-entry-divider`。現行產品沒有日期範圍 filter state，日期／類別仍是分組控制。
- 底部分帳按鈕可從導航實際可點擊的完整紀錄返回分帳首頁，首頁再次點擊捲頂；Bottom Sheet、明細、資訊面板與對話框仍覆蓋導航，不強制顯示且不會丟失未儲存表單。Service Worker cache 最新為 v29。

## 🔨 進行中
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
