# CURRENT(現在正在做的)

> 現況更新於 2026-11-01（v157–v177 的 tag 已建立）。本檔只回答三件事：**現在線上是什麼、還掛著什麼、接下來做什麼**。
> 逐版交付紀錄看 `07_CHANGELOG.md`，正式待辦看 `tasks/backlog.md`，回滾步驟看 `16_OPS_PLAYBOOK.md`。2026-10-16 以前累積在本檔的歷史段落已原文移到 `tasks/done.md` 檔尾「封存」一節。

## 📌 現況

**正式站是 v177**（2026-11-01 發布，PR #126，`main` `20c4fe2`），**最新正式 tag 是 `production-v177`**（v157–v177 每一版都已補 tag，2026-11-01）。旅程（10/18–10/23）已結束；回程後的修正、#59 收據照片、#62 不限日本、#61 收據辨識（v171–v177）都已上線。每批一版、逐版送 main 給 Bar 手機審查（Bar 2026-10-30 選定）。

| 項目 | 值 |
|---|---|
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v177** |
| **`origin/main`** | `8ae2138`（PR [#130](https://github.com/nick80912-dev/ai-native-projects/pull/130)：只加了建 tag 的 workflow，App 仍是 v177 的 `20c4fe2`） |
| **`dev`** | 與 `main` 同為 v177（PR [#129](https://github.com/nick80912-dev/ai-native-projects/pull/129) 合併為 `3ea9ab8`） |
| 個人備份格式 | **v11**（v178 起；`PERSONAL_STATE_VERSION=11`，個人帳多了稅額與實際退稅；相容策略見 `docs/personal-state-compatibility.md`） |
| 最新正式 tag | **`production-v177`** → `20c4fe2`（v157–v177 都有 tag；之前的錨點 `production-v156` → `bc59984`） |
| shell 世代 | repo 只保留 v154 起（ADR 0019 增補段） |
| CI | `sanity`／`browser-qa` 跑 `ubuntu-latest`（2026-10-30 驗過 Ubuntu 26.04 後解除釘版，backlog #54）；browser-qa 時限 25 分鐘（2026-11-01 由 15 放寬，PR #127） |

## ⏳ 還掛著的事（只有 Bar 能做）

1. **換岡山 Apps Script**：把岡山試算表的 Apps Script 換成最新 `apps-script/ledger-sync.gs`，「部署 → 管理部署作業 → 編輯 → 新版本」，不用重新授權。換了之後收據辨識才會有 v176 的免稅與稅率、v177 的稅額；沒換之前 App 照常運作。
2. **手機審查 v178**（退稅追蹤，上線後）。

## 🔜 接下來

1. **v178 退稅追蹤（backlog #63）**：Bar 2026-11-01 確認調整後的畫面並回「好，完成後送上main我手機審查」，開發中。只改個人帳（存在手機），試算表與 Apps Script 不用改；個人備份格式升為 v11。
2. 其餘依 `tasks/backlog.md` 順序：#57 低優先與清理、#58 Logo 與圖示（需 Bar 挑稿）、#55 繪本主題研究，以及長期項目（#3、#12、#20、#25 等）。

> 正式發布仍遵守 §E：PR 與 Actions 通過後才 merge；Netlify 線上驗證通過後才建立 production tag。tag 用 GitHub Actions 的 **production-tags**（`16_OPS_PLAYBOOK.md` §A5）。
