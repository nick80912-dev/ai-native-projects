# Shop List Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 購物頁 #2（每點一下重建整份清單）與 #3（搜尋留下空殼、只比對店名、無 debounce）。

**Architecture:** 呈現層改動，不動資料格式。想逛切換改為就地更新 DOM 並只重寫計數；只有在真的需要改變區塊結構時才回退整份重繪。搜尋改為命中為零就不渲染該購物地點，並讓既有的全域空狀態生效。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準

| 項目 | 值 |
|---|---|
| 起始 SHA | `354c85d` |
| 分支 | `dev` |
| 候選版 | v81（`origin/main` 仍是 v73，v81 尚未正式發布）|

## 版本策略

依 2026-08-02 裁定七第一款：候選版尚未正式發布 → **併入 v81，不另跳 SW 版本**。`sw.js`、`app-version.js`、`netlify.toml` 不修改。`PERSONAL_STATE_VERSION` 維持 9。

> 已安裝 v81 的裝置不會收到 SW 更新訊號；SW 對外殼採 network-first，連網重載即可取得新 `index.html`。

## 現況實測（v81）

| 現象 | 實測值 |
|---|---|
| 點一次店家後存活的 DOM 節點 | 0（約 720 節點全數重建）|
| 篩選列水平捲動 | 150px → 0（每次 render 都跑 `centerShopFilterChip()`）|
| 該購物地點第一次標記造成的位移 | 約 51px（想逛清單區塊出現）；第二次起 0px |
| 搜尋 `UNIQLO` | 5 個購物地點標題、2 筆命中、**3 塊「找不到」空殼** |
| 搜尋不存在字串 | 5 塊「找不到」，全域「目前沒有符合條件」永不出現（`rendered++` 無條件執行）|
| 搜尋比對範圍 | 只有 `s.name`，輸入分類（如 `服飾`）找不到任何東西 |

---

### Task 1（#2）：想逛切換改為就地更新

**Files:** `index.html`、`tests/browser/shop-interaction.spec.js`（新增）

**設計**

- `storeRow()` 增加 `data-want="<key>"`，讓切換時能以屬性選取器找到同一家店的所有列（樓層清單與想逛清單可能同時存在）。onclick 維持原樣（跳脫整理屬 #5，不在本批）。
- 計數容器加上可定位的標記：想逛總數 `id="shopWantTotal"`、想逛清單標題 `data-want-head="<wkey>"`、樓層計數 `data-floor-count="<fkey>"`。
- `toggleWant(id)` 改為：寫入 storage → 呼叫 `applyWantToggleInPlace(id,on)`；**只有**該函式回報無法就地處理時才 `renderShopResults()`。
- `applyWantToggleInPlace()` 就地更新所有符合的 `.st-chk`，並重算後寫入三處計數文字。
- 必須回退整份重繪的情況（區塊結構真的改變，不是效能問題）：
  1. `shopPlaceFilter==='wants'`（清單成員資格改變）
  2. 該購物地點的想逛清單區塊需要出現或消失（`wanted.length` 0↔>0）
  3. 該購物地點的想逛清單目前展開（內容需要增減列）
- `centerShopFilterChip()` 由 `renderShopResults()` 尾端移出，改為只在**篩選真的改變時**呼叫（`setShopPlaceFilter()`）與首次渲染（`renderShop()`）。

- [ ] **Step 1: 先寫失敗的瀏覽器測試**
  - 點一次店家後，該列的 DOM 節點識別必須存活（`sameNodeIdentity === true`）。
  - 篩選列水平捲動位置不被重設。
  - 勾選狀態與三處計數同步更新。
  - 想逛清單展開時切換 → 允許重繪，但內容必須正確。
- [ ] **Step 2: 執行並確認 RED**（節點識別為 false、捲動被歸零）
- [ ] **Step 3: 實作**
- [ ] **Step 4: 執行並確認 GREEN**

### Task 2（#3）：搜尋不再留下空殼、可比對分類、加上 debounce

**Files:** `index.html`、`tests/shop-search.test.js`（新增）、`tests/browser/shop-interaction.spec.js`

**設計**

- 新增純函式 `shopStoreMatches(store,query)`：比對 `name` 與 `cat`，皆轉小寫；空查詢一律視為命中。
- 搜尋分支：`hits.length===0` 時 **`return`**（不渲染該購物地點區塊、不累加 `rendered`），移除逐個購物地點的「找不到」空殼。
- 全域空狀態補上搜尋語意：有 `_shopQ` 時顯示 `找不到「<query>」`，否則維持既有的「尚未標記想逛店家」／「目前沒有符合條件的購物資料」。
- `shopQ()` 加上 `SHOP_SEARCH_DEBOUNCE_MS = 120` 的 debounce；`_shopQ` 仍即時更新，只延後重繪。輸入框位於 `#shopResults` 之外，focus 不受影響。

- [ ] **Step 1: 先寫失敗測試**
  - Node：`shopStoreMatches` 比對名稱與分類、大小寫不敏感、空查詢命中。
  - Node：搜尋分支不得再輸出逐地點的「找不到」字樣。
  - 瀏覽器：搜尋 `UNIQLO` 只渲染有命中的購物地點；查無結果時只出現一則全域空狀態；連續輸入只觸發一次重繪。
- [ ] **Step 2: 執行並確認 RED**
- [ ] **Step 3: 實作**
- [ ] **Step 4: 執行並確認 GREEN**

## Commit 邊界

兩個獨立 commit，不得互相混入，也不得混入 #4（store-row 無障礙）與 #5（onclick 跳脫整理）：

```text
perf(shop): update want marks in place instead of rebuilding the list
fix(shop): drop empty search blocks and match store categories
```

## 回滾

兩個 commit 皆為呈現層改動，`git revert` 即可，無資料遷移，不影響 `trip_shop_wants` 內容或備份格式。

## 完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```
