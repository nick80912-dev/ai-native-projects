# 日本旅遊 App — README

個人帳獨立匯出格式與限制見 [匯出契約](docs/personal-ledger-export.md)（v143 起提供；發布狀態以 tasks/current.md 為準）。

## 這是什麼
旅遊用的手機 PWA（TripPilot）：第一趟是 2026-10 岡山六天五夜自駕（已結束），之後每趟連接一份新的 Google Sheet，不限日本（ADR 0021、v168–v170）。Google Sheets 當 CMS，以單頁 App 搭配少量獨立 runtime module，部署於 Netlify。
- 正式站:https://trippilot-jp.netlify.app/
- 使用者:Bar(產品負責人,非工程師)與同行友人
- **權威來源**:程式與文件以 **GitHub 本 repo 為唯一權威**;個人 Google Drive 只存唯讀過往旅程，不是即時帳務權威。內容資料來源是每趟旅程各自的 Google 試算表(發布 CSV,見 03/schema.js);第一趟是「261018-261023岡山四國六天五夜」。

## 快速開始(給 AI / 開發者)
第一閱讀順序以 `08_AI_HANDOVER.md` 的「閱讀順序」為準;首次接手依其「接手第一步」輸出理解報告。通用治理規則在私人 repo `ai-native-framework`(版本見 `.ai-manifest.json`),本 repo 只記專案差異。

| 文件 | 內容 |
|---|---|
| `.ai-manifest.json` | AI 導航檔,幾百字掌握全貌 |
| `PROJECT_CONSTITUTION.md` | 專案憲章(依框架,只記差異) |
| `01_PROJECT.md` | 專案定位、里程碑、長期風險 |
| `02_ARCHITECTURE.md` | 架構與資料流 |
| `03_DATABASE.md` | Google Sheet 資料表概覽 |
| `04_UI_GUIDELINES.md` | 介面與主題規範 |
| `07_CHANGELOG.md` | 逐版紀錄(較舊的在 `docs/archive/`) |
| `08_AI_HANDOVER.md` | 現行契約、禁改事項、前人踩過的坑 |
| `09_SCHEMA_MAPPING.md` | 欄位對照(由 `schemaDoc()` 產生) |
| `10_FOLDER_STRUCTURE.md` | 資料夾與檔案職責 |
| `11_CODING_CONVENTION.md` | 技術基線、命名、陷阱 |
| `12_DEV_WORKFLOW.md` | 常見任務步驟鏈 |
| `14_FILE_TIERS_AND_GATE.md` | 檔案風險分級 |
| `15_AI_EXECUTION_RULES.md` | AI 執行規範(依框架,只記差異) |
| `16_OPS_PLAYBOOK.md` | 發布、回滾、營運手冊 |
| `CONTEXT.md` | 專案詞彙表 |
| `adr/` | 架構決策紀錄;重構或推翻既有設計前必讀 |
| `tasks/` | 即時狀態(`current.md`)、待辦(`backlog.md`)、已完成(`done.md`) |
| `docs/` | 新旅程手冊、備份相容性契約、匯出契約、真機驗收紀錄、歷史封存 |

## 開發工作流程(必守)
1. Bar 用白話描述需求 → AI 以工程團隊身分執行;改畫面先給截圖,Bar 說「好」才測試與發版。
2. 只做被要求的修改,不重構整個專案。
3. PR 進 `dev` → CI → Release PR(`dev` → `main`)→ Netlify → 線上核對 → production tag(`16_OPS_PLAYBOOK.md` §E)。
4. 每次修改需通過 QA(斷網/連網/旅行日情境),更新 `07_CHANGELOG.md`。
5. 資料內容改動走 Google Sheets,不改程式。

## 專案檔案
- `index.html` / `app-version.js` — 保留 v110 predecessor bridge；讓尚未更新的 v110 worker 在 current generation 安裝失敗時仍可運作
- `shell/v188/index.html` / `shell/v188/app-version.js` — current generation（正式版）的 App 文件與 runtime 版本來源；成功啟用的 `sw.js` 才接管 root 導覽；已發布 generation 保持不可變，repo 只保留最近幾代（見 ADR 0019 增補段）
- `shell/v188/builtin-snapshot.js` — 由 `tools/refresh-builtin-snapshot.js` 產生的版本綁定離線資料資產；八表內容沿用已核准的 v136 種子 CSV（`tests/trip-lifecycle-wiring.test.js` 比對），升版只更新版本標記；禁止手動修改
- `navigation-intent.js` — 明確導覽目的地的 session-only state module；DOM 定位與回饋 adapter 位於 `index.html`
- `diagnostic-impact.js` — AppLog 原始紀錄的 display-only impact projection；顯示 adapter 位於 `index.html`
- `today-view.js` — Today Hero 採買摘要的純 model／renderer module；資料選擇與 DOM effects 留在 `index.html`
- `shopping-photo-store.js` — 裝置本機採買照片壓縮與 IndexedDB repository boundary
- `trip-currency.js` — 旅程幣別：當地幣別資料、最小單位換算、輸入解析與顯示格式（v168，不限日本）
- `ledger-receipts.js` — 分帳收據照片的純函式（EXIF 拍攝時間、紀錄對應鍵、連結表）；照片存在獨立的裝置本機 IndexedDB（v167）
- `buy-to-ledger.js` — 採買轉記帳的純 domain／workflow runtime module
- `ledger-ui-state.js` — Ledger history、entry 與 correction session 的不可變 state／ordered effects workflow module
- `shopping-ui-state.js` — Shopping list selection 與 form session 的不可變 state／ordered effects workflow module
- `trip-progression.js` — 下一站選擇、cluster blocker 與一次性 auto-skip reconciliation module
- `trip-lifecycle.js` — 個人旅程狀態、預檢條件與本機清理 policy
- `trip-archive.js` — 八表及個人狀態封存格式與讀回驗證
- `trip-drive.js` — Google Drive 個人封存及追加式回顧筆記邊界；同次 App 重用有效記憶體授權，取消／逾時可重試，不持久化 token
- `trip-lifecycle-flow.js` — 重置、清除及中斷後恢復的流程協調
- `trip-source.js` — 目前連接的旅程來源、開機分類與「連接新旅程」交易（v150）
- `schema.js` / `validator.js` — 資料規格 SSoT / 防錯與健康檢查
- `tests/` / `tools/` — 可重跑測試與文件一致性檢查
- `tasks/` — 即時工作狀態唯一權威

## Google 授權(個人 Drive 封存,ADR 0020)
Google Cloud 專案 `trippilot-510301` 已啟用 Drive API;OAuth Web client「TripPilot Web PWA」的公開 Client ID 在 App 內,JavaScript 來源為 `https://nick80912-dev.github.io` 與 `https://trippilot-jp.netlify.app`。只使用 `drive.file`,Client Secret 不進前端或 repo。OAuth 目前為 External Testing,測試使用者只有 Bar;其他旅伴需加入測試使用者或完成 Google 對外發布流程,才可自行授權。

## 正式部署
- `main` 是正式 Production Branch;日常開發與驗收於 `dev` 分支完成。
- Bar 核准 PR Merge(`dev → main`)後,Netlify 自動執行正式部署;流程與風險分級見 `16_OPS_PLAYBOOK.md`、`14_FILE_TIERS_AND_GATE.md`。
