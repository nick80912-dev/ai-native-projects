# CURRENT(現在正在做的)

> 現況更新於 2026-11-01（v157–v177 的 tag 已建立）。本檔只回答三件事：**現在線上是什麼、還掛著什麼、接下來做什麼**。
> 逐版交付紀錄看 `07_CHANGELOG.md`，正式待辦看 `tasks/backlog.md`，回滾步驟看 `16_OPS_PLAYBOOK.md`。2026-10-16 以前累積在本檔的歷史段落已原文移到 `tasks/done.md` 檔尾「封存」一節。

## 📌 現況

**正式站是 v193**（2026-11-16 發布，PR #181，`main` `796c205`），**最新正式 tag 是 `production-v193`**（v157–v193 每一版都有 tag）。旅程（10/18–10/23）已結束；回程後的修正、#59 收據照片、#62 不限日本、#61 收據辨識（v171–v177）與 #63 退稅追蹤（v178–v181）都已上線；v182 匯率寫法統一與專案整理（Bar 2026-11-09）也已上線；v183 天氣地區不限日本、離線狀態、旅程結束回顧與記帳表單收成一行（Bar 2026-11-09／10）已上線；v184 頂端紙飛機圖示與行前清單（Bar 2026-11-10）也已上線；v185 代購小勾選、疑難排解、今天頁通知位置與結束後行程瀏覽（Bar 2026-11-10）也已上線；v186 畫面更清爽（UI/UX 建議 1–6：線條圖示、小開關、收合備註等，Bar 2026-11-11）也已上線；v187 第七個主題「繪本／和紙」與所有主題的大圓角（Bar 2026-11-11／12）也已上線；v188 航班卡（試算表「航班」分頁）、行前清單的行李區、繪本主題補到其他頁面（Bar 2026-11-12）也已上線；v189 資料健康的團體帳只算目前模式，並結案 backlog #20／#50／#53（Bar 2026-11-13）也已上線。下一趟的試算表副本「TripPilot 下一趟（從岡山複製，待填）」已建立（Bar 2026-11-10），待 Bar 填內容、加 GEMINI_API_KEY、部署 Apps Script 與發布到網路。岡山 Apps Script 已由 Bar 換成最新版（2026-11-09）。每批一版、逐版送 main 給 Bar 手機審查（Bar 2026-10-30 選定）；**改畫面時先截圖給 Bar 確認，確認後才跑完整測試與自動檢查**（Bar 2026-11-03）；上線後用 production-tags workflow 建 tag。

| 項目 | 值 |
|---|---|
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v193** |
| **`origin/main`** | `796c205`（PR [#181](https://github.com/nick80912-dev/ai-native-projects/pull/181)） |
| **`dev`** | 與 `main` 同為 v193（PR [#180](https://github.com/nick80912-dev/ai-native-projects/pull/180) 合併為 `24f402b`） |
| 個人備份格式 | **v11**（v178 起；`PERSONAL_STATE_VERSION=11`，個人帳多了稅額與實際退稅；相容策略見 `docs/personal-state-compatibility.md`） |
| 最新正式 tag | **`production-v193`** → `796c205`（v157–v193 都有 tag；上一個 `production-v192` → `a34bca0`） |
| shell 世代 | repo 只保留最近三代（目前 v191 起；2026-11-09 Bar 核准刪除 v154–v179，ADR 0019 增補段） |
| CI | `sanity`／`browser-qa` 跑 `ubuntu-latest`（2026-10-30 驗過 Ubuntu 26.04 後解除釘版，backlog #54）；browser-qa 時限 25 分鐘（2026-11-01 由 15 放寬，PR #127） |

## ⏳ 還掛著的事（只有 Bar 能做）

目前沒有。Bar 2026-11-15:下一趟旅程**尚未規劃**(試算表副本「TripPilot 下一趟(從岡山複製,待填)」保留,要用時依 `docs/new-trip-handbook.md` 填);#58 Logo **暫時不做**(沒有特別想法,三種稿保留在 backlog 說明)。

> 🔐 **Google OAuth 已改為正式版**（Bar 2026-11-16；隱私權政策 `privacy.html` 隨 v192 上線）：同行友人可用自己的 Google 帳號封存。
> ✅ **手機審查 v178–v189 已通過**（Bar 2026-11-14 回報）；v190 藤紫與 v191 購物頁顏色 Bar 2026-11-15 手機確認 OK。

## 🔜 接下來

1. 依 `tasks/backlog.md`：只剩 #3 驗收後微調（目前無回報問題）；#58 Logo 暫緩（Bar 2026-11-15）。#20／#50／#52／#53 已於 v189 結案；#25 框架抽取已完成；#38 保留固定色；#55、#28／#29／#41、#63 已由 Bar 關閉。

> 正式發布仍遵守 §E：PR 與 Actions 通過後才 merge；Netlify 線上驗證通過後才建立 production tag。tag 用 GitHub Actions 的 **production-tags**（`16_OPS_PLAYBOOK.md` §A5）。
