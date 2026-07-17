# CURRENT(現在正在做的)

> 更新於 2026-07-17。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳同步基礎批已完成於 `dev`:Schema 2.4 / 8 表快照、Apps Script append-only repository、成員身分、設定 overlay、雙幣彙算、TEST 排除與 ADR 0006；既有分帳端點 `ok` / `dup` 與單筆 CSV 發布均已驗證。
- 本批已完成本地實作:Schema 2.5、JPY/TWD 單幣輸入與自動換算、六類別按鈕、TripConfig 共用匯率／預設幣別、版本控管 Apps Script、被動 iOS 手勢診斷與 SW v15。新版 `updateSettings` 尚待 Apps Script 部署與真實 CSV 發布閘門,不得視為線上已驗證。
- 已同步至 2026-07-16 全部交付後現況:行程表頭契約 `行程`(Schema 2.3)、`fuel` 型別、診斷面板與同步狀態精簡、父子行程卡、7 表原子快照同步及 Dev PWA 圖示(SW v13)均已交付於 `dev`。
- 備註:因雙擊放大再現,已恢復純觀測 iOS 手勢診斷（24 筆/passive）；Scroll-only 與 viewport/focus recovery 政策不變,未新增手勢攔截。

## 🔨 進行中
- 發佈 `apps-script/ledger-sync.gs` 並完成設定更新、TripConfig CSV 與 ledger dup 真實驗證。

## ⏸ 等 Bar 動作
1. 依 `apps-script/README.md` 將已提交的完整程式部署到既有 Web App；完成後通知 Codex 執行真實閘門。
2. 閘門通過並推送 `dev` 後,手機全面驗收單幣換算、共享匯率、分帳同步、離線補送、TEST 排除、Schema 2.5 與 SW v15。
3. 驗收通過後核准 PR merge `dev → main`。

## 下一棒
→ 先完成 Apps Script 部署閘門,再推送 dev 供手機驗收；merge 後 Netlify 正式部署與線上驗證(回滾見 16 §A)。
