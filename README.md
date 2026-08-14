# 日本旅遊 App — README

## 這是什麼
六天五夜日本自駕旅遊的手機 PWA。Google Sheets 當 CMS，以單頁 App 搭配少量獨立 runtime module，部署於 Netlify。
- 正式站:https://trippilot-jp.netlify.app/
- 使用者:Bar(產品負責人,非工程師)與同行友人
- **權威來源**:程式與文件以 **GitHub 本 repo 為唯一權威**;Google Drive 僅為備份。內容資料來源為 Drive 試算表「261018-261023岡山四國六天五夜」(發布 CSV,見 03/schema.js)。

## 快速開始(給 AI / 開發者)
第一閱讀順序:以 `08_AI_HANDOVER.md` 的「閱讀順序」為唯一權威;首次接手依其「接手第一步」輸出理解報告。

- `.ai-manifest.json`:AI 導航檔,掌握專案全貌
- `PROJECT_CONSTITUTION.md`:專案最高規範與 AI Harness 流程
- `08_AI_HANDOVER.md`:交接重點、禁改事項、常見陷阱
- `adr/`:架構決策,重構或推翻既有設計前必讀
- `03_DATABASE.md`:CMS 資料表快速概覽
- `09_SCHEMA_MAPPING.md`:Schema / CMS 欄位細節
- `05_CODING_RULES.md`:程式規範快速概覽
- `11_CODING_CONVENTION.md`:程式規範細節
- `12_DEV_WORKFLOW.md`:常見任務步驟鏈
- `14_FILE_TIERS_AND_GATE.md`:檔案風險分級與 Gate 保護範圍
- `15_AI_EXECUTION_RULES.md`:AI 決策權限、指令效力、不確定性協議、任務分級
- `16_OPS_PLAYBOOK.md`:回滾手冊與 DevOps 安全規範

## 開發工作流程(必守)
1. Bar 用白話描述需求 → AI 以資深工程團隊身分執行
2. 只做被要求的修改,不重構整個專案
3. 交付於 `dev` 分支驗收;正式發版依 `16_OPS_PLAYBOOK.md` §E Release Flow(PR → Bar Review → Bar Merge → Netlify Deploy)
4. 每次修改需通過 QA(斷網/連網/旅行日情境),更新 `07_CHANGELOG.md`
5. 資料內容改動走 Google Sheets,不改程式;程式只在功能/邏輯變動時修改

## 專案檔案
- `index.html` / `app-version.js` — 保留正式站前一代 v110 bridge；讓尚未更新的 v110 worker 在 v111 安裝失敗時仍可運作
- `shell/v111/index.html` / `shell/v111/app-version.js` — v111 不可變文件與 App runtime 版本來源；成功啟用的 `sw.js` 才接管 root 導覽
- `shell/v111/builtin-snapshot.js` — 由刷新工具產生的版本綁定離線資料資產；禁止手動修改
- `navigation-intent.js` — 明確導覽目的地的 session-only state module；DOM 定位與回饋 adapter 位於 `index.html`
- `diagnostic-impact.js` — AppLog 原始紀錄的 display-only impact projection；顯示 adapter 位於 `index.html`
- `today-view.js` — Today Hero 採買摘要的純 model／renderer module；資料選擇與 DOM effects 留在 `index.html`
- `shopping-photo-store.js` — 裝置本機採買照片壓縮與 IndexedDB repository boundary
- `buy-to-ledger.js` — 採買轉記帳的純 domain／workflow runtime module
- `ledger-ui-state.js` — Ledger history、entry 與 correction session 的不可變 state／ordered effects workflow module
- `shopping-ui-state.js` — Shopping list selection 與 form session 的不可變 state／ordered effects workflow module
- `trip-progression.js` — 下一站選擇、cluster blocker 與一次性 auto-skip reconciliation module
- `schema.js` / `validator.js` — 資料規格 SSoT / 防錯與健康檢查
- `tests/` / `tools/` — 可重跑測試與文件一致性檢查
- `tasks/` — 即時工作狀態唯一權威

## 正式部署
- `main` 是正式 Production Branch;日常開發與驗收於 `dev` 分支完成。
- Bar 核准 PR Merge(`dev → main`)後,Netlify 自動執行正式部署;流程與風險分級見 `16_OPS_PLAYBOOK.md`、`14_FILE_TIERS_AND_GATE.md`。
