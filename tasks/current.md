# CURRENT(現在正在做的)

> 現況更新於 2026-11-01（v157–v177 的 tag 已建立）。本檔只回答三件事：**現在線上是什麼、還掛著什麼、接下來做什麼**。
> 逐版交付紀錄看 `07_CHANGELOG.md`，正式待辦看 `tasks/backlog.md`，回滾步驟看 `16_OPS_PLAYBOOK.md`。2026-10-16 以前累積在本檔的歷史段落已原文移到 `tasks/done.md` 檔尾「封存」一節。

## 📌 現況

**正式站是 v178**（2026-11-01 發布，PR #133，`main` `e894f12`），**最新正式 tag 是 `production-v178`**（v157–v178 每一版都有 tag）。旅程（10/18–10/23）已結束；回程後的修正、#59 收據照片、#62 不限日本、#61 收據辨識（v171–v177）與 #63 退稅追蹤（v178）都已上線。每批一版、逐版送 main 給 Bar 手機審查（Bar 2026-10-30 選定）；上線後用 production-tags workflow 建 tag。

| 項目 | 值 |
|---|---|
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v178** |
| **`origin/main`** | `e894f12`（PR [#133](https://github.com/nick80912-dev/ai-native-projects/pull/133)） |
| **`dev`** | 與 `main` 同為 v178（PR [#132](https://github.com/nick80912-dev/ai-native-projects/pull/132) 合併為 `893e1fb`） |
| 個人備份格式 | **v11**（v178 起；`PERSONAL_STATE_VERSION=11`，個人帳多了稅額與實際退稅；相容策略見 `docs/personal-state-compatibility.md`） |
| 最新正式 tag | **`production-v178`** → `e894f12`（v157–v178 都有 tag；上一個 `production-v177` → `20c4fe2`） |
| shell 世代 | repo 只保留 v154 起（ADR 0019 增補段） |
| CI | `sanity`／`browser-qa` 跑 `ubuntu-latest`（2026-10-30 驗過 Ubuntu 26.04 後解除釘版，backlog #54）；browser-qa 時限 25 分鐘（2026-11-01 由 15 放寬，PR #127） |

## ⏳ 還掛著的事（只有 Bar 能做）

1. **換岡山 Apps Script**：把岡山試算表的 Apps Script 換成最新 `apps-script/ledger-sync.gs`，「部署 → 管理部署作業 → 編輯 → 新版本」，不用重新授權。換了之後收據辨識才會有 v176 的免稅與稅率、v177 的稅額；沒換之前 App 照常運作。
2. **手機審查 v178**（退稅追蹤）：記一筆多品項、選「税抜」，「稅」裡的稅額欄會照稅率先算好（可以改），下方整單實付＝品項加總＋稅額；勾「可退稅」後，分帳 → 個人卡片多一列「退稅」，點進去按「已收到」記實際退了多少，「整趟旅程」會扣掉。

## 🔜 接下來

1. 依 `tasks/backlog.md` 順序：#57 低優先與清理、#58 Logo 與圖示（需 Bar 挑稿）、#55 繪本主題研究，以及長期項目（#3、#12、#20、#25 等）。

> 正式發布仍遵守 §E：PR 與 Actions 通過後才 merge；Netlify 線上驗證通過後才建立 production tag。tag 用 GitHub Actions 的 **production-tags**（`16_OPS_PLAYBOOK.md` §A5）。
