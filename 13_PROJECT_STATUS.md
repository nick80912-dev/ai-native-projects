# 13 Project Status

> 更新於 2026-08-01。本檔是 `tasks/` 的**人讀快照**,若與 `tasks/` 不一致,以 `tasks/` 為準。

## 目前階段

**2026-08-01:SW v73 已正式發布**(正式站 v18 → v73,merge commit `17c423f`,tag `production-v73`)。下一批為 v74 設定根頁改版,設計已核准尚未實作。

六天行程大方向資料已補完,進入「手機驗收 + 微調」階段。日常開發於 `dev` 完成,Bar 核准 PR Merge(`dev → main`)後觸發 Netlify 正式部署。

## 已完成(近期)
- 六天行程大方向資料補完(剩內容微調,修訂走 Google Sheets 即時生效)。
- 首頁下一站模式、完成/跳過/復原、首頁天氣摘要。
- SW 更新完整性修正(SW v73):新版 SW 不再從 HTTP cache 裝入舊版 SHELL;離線未命中的子資源不再 fallback 成 index.html;版本一致性由 tools/check-app-version.js 守住。
- 結算一致性批本機開發：還款確認後歷史不可改寫、收據級更正／作廢、二次差額預覽與版本歷史（SW v69；待 Bar 真機驗收與推送）。
- 購物頁多地點切換(全部/想逛/各購物地點、區域/樓層)。
- Restaurants R001/R006 欄位補齊(已由發布 CSV 確認)。
- 治理層 v2(2026-07-09):狀態文件收斂、檔案風險分級與 Gate 分級(14)、AI 執行規範(15)、回滾與 DevOps 安全手冊(16)、00 交接檔定位為歷史快照。

## 目前等待
- Bar 手機驗收 GitHub `dev` 最新版本 SW v73;Netlify 測試站需先手動部署並依 16 §F5 核對線上版本,不得只看 Git 分支。
- 驗收中發現的問題 → 最小修改微調。
- MAP CODE UI 行為獨立於文件一致性修正處理。
- Bar 核准 PR Merge(`dev → main`)→ 進入正式部署流程。

## 下一步
1. 手機驗收 SW v73,依 `docs/batch2-device-acceptance.md` 逐項執行;測試站需先手動部署並依 16 §F5 核對線上版本。
3. 提出 `dev → main` Pull Request,由 Bar Review / Merge。
4. Netlify 自動部署與線上驗證;回滾程序備援見 16。

## 風險與注意
- 內容修訂一律走 Google Sheets,程式端不硬改資料。
- 天氣摘要失敗時應隱藏,不阻塞首頁。
- 個人狀態只存 localStorage,不進 CMS。
- Hotels 以「名稱比對」掛 Places 是已知脆弱點(名稱異動會懸空),列於 backlog 觀察。
- 修改核心架構、schema、Google Sheet 欄位、既有 ADR、或 14 定義的高風險檔案前,必須先取得 Bar 確認。
- `sw.js`、`app-version.js` 與 `netlify.toml` 的 cache header 屬同一 PWA 風險群組(14 號);升版時兩個版本字串必須同步,否則 CI 的版本一致性檢查會失敗。
