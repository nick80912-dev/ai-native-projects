# CURRENT(現在正在做的)

> 更新於 2026-07-17。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳同步基礎批已完成於 `dev`:Schema 2.4 / 8 表快照、Apps Script append-only repository、成員身分、設定 overlay、雙幣彙算、TEST 排除與 ADR 0006；既有分帳端點 `ok` / `dup` 與單筆 CSV 發布均已驗證。
- 本批已完成 Schema 2.5、JPY/TWD 單幣輸入與自動換算、六類別按鈕、TripConfig 共用匯率／預設幣別、版本控管 Apps Script 與 SW v16。新版 Apps Script 已部署；`updateSettings` 以 0.2／JPY 寫入成功、TripConfig CSV 精確兩列已發布，測試 ID `1784292475781-9115` 首送 `ok`／重送 `dup` 且 ledger CSV 僅一列。
- 分帳安全與設定備份 UX 已完成程式實作：設定中文標籤、測試模式頂部警示與直達關閉、行內身分切換、首筆餐飲／同次開啟沿用類別、自動複製備份 JSON 與按需還原 overlay；SW 已升至 v17，Schema、Apps Script 與備份格式不變。
- 本批 390px QA 已驗證無水平溢出、警示置頂／直達／即時移除、首筆餐飲與重載重置、錯誤 JSON 保留、實際剪貼簿成功、有效還原與四分頁回歸；瀏覽器錯誤為 0，19/19 Node 測試通過。診斷 healthCheck 因桌面工具無法產生 touch-only 入口，留待 Bar 手機驗收。
- 390px 瀏覽器 QA 已驗證頂欄不重疊、單幣換算預覽、設定保存、無勾勾「已同步」及旅行日 mock Date，頁面錯誤為 0；實機離線補送、雙擊不縮放與快速控制項點擊仍待 Bar 手機驗收。
- 已同步至 2026-07-16 全部交付後現況:行程表頭契約 `行程`(Schema 2.3)、`fuel` 型別、診斷面板與同步狀態精簡、父子行程卡、7 表原子快照同步及 Dev PWA 圖示(SW v13)均已交付於 `dev`。
- 備註:三次開關對照支持手勢觀測 listener 集合的觀測者效應；已退役手勢診斷並只保留單一 passive no-op `dblclick` 相容性監聽器。Scroll-only 與 viewport/focus recovery 政策不變。

## 🔨 進行中
- 無；等待 Bar 手機實機驗收。

## ⏸ 等 Bar 動作
1. 以手機全面驗收單幣換算、共享匯率、分帳同步、離線補送、TEST 警示／排除、備份剪貼簿、按需還原、類別沿用、診斷 healthCheck、雙擊不縮放、快速類別／幣別／設定控制項點擊、Schema 2.5 與 SW v17。
2. 驗收通過後核准 PR merge `dev → main`。

## 下一棒
→ 完成本批桌面 390px QA 與手機實機驗收；若 no-op listener 有快速誤觸副作用，移除並 bump SW v18 回滾。通過後 merge，Netlify 正式部署與線上驗證(回滾見 16 §A)。
