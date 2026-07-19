# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.2 前端與維護來源已完成：Schema `2.8 (2026-07-19)`，Ledger 固定 21 欄，`time` 維持消費發生時間；新增輸入幣別、免稅品、價格方式、稅率與優惠券金額五個結構欄位。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳日期／時間拆欄並提供自製月曆；多品項免稅／個人代購、稅與優惠券及店家／備註收合區已統一。Bottom Sheet 維持 Scroll-only，並保存內部與背景捲動位置。
- 完整紀錄支援品名／店名／備註搜尋、類別／支付多選、個人代購／免稅篩選與日期／類別分組。最近消費與明細改為使用者資訊優先，獨立 `⋯` 操作入口沿用既有個人真刪／團體墓碑規則。
- Service Worker cache 已升至 v22；Validator 六類日誌、結算、墓碑、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.2 全部自動測試、文件檢查與 390px 瀏覽器 QA 已通過；`healthCheck` 正常、browser error 為 0，待 commit 並 push `dev`。

## ⏸ 等 Bar 動作
1. 在 Sheet「分帳紀錄」第 16 欄後依序新增五個 Schema 2.8 表頭，並以 `apps-script/ledger-sync.gs` 建立 Apps Script 新版本、維持原 `/exec` URL。
2. 依 `apps-script/README.md` 驗收新 ID、dup 與 CSV 21 欄落位後，再驗收 dev 的 iOS Bottom Sheet／月曆／篩選／編輯、TEST 帳本、離線補送及跨裝置延遲。
3. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ 先完成 Apps Script 21 欄部署，再於 dev 測試站驗收；通過後走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
