# v88 Data Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有記帳、同步與設定介面中顯示可信的今日／累計金額、資料新鮮度、partial 來源與健康摘要。

**Architecture:** 以純 presentation model 深化既有 seam：Ledger period summary 保持唯一金額來源，sync status model 保持唯一 snapshot 狀態來源，settings health model 只聚合前兩者及既有 repository／照片狀態。Snapshot envelope 只增加向後相容 metadata，不改外部資料 schema。

**Tech Stack:** 單檔 HTML/CSS/JavaScript、Node `assert` 測試、Playwright、Service Worker。

## Global Constraints

- 版本固定 v88。
- 不改 Google Sheet schema、Ledger record、個人備份 v9、Apps Script、`netlify.toml`。
- `sw.js` 只改 `SW_VERSION`。
- 不 push、不 deploy、不建立 tag。
- 保留既有未追蹤 `docs/superpowers/plans/2026-08-02-ui-ux-hardening.md`。

---

### Task 1: Ledger 今日與旅程摘要

**Files:**
- Modify: `tests/ledger-dashboard.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `buildLedgerPeriodSummary(records, now)`。
- Produces: `ledgerSummaryPresentation(track, period, currency, secondary)` 與更新後的 `renderSplit()`。

- [x] 新增個人／團體、零筆／多筆、JPY／TWD 的失敗測試。
- [x] 執行 `node tests/ledger-dashboard.test.js`，確認因 presentation helper／新文案不存在而 RED。
- [x] 實作同一卡片的今日主數字與旅程累計次摘要，移除重複 Today hint。
- [x] 重跑聚焦測試至 GREEN。

### Task 2: 同步時間與來源模型

**Files:**
- Modify: `tests/atomic-sheet-sync.test.js`
- Create: `tests/browser/data-observability.spec.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `formatSyncRelativeTime(value, now, compact)`、`snapshotLastCompleteAt(snapshot, state)`、深化後 `syncStatusModel(now)`、`syncHeaderModel(state, now)`。

- [x] 新增相對時間邊界、full／連續 partial、顯示名稱與 header aria 的失敗測試。
- [x] 執行聚焦 Node 測試確認 RED。
- [x] 在 snapshot metadata 保存 `lastCompleteAt`／`sourceCreatedAt`，實作呈現模型與每分鐘前景刷新。
- [x] 更新 partial toast／面板來源名稱並重跑至 GREEN。

### Task 3: 設定資料健康摘要

**Files:**
- Modify: `tests/settings-grouped-root.test.js`
- Modify: `tests/app-version-fallback.test.js`
- Create: `tests/browser/data-observability.spec.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `settingsDataHealthModel()`、`renderSettingsDataHealth()`。
- Consumes: `syncStatusModel()`、`ledgerRepository.pendingCount()`、`shoppingPhotoStorageSummary()`。

- [x] 新增正常、partial、failed、pending、照片異常與個人本機語意的失敗測試。
- [x] 執行聚焦測試確認 RED。
- [x] 實作根頁摘要與資料子頁四列健康狀態，不新增互動巢狀。
- [x] 重跑至 GREEN。

### Task 4: 版本、文件與已結束待辦

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `06_ROADMAP.md`
- Modify: `docs/batch2-device-acceptance.md`
- Modify: `tests/README.md`

- [x] 將 App／SW 升為 v88並更新最近五版說明。
- [x] 記錄 v74–v87 真機驗收通過，v88 尚待效果確認。
- [x] 關閉 backlog #23，保留編號缺口並移除 roadmap 重複項。
- [x] 執行版本與文件標題檢查。

### Task 5: 視覺與完整驗證

**Files:**
- Create: `tests/browser/data-observability.spec.js`。
- Create outside repository: `C:/Users/Aaron Huang/.codex/visualizations/2026/08/03/trippilot-v88-ledger.png`
- Create outside repository: `C:/Users/Aaron Huang/.codex/visualizations/2026/08/03/trippilot-v88-data-health.png`

- [x] 驗證 320／375／390px、個人／團體、所有同步狀態與設定頁 overflow／aria／鍵盤。
- [x] 以 390×844 固定資料產生記帳頁與設定資料健康頁預覽。
- [x] 執行全部 Node tests、全部 Playwright、`check-doc-titles`、`check-app-version`、`git diff --check`。
- [x] 檢查完整 diff，確認 `sw.js` 僅一行、無 schema／部署／資料格式範圍外修改。
