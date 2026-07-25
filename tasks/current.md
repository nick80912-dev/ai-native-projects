# CURRENT(現在正在做的)

> 更新於 2026-07-25。細任務層;里程碑看 `06_ROADMAP.md`,歷史交付看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 📌 現況
- 2026-07-23 治理決策追認、§4 禁改清單硬停規則與任務板歸位 — 已完成,詳見 `07_CHANGELOG.md`。
- v34–v44 三秒記帳與首頁／結算卡系列 — 已完成並經 Bar 真機驗收,詳見 `07_CHANGELOG.md`。
- 採買清單批（SW v45）— 已完成開發；目標測試、完整 41／41 Node tests、文件標題檢查及 375px／390px Browser QA 通過，待 Bar iPhone Safari／PWA 真機驗收；詳見 `07_CHANGELOG.md`。
- 2026-07-25 結算狀態、近即時同步與介面簡化 Hotfix（`fix/settlement-state-and-live-sync`，SW v47）— 開發完成，完整 43／43 Node tests、文件標題檢查與 Browser 冒煙（0 console error）通過；**中段停點：等 Bar 部署 Apps Script `doGet` 後才可續行真實端點驗證**，詳見 `07_CHANGELOG.md`。

## ⏸ 等 Bar 動作
1. **（優先）部署新版 `apps-script/ledger-sync.gs`**：新版本部署、保持原 Web App URL，並以無痕模式確認 `{WEB_APP_URL}?action=ledger&after=0` 回傳可解析 JSON；步驟見 `apps-script/README.md`「doGet 部署與驗收」。回報後 Claude 才續行真實 GET／CORS／redirect／`after`／`reset`／`serverTime` 與前端 fast pull 整合驗證。
2. 驗收採買清單的 Today 提醒／常駐入口、完整清單 overlay、單筆與多品項記帳閉環，以及 PWA 更新後的本機資料保留。
3. 等待設定頁 2.0 批發包;正式範圍見 `tasks/backlog.md`。
4. 後續批次驗收通過後,由 Bar 核准 PR merge `dev → main`;未核准前不得 merge、push `main` 或部署。

## 下一棒
→ Bar 先部署 Apps Script `doGet` 並回報,Claude 續行真實端點與前端整合驗證;其後做採買清單與本批結算 Hotfix 的 iPhone Safari／PWA 真機驗收,再發出「設定頁 2.0 批」Codex prompt，全部驗收完成再另案處理 `dev → main`。
