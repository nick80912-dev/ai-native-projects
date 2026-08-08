# Shop Row A11y And Escaping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 購物頁 #5（`onclick` 仍用臨時跳脫寫法）與 #4（店家列不是真正的控制項）。

**Architecture:** 呈現層改動，不動資料格式與想逛 key。先把跳脫統一到既有的 `jsHtmlAttrString()`，再讓店家列取得 checkbox 語意與鍵盤操作 —— 順序如此，#4 新增的 `onkeydown` 屬性一開始就用正確的跳脫器寫。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準

| 項目 | 值 |
|---|---|
| 起始 SHA | `47d6228` |
| 分支 | `dev` |
| 候選版 | v81（`origin/main` 仍是 v73）|

## 版本策略

依 2026-08-02 裁定七第一款：候選版尚未正式發布 → **併入 v81，不另跳 SW 版本**。`sw.js`、`app-version.js`、`netlify.toml` 不修改，`PERSONAL_STATE_VERSION` 維持 9。

---

### Task 1（#5）：改用共用的屬性跳脫器

**Files:** `index.html`、`tests/shop-escaping.test.js`（新增）

**現況**：四處以 `.replace(/'/g,"\\'")` 手工跳脫，只處理單引號：

| 行 | 產生的 onclick | 內插值的來源 |
|---|---|---|
| `storeRow()` | `toggleWant('…')` | 想逛 key（已 URI 編碼，但 `'` 不會被 `encodeURIComponent` 編碼）|
| 篩選 chip | `setShopPlaceFilter('…')` | `placeId` 或**購物地點名稱**（表格自由輸入）|
| 想逛清單標題 | `toggleShopWantList('…')` | `placeId` 或 `M<index>` |
| 樓層標題 | `toggleFloor('…',this)` | `placeId + '::' + 樓層名稱`（表格自由輸入）|

風險最高的是**樓層名稱**與**購物地點名稱** —— 兩者都直接來自 Google 表格。含 `"` 會直接截斷 `onclick="…"` 屬性；含 `&`、`<` 也不安全。repo 早已有正確的 `jsHtmlAttrString()`（`jsString()` 再加上 `&`／`"`／`<`／`>` 的實體編碼）並用在別處。

- [ ] **Step 1: 先寫失敗測試**
  - `storeRow()` 產生的 `onclick` 對含 `'`／`"`／`&`／`<` 的值必須安全（屬性不被截斷、實體正確）。
  - 購物頁渲染區段不得再出現 `replace(/'/g` 的手工寫法。
  - 四處內插一律走 `jsHtmlAttrString(`。
- [ ] **Step 2: 執行並確認 RED**
- [ ] **Step 3: 四處改用 `jsHtmlAttrString()`**
- [ ] **Step 4: 執行並確認 GREEN**

### Task 2（#4）：店家列成為可鍵盤操作的 checkbox

**Files:** `index.html`、`tests/shop-escaping.test.js`（擴充）、`tests/browser/shop-row-a11y.spec.js`（新增）

**現況**：`<div class="store-row" onclick="toggleWant(…)">` —— 沒有 `role`、`tabindex`、狀態語意；勾選狀態只是 `.st-chk` 裡的一個 ✓ 字元。這是本頁最常被點的控制項（實測 101 家店），卻完全無法以鍵盤操作，螢幕閱讀器也讀不出已勾選與否。

**設計**

- 採 `role="checkbox"` + `aria-checked` 而非 `role="button"` + `aria-pressed`：這是二元選取，視覺上本來就是核取方塊，語音回報「未勾選／已勾選」比「按鈕」精確。
- `tabindex="0"`，`onkeydown` 沿用既有的 `activateKeyboardButton(event,action)`（已同時支援 Enter 與 Space）。
- `.st-chk` 的 ✓ 只是視覺重複，加 `aria-hidden="true"`；狀態由 `aria-checked` 承載。
- 可及名稱取自列內既有文字（店名＋分類＋必逛／免稅＋樓層），不另造 `aria-label`。
- 就地更新路徑（`applyWantToggleInPlace()`）必須同步更新 `aria-checked`，否則語音狀態會與畫面不一致。
- 補 `.store-row:focus-visible` 外框，沿用既有 `[role="button"]:focus-visible` 的樣式語彙（`2px solid var(--sea)`）。
- 觸控區維持現狀（實測 63px，本來就足夠），不改尺寸。

- [ ] **Step 1: 先寫失敗測試**
  - Node：`storeRow()` 輸出 `role="checkbox"`、`tabindex="0"`、`aria-checked` 隨狀態變化、`onkeydown` 走 `activateKeyboardButton`、`.st-chk` 為 `aria-hidden`。
  - 瀏覽器：列可被鍵盤聚焦；按 Space 會切換且 `aria-checked` 同步；就地更新後 `aria-checked` 正確；`:focus-visible` 有可見外框。
- [ ] **Step 2: 執行並確認 RED**
- [ ] **Step 3: 實作**
- [ ] **Step 4: 執行並確認 GREEN**

## Commit 邊界

兩個獨立 commit，不得互相混入：

```text
refactor(shop): escape shop onclick values with the shared helper
fix(shop): make store rows keyboard operable checkboxes
```

不得混入：想逛 key、就地更新、搜尋、其他購物頁重構。

## 回滾

兩者皆為呈現層改動，`git revert` 即可；不影響 `trip_shop_wants` 內容或備份格式。

## 完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```
