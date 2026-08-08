# Shop Wants Mode And List Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「想逛」從篩選條件改為**閱讀模式**，補上一鍵清除與空狀態，並在購物頁加入採買清單入口。

**Architecture:** 全部為呈現層改動。「全部」與「想逛」是兩種不同閱讀目的，各自使用適合的版面，不為了共用 UI 而勉強保留樓層手風琴。採買清單維持獨立資料模型，只加導覽入口，不做商場內嵌推導。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準

| 項目 | 值 |
|---|---|
| 起始 SHA | `7f6ebd4` |
| 分支 | `dev` |
| 候選版 | v81（`origin/main` 仍是 v73）|

## 版本與範圍

依 2026-08-02 裁定七第一款：候選版尚未正式發布 → **併入 v81，不另跳版**。

**明文不做**：不改 schema、不升 `PERSONAL_STATE_VERSION`（維持 9）、不建立採買項目到店家的新關係、不做商場內嵌採買呈現（方案 b）、不動 `sw.js`／`app-version.js`／`netlify.toml`。

## 現況實測（標記 2 家店）

| | 全部 | 想逛 |
|---|---|---|
| 購物地點區塊 | 5 | 2 |
| **店家列** | 101 | **75** |
| 其中已勾選 | 2 | 2 |
| 樓層區塊 | 11 | 8 |
| `.want-box` 預設展開 | — | 0 / 2 |

`wants` 篩選只決定哪些商場出現，商場內仍渲染全部樓層與全部店家；唯一只列想逛的 `.want-box` 還預設收合。

## 已查證的前提

- **採買清單是 modal overlay**（`openShoppingList()` 建立 `#shoppingListOverlay` 疊在 body 上），**不切換 view**，`curView` 從頭到尾不變。因此「從哪裡進去就回哪裡」是**天然成立**的：使用者根本沒有離開過原本的頁面，不存在也不需要「返回目的地」的記錄邏輯。

  兩個入口實測（本批新增購物頁入口後將有兩個；設定頁另有第三個入口，行為同理）：

  | 進入頁面 | 開啟時 `curView` | 開啟時底層 view | 關閉後 `curView` | 關閉後底部導航 |
  |---|---|---|---|---|
  | 首頁 today | `today` | 仍 active | `today` | `today` |
  | 購物頁 shop | `shop` | 仍 active | `shop` | `shop` |

  **風險反轉**：真正的風險不是「回不去」，而是日後有人為了實作「返回」而去動 `curView` 或 `switchView()`，反而把現在正確的行為改壞。因此本項以**回歸測試**鎖住，而非新增程式碼。
- **但數量會過期**：全檔沒有任何採買流程呼叫 `renderAll()`。在 overlay 內完成一項再關閉，購物頁的數字不會更新。**必須處理**。
- **排序天然正確**：`shopMalls()` 已依行程順序排序；`m.stores` 保留表格原始順序；現有 `wanted` 是 `m.stores.filter(...)`，兩層順序都已保留。實作**只要不另行排序**即可，不需新增排序邏輯。

---

### Task 1：想逛改為獨立閱讀模式

**Files:** `index.html`、`tests/shop-wants-mode.test.js`（新增）、`tests/browser/shop-wants-mode.spec.js`（新增）

**設計**

- `renderShopResults()` 在 `shopPlaceFilter==='wants'` 且非搜尋時走獨立分支：
  - 商場標題（沿用 `.sm-name`）＋ 該商場想逛店家**平鋪**。
  - **不渲染**樓層手風琴、`.want-box`、營業時間／官網／備註（後三者屬探索用途，執行路線時是雜訊）。
  - 每列沿用既有 `storeRow()`，右側 `st-f` 已含「樓層·櫃位」，資訊不遺失。
- 排序：直接沿用 `wanted`（`m.stores.filter`），**不得**另行 `sort()`。
- 空狀態（無任何想逛時）：文案 `尚未加入想逛店家，可從「全部」頁籤加入`，並附一顆回到全部的按鈕（`setShopPlaceFilter('all')`）。
- 取消想逛後即時移除：`applyWantToggleInPlace()` 現有的 `if(shopPlaceFilter==='wants') return false;` 已使該情境回退整份重繪，**行為天然正確**，只需以測試鎖住。

**驗收條件**

- [ ] 標記 2 家店時，想逛模式的 `.store-row` 數量**恰為 2**（現況 75）。
- [ ] 想逛模式下 `.floor` 與 `.want-box` 數量皆為 **0**。
- [ ] 想逛店家順序 = 商場行程順序 → 店家原始順序（以刻意打亂字母序的 fixture 驗證，不得變成字母排序）。
- [ ] 取消某列後該列立即消失；該商場最後一筆被取消後，商場區段一併消失。
- [ ] 無任何想逛時顯示指定空狀態文案，且按鈕可切回全部。
- [ ] 「全部」模式的樓層手風琴、`.want-box`、營業時間等**完全不受影響**。

### Task 2：清除全部想逛與復原

**Files:** `index.html`、`tests/shop-wants-mode.test.js`、`tests/browser/shop-wants-mode.spec.js`

**設計**

- 按鈕文案固定為 **「清除全部想逛」**（不可只寫「清除」，避免誤解為刪除店家或採買資料）。
- 只在 `shopPlaceFilter==='wants'` **且**至少一筆想逛時渲染。
- 按下即清除，**不跳確認框**。
- Toast：`已清除 N 家想逛店家` ＋ `復原`，沿用既有 `toast(msg, '復原', fn)` 模式。
- **復原採用完整快照**：清除前 `JSON.parse(JSON.stringify(getWants()))` 存為快照，復原時整包寫回，**不是**逐筆反向切換。
- **各只寫入一次**：清除一次 `lsSet` ＋ 一次重繪；復原一次 `lsSet` ＋ 一次重繪。
- N 的定義：`shopWantCounts().total`（使用者實際看得到的家數）。清除的是整個 `trip_shop_wants`，若內含轉換保留下來的無法辨識 key，它們也會一併清除並由快照完整還原 —— 對使用者而言數字仍誠實。

**驗收條件**

- [ ] 非想逛模式、或想逛數為 0 時，按鈕**不存在**。
- [ ] 按下後 `trip_shop_wants` 為空物件，畫面轉為空狀態。
- [ ] Toast 文案含正確家數與「復原」。
- [ ] 復原後 `trip_shop_wants` 與清除前**逐鍵完全相同**（含無法辨識的 key）。
- [ ] 清除與復原各只寫入 storage 一次（以覆寫 `lsSet` 計數驗證）。

### Task 3：購物頁加入採買清單入口

**Files:** `index.html`、`tests/shop-wants-mode.test.js`、`tests/browser/shop-wants-mode.spec.js`

**設計**

- 入口置於購物頁頂端（搜尋列附近），文案 `採買清單`＋未完成數量徽章。
- 未完成數 = `shoppingListStore.all()` 中 `done` 為假的項目數（**全清單**，非今日範圍 —— 與 Today 卡片的日別語意刻意不同）。
- 數量為 0 時仍顯示入口，但不顯示數字徽章。
- **過期問題**：`closeShoppingList()` 在確實移除 overlay 且 `curView==='shop'` 時，就地更新入口數字（比照 `applyWantToggleInPlace()` 的作法，不整份重繪）。
- 不改 `openShoppingList()`／`closeShoppingList()` 的既有語意，不觸碰底部導航。

**驗收條件**

- [ ] 購物頁存在採買清單入口，點擊開啟 overlay。
- [ ] 徽章數字等於全清單未完成數；為 0 時不顯示徽章。
- [ ] 在 overlay 內完成一項後關閉，購物頁數字**立即正確**（不需切換頁籤）。
- [ ] **兩個入口各自回到原頁**（同一組斷言跑兩次，參數化 `today` / `shop`）：
  - 開啟時 `curView` 不變、底層 view 仍 `active`；
  - 關閉後 `curView` 與底部導航 active 狀態與進入前**完全相同**；
  - 首頁進入 → 關閉後在首頁；購物頁進入 → 關閉後在購物頁。
- [ ] `openShoppingList()`／`closeShoppingList()` **不得**出現 `switchView(` 或對 `curView` 的指派 —— 以原始碼斷言鎖住，防止日後有人為了「實作返回」反而改壞現有正確行為。
- [ ] 從 Today 開啟採買清單的既有行為不受影響。

### Task 4：chip 數量語意收斂

**Files:** `index.html`、`tests/shop-wants-mode.test.js`

**設計**

僅為兩個語意含糊的全域 chip 補上單位；各購物地點 chip 維持純數字（名稱＋數字在情境中已無歧義）：

| chip | 現況 | 改為 |
|---|---|---|
| 全部 | `全部 5` | `全部 5 個地點` |
| 想逛 | `想逛 2` | `想逛 2 家` |
| 各購物地點 | `永旺夢樂城岡山 24` | 不變 |

單位文字置於計數元素**之外**（`<small><span id="shopWantTotal">2</span> 家</small>`），使就地更新仍只需改一個數字，且既有測試讀 `#shopWantTotal` 的行為不變。

**驗收條件**

- [ ] 兩個全域 chip 顯示單位文字；各地點 chip 不變。
- [ ] `#shopWantTotal` 的 `textContent` 仍是純數字（就地更新不受影響）。

## Commit 邊界

四個獨立 commit，Task 4 依裁定為獨立小型 UX 修正，不得與 Task 1／2 混交付：

```text
feat(shop): show only wanted stores in the wants mode
feat(shop): add a clear-all for wants with undo
feat(shop): link the shopping list from the shop page
fix(shop): clarify what each filter chip counts
```

## 回滾

四者皆為呈現層改動，`git revert` 即可；不影響 `trip_shop_wants` 內容、採買資料或備份格式。

## 完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```
