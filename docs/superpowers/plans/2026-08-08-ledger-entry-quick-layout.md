# Ledger 新增消費快速版面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依核准方案 A 縮短單品新增消費的預設高度，並把代購、分攤與選填資訊改成按需展開。

**Architecture:** 保留既有 Ledger draft 與 save workflow，只新增一個 session-only 的分攤展開旗標；單品 renderer 組合既有欄位為單一選填入口，多品項 renderer 保持原結構。所有互動仍透過現有 `ledgerUiState.draft` 與既有欄位更新函式。

**Tech Stack:** Vanilla HTML/CSS/JavaScript、Node assertions、Playwright。

## Global Constraints

- 不修改 Ledger schema、備份格式、repository、同步、分攤計算或 Service Worker。
- 不改多品項資料流程與 calculator 行為。
- 所有可點擊控制維持既有手機觸控標準，並支援鍵盤與窄螢幕。

---

### Task 1: 以真實 renderer 鎖定方案 A

**Files:**
- Create: `tests/browser/ledger-entry-quick-layout.spec.js`
- Modify: `tests/ledger-entry-p0.test.js`

**Interfaces:**
- Consumes: `openLedgerEntrySheet()`, `setLedgerDraftTrack()`, `renderLedgerEntrySheet()`。
- Produces: 單品個人／團體及 320／375／390px 的 A 版 DOM、鍵盤與 overflow regression。

- [x] **Step 1: 寫入 failing browser test**

驗證團體分攤預設收合、個人代購按需展開、單一其他資訊入口、所有選填欄位仍可使用、次要 save action 及三種 viewport。

- [x] **Step 2: 執行測試並確認因舊版 DOM 而失敗**

Run: `npx playwright test tests/browser/ledger-entry-quick-layout.spec.js`

- [x] **Step 3: 更新 Node 結構契約**

將既有單品 P0 assertion 改為核准的分攤摘要、統一其他資訊與多品項不變契約。

### Task 2: 實作單品快速版面

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: 現有 draft、欄位 renderers、`withLedgerSheetPosition()` 與 save handlers。
- Produces: `toggleLedgerParticipantPanel()`、分攤摘要、統一選填欄位與低強度 save-another 樣式。

- [x] **Step 1: 新增最小 draft UI state 與分攤摘要 renderer**

新草稿以 `participantsOpen:false` 開始；摘要按鈕切換既有 participant group，選擇成員後維持展開狀態。

- [x] **Step 2: 合併單品選填資訊**

抽出可共用的 tax fields，單品在 `entryDetailsOpen` 內依序渲染店家、日期／時間、類別、支付、稅／優惠券及備註；多品項維持原 disclosures。

- [x] **Step 3: 降低 save-and-add-another 視覺權重**

只加 scoped class，保留按鈕 ID、handler、pending 狀態及觸控高度。

- [x] **Step 4: 跑 targeted Node 與 browser tests 至全綠**

Run: `node tests/ledger-entry-p0.test.js`

Run: `npx playwright test tests/browser/ledger-entry-quick-layout.spec.js tests/browser/ledger-entry-workflow.spec.js`

### Task 3: 文件、完整驗證與交付

**Files:**
- Modify: `tests/README.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: 實際測試數字與 viewport 量測。
- Produces: 可追溯的 dev UI 候選紀錄；不占用 v99／v100 SW 更新提示版本。

- [x] **Step 1: 同步測試索引與交付文件**

記錄單品快速版面、範圍限制與實際驗證數字，不修改版本字串。

- [x] **Step 2: 執行 repo 完整 gate**

Run: repo 現有全部 Node tests、Playwright、文件／版本檢查、manifest JSON 與 `git diff --check`。

- [x] **Step 3: 檢查完整 diff，commit 並 push dev**

Commit: `feat(ledger): streamline single-entry workflow`
