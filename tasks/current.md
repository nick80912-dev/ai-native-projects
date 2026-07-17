# CURRENT(現在正在做的)

> 更新於 2026-07-17。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳同步批已完成於 `dev`:Schema 2.4 / 8 表快照、Apps Script append-only repository、成員身分、設定 overlay、雙幣彙算、TEST 排除、SW v14 與 ADR 0006；真實端點 `ok` / `dup` 與單筆 CSV 發布均已驗證,待 Bar 手機驗收。
- 已同步至 2026-07-16 全部交付後現況:行程表頭契約 `行程`(Schema 2.3)、`fuel` 型別、診斷面板與同步狀態精簡、父子行程卡、7 表原子快照同步及 Dev PWA 圖示(SW v13)均已交付於 `dev`。
- 備註:iOS 手勢診斷子系統已於 2026-07-16 精簡批退役,診斷路線關閉;Scroll-only 政策維持;問題若再現另立新任務。

## 🔨 進行中
- 無(等待驗收)。

## ⏸ 等 Bar 動作
1. 手機全面驗收 `dev` 最新版:分帳跨裝置同步、首次成員選擇、設定匯出還原、離線補送、TEST 排除、Schema 2.4 與 SW v14。
2. 驗收通過後核准 PR merge `dev → main`。

## 下一棒
→ merge 後 Netlify 正式部署與線上驗證(回滾見 16 §A)。
