# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.1 已完成：Schema `2.7 (2026-07-19)`，Ledger 固定 16 欄，`time` 為消費發生時間，新增店名與取代紀錄 ID。新版 Apps Script 已由 Bar 部署，真實端點新增／dup 契約通過。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳支援店名、可改日期時間、單幣換算、多品項、含稅／未稅、無稅／8%／10%／自訂、折扣、單品／全部免稅與可管理的代購對象。Bottom Sheet 維持 Scroll-only，並保存內部與背景捲動位置。
- 完整紀錄支援品名／店名／備註搜尋、類別／支付／代購篩選、日期／類別分組。個人編輯原地替換；團體編輯以「編輯修改」墓碑加替代筆維持 append-only。
- Service Worker cache 已升至 v21；Validator 六類日誌、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.1 全部自動測試、文件檢查與 390px 瀏覽器 QA 已完成，Development Summary 待交付；觸控手勢開啟的 healthCheck 面板留待 Bar 手機驗收，等待核准 push `dev`。

## ⏸ 等 Bar 動作
1. 核准 Ledger 2.1 實作 push `dev`。
2. 手機驗收：iOS Bottom Sheet 鍵盤／捲動、個人與團體編輯、TEST 平行帳本、離線補送及跨裝置 1–5 分鐘 CSV 延遲。
3. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ Bar 核准後 push `dev` 觸發測試站部署；手機驗收通過後再走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
