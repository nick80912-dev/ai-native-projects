# Ledger UI 歷史瀏覽 Workflow／State 實作計畫

**Goal:** 用 characterization-first 的最小垂直切片，把 Ledger history／selection 的狀態轉移與 UI effects 收斂到可直接測試的 module seam，維持 v94 所有 UI 與資料語意。

**Architecture:** `ledger-ui-state.js` 是純 transition + effect plan module；`createWorkflow(adapter)` 是唯一 production 協調入口。`index.html` 保留 renderer 與相容 `ledgerUiState` object，已遷移 handler 只 dispatch action。

**Tech Stack:** ES5-compatible UMD、原生 JavaScript、Node `assert`、Playwright、既有靜態 PWA／Service Worker。

---

## Task 1：Characterization 與紅燈

- 新增 `tests/ledger-ui-state.test.js`，先 require 尚不存在的 module。
- 鎖定 defaults、state table、immutability、effect ordering、invalid action。
- 更新既有 `ledger-225.test.js`／`ledger-dashboard.test.js` 的 implementation assertions，先要求 dispatch seam，證明 runtime 尚未接線而失敗。
- 執行聚焦 Node tests，保留第一個功能性失敗證據。

## Task 2：純 state module

- 新增 `ledger-ui-state.js`。
- 實作 `createState()`、`transition()`、`activeHistoryFilterCount()`。
- action 只回傳 state／effects，不接 DOM、storage 或 repository。
- 跑 `tests/ledger-ui-state.test.js` 至綠燈。

## Task 3：Workflow 與 production adapter

- 在 module 實作 `createWorkflow(adapter)`。
- 在 `index.html` 載入 module，建立 production adapter 與單一 `ledgerUiWorkflow`。
- 逐一替換 track、history、filter、selection handlers 的 direct mutation。
- 保留 handler 名稱、inline markup、render function 與 scroll 行為。
- 加入 SW SHELL；不改 SW install／activate／fetch。
- 跑 characterization 與所有受影響 Node tests。

## Task 4：Browser workflow

- 新增或擴充 Playwright 規格，從可見 UI 驗證 track／history／filters／selection／return。
- 覆蓋 320／375／390px、鍵盤可操作與無水平 overflow。
- 先證明至少一個 runtime wiring case 在接線前失敗；純 module cases 已由 Task 1 提供紅燈。

## Task 5：版本、文件與完整驗證

- `app-version.js`／`sw.js` → v95，SW 只改版本字串及新增必要 App Shell module。
- `APP_RELEASE_NOTES`、`07_CHANGELOG.md`、`tasks/current.md`、`tests/README.md` 更新。
- SW 更新提示雙版本順延至 v96／v97。
- 執行 69 個以上 Node test files、完整 Playwright、`check-doc-titles`、`check-app-version`、manifest JSON 與 `git diff --check`。
- 審查完整 diff，確認 schema、同步、備份、`PERSONAL_STATE_VERSION`、`netlify.toml` 未改。

## Task 6：提交與交付

- 依 logical slice 建立本機 commits。
- 未取得新的 push 指示前不 push；本批不 deploy、不 tag、不修改 main。
