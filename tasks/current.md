# CURRENT(現在正在做的)

> 現況更新於 2026-11-22。本檔只回答三件事：**現在線上是什麼、還掛著什麼、接下來做什麼**。
> 逐版交付紀錄看 `07_CHANGELOG.md`（2026-11-14 以前的已封存到 `docs/archive/`），正式待辦看 `tasks/backlog.md`，回滾步驟看 `16_OPS_PLAYBOOK.md`。2026-10-16 以前累積在本檔的歷史段落已原文移到 `tasks/done.md` 檔尾「封存」一節。

## 📌 現況

- **正式站是 v207**（2026-11-21 發布，PR #217，`main` `c8198a9`），最新正式 tag 是 `production-v207`（v157–v207 每一版都有 tag）。
- **v208 今天與行程頁看得出「現在」**（Bar 2026-11-22 核准 1–5、R2、R3）待發布：清單模式依時鐘顯示現在與下一站、拿掉清單的「完成」鈕、行程頁捲到現在並照拖拉後順序。
- **下一趟「仙台行」**：試算表已建立並部署新版 Apps Script（版本 2026-11-19，收據辨識已設定）；TripConfig 的 Trip ID、名稱與日期待 Bar 填。填好後 Bar 先連接，再用「設定 → 邀請旅伴」分享連結（v205）。
- **岡山**：旅程（10/18–10/23）已結束、全員已結清；Bar 的手機仍連著岡山。岡山專用的程式（內建行程、舊來源）要等所有手機都換到仙台後才能拿掉。
- **工作方式**（Bar 選定）：每批一版、逐版送 main 給 Bar 手機審查；改畫面先截圖給 Bar 確認，確認後才跑完整測試；上線後用 production-tags workflow 建 tag。

| 項目 | 值 |
|---|---|
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v207** |
| **`origin/main`** | `c8198a9`（PR [#217](https://github.com/nick80912-dev/ai-native-projects/pull/217)，merge commit） |
| **`dev`** | 與 `main` 同為 v207（PR [#216](https://github.com/nick80912-dev/ai-native-projects/pull/216) 合併為 `3da61df`） |
| 個人備份格式 | **v11**（v178 起；`PERSONAL_STATE_VERSION=11`；相容策略見 `docs/personal-state-compatibility.md`） |
| 最新正式 tag | **`production-v207`** → `c8198a9`（v157–v207 都有 tag；上一個 `production-v206` → `aa2362c`） |
| shell 世代 | repo 只保留最近三代（目前 v206 起；ADR 0019 增補段）；升版用 `node tools/bump-version.js`（2026-11-21 起） |
| CI | `sanity`／`browser-qa` 跑 `ubuntu-latest`、Node 22、Playwright 1.65.1；觸發：PR 與 main push（2026-11-21 起不再跑 dev push）；browser-qa 時限 25 分鐘 |

## ⏳ 還掛著的事（只有 Bar 能做）

- 填「仙台行」TripConfig（Trip ID、Trip Name、Start／End Date、出發前的匯率），發布到網路後先用自己的手機連接。
- #58 Logo **暫時不做**（Bar 2026-11-15，三種稿保留在 backlog 說明）。

> 🔐 **Google OAuth 已改為正式版**（Bar 2026-11-16；隱私權政策 `privacy.html` 隨 v192 上線）：同行友人可用自己的 Google 帳號封存。

## 🔜 接下來

1. v208 發布。
2. 所有手機都換到仙台後：拿掉岡山專用程式（健檢第 3 項的後半）。
3. 依 `tasks/backlog.md`：只剩 #3 驗收後微調（目前無回報問題）；#58 Logo 暫緩。

> 正式發布仍遵守 §E：PR 與 Actions 通過後才 merge；Netlify 線上驗證通過後才建立 production tag。tag 用 GitHub Actions 的 **production-tags**（`16_OPS_PLAYBOOK.md` §A5）。
