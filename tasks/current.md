# CURRENT(現在正在做的)

> 更新於 2026-07-17。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳同步基礎批已完成於 `dev`:Schema 2.4 / 8 表快照、Apps Script append-only repository、成員身分、設定 overlay、雙幣彙算、TEST 排除與 ADR 0006；既有分帳端點 `ok` / `dup` 與單筆 CSV 發布均已驗證。
- 本批已完成 Schema 2.5、JPY/TWD 單幣輸入與自動換算、六類別按鈕、TripConfig 共用匯率／預設幣別、版本控管 Apps Script、被動 iOS 手勢診斷與 SW v15。新版 Apps Script 已部署；`updateSettings` 以 0.2／JPY 寫入成功、TripConfig CSV 精確兩列已發布，測試 ID `1784292475781-9115` 首送 `ok`／重送 `dup` 且 ledger CSV 僅一列。
- 390px 瀏覽器 QA 已驗證頂欄不重疊、單幣換算預覽、設定保存、無勾勾「已同步」及旅行日 mock Date，頁面錯誤為 0；實機離線補送與 iOS 手勢報告仍待 Bar 手機驗收。
- 已同步至 2026-07-16 全部交付後現況:行程表頭契約 `行程`(Schema 2.3)、`fuel` 型別、診斷面板與同步狀態精簡、父子行程卡、7 表原子快照同步及 Dev PWA 圖示(SW v13)均已交付於 `dev`。
- 備註:因雙擊放大再現,已恢復純觀測 iOS 手勢診斷（24 筆/passive）；Scroll-only 與 viewport/focus recovery 政策不變,未新增手勢攔截。

## 🔨 進行中
- 無；等待推送 `dev` 與 Bar 手機實機驗收。

## ⏸ 等 Bar 動作
1. 核准推送目前本機 `dev` 到 `origin/dev`。
2. 推送後以手機全面驗收單幣換算、共享匯率、分帳同步、離線補送、TEST 排除、iOS 手勢報告、Schema 2.5 與 SW v15。
3. 驗收通過後核准 PR merge `dev → main`。

## 下一棒
→ Bar 明確指示後推送 dev 供手機驗收；merge 後 Netlify 正式部署與線上驗證(回滾見 16 §A)。
