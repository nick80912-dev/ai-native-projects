# Operation Context Preservation V82 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用者的操作脈絡不得被導航或重繪無故破壞 —— 捲動位置、面板展開、操作焦點。

**Architecture:** 三個症狀同一個根因:暫態 UI 狀態沒有落點,只活在 DOM 裡,重繪即消失。建立一份 **session-only** 的 `viewUiState`(不進 localStorage、不進備份),由導航與重繪路徑統一讀寫。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準與版本

| 項目 | 值 |
|---|---|
| 起始 SHA | `b77c3a1` |
| 分支 | `dev` |
| 目標版本 | **v82** |

版本策略依 2026-08-02 裁定:本批鎖定 v82。所有 commit 只留本機直到整批完成、測試全綠後才升版並推送,避免測試站出現「v82 但只有一半功能」。**文件 commit 不升版。** 升版時 `app-version.js` 與 `sw.js` 同步遞增;**不修改 SW 生命週期與快取邏輯**。

## 現況(已查證)

| 症狀 | 成因 |
|---|---|
| 切分頁一律回頂 | `switchView()` 結尾無條件 `window.scrollTo({top:0})` |
| 打卡後所有展開面板收合 | `togglePanel()` 只做 `classList.toggle`,無狀態;`onCheck()` 會 `renderTrip()` |
| 打卡無法鍵盤操作 | `<div class="chk" onclick="onCheck(...)">`,無 role／tabindex／狀態語意 |
| `openTripItem()` 自己複製了一份 switchView 的 body | 未走共用路徑,intent 必須涵蓋它 |

`html{scroll-behavior:smooth}` 會讓還原捲動變成動畫 —— 還原必須用 `behavior:'instant'`,否則會看到頁面自己滑動,快速切換時還會互相打架。

## 契約

### 一、暫態 UI 狀態

```js
var viewUiState={
  today:{scrollY:0},
  trip:{scrollY:0,openPanels:{}},
  shop:{scrollY:0},
  split:{scrollY:0}
};
```

**session-only**:不寫 localStorage、不進 `personalStateJson()`、不在 `applyPersonalStatePayload()` 的白名單內。重開 App 一律歸零。

### 二、重繪與導航的保存義務

> 重繪不得**無理由**破壞仍然存在的捲動位置、展開狀態與操作焦點。若使用者的操作**刻意**使原目標離開目前結果集,則焦點移至下一個合理目標,並保持畫面脈絡穩定。

| 情境 | 規則 |
|---|---|
| 目標仍存在 | 還原同一元素焦點 |
| 目標因「隱藏已完成」離開結果集 | 焦點移至下一筆可見行程的打卡控制 |
| 沒有下一筆 | 焦點移至「隱藏已完成」篩選按鈕 |
| 滑鼠／觸控操作 | **不主動搶焦點** |
| 鍵盤操作 | 才執行焦點還原 |
| 面板仍屬於該 item | 保持展開 |
| item 被篩除 | 刪除其暫態展開狀態(避免無限長大) |
| 捲動還原 | 必須在 render **之後**,以 `requestAnimationFrame` 執行 |
| 還原值超過新頁面高度 | clamp 到最大可捲動值,不得產生無效位置 |

鍵盤與滑鼠的區分**不靠 `document.activeElement` 推測** —— `<div tabindex="0">` 被點擊時同樣會取得焦點,推測不出來。改由 keydown handler 明確傳旗標:`onCheck(id, true)`。

### 三、入口意圖(結構化、一次性)

```js
switchView(view, intent)   // intent 可省略
```

| intent | 行為 |
|---|---|
| `{type:'trip-item',dayIndex,itemId}` | 定位該 item,跳過捲動還原 |
| `{type:'trip-day',dayIndex}` | 定位該日頂部,跳過捲動還原 |
| `{type:'trip-now'}` | 定位今天對應的 day 與目前站,跳過捲動還原 |
| `{type:'shop-place',placeId}` | 定位該購物地點,跳過捲動還原 |
| `{type:'top'}` | 回頂(再點目前分頁) |
| 省略 | 還原該分頁先前捲動位置 |

意圖**只消耗一次**,套用後即清除;之後正常切回仍走位置還原。分帳次層頁再點「分帳」仍先回 dashboard,沿用現況。

---

### Task 1:viewUiState 與捲動保存／還原

**Files:** `index.html`、`tests/view-ui-state.test.js`(新增)、`tests/browser/view-context.spec.js`(新增)

- [ ] Step 1: 先寫失敗測試
  - 四個分頁各自保存捲動位置;切走再回來還原。
  - 再點目前分頁回頂。
  - 還原值超過新頁高度時 clamp。
  - `viewUiState` 不得出現在 localStorage、不得進備份 payload、不在還原白名單。
  - 還原使用 `behavior:'instant'`(不得因 `scroll-behavior:smooth` 變成動畫)。
- [ ] Step 2: 執行並確認 RED
- [ ] Step 3: 實作 `viewUiState`、`captureViewScroll()`、`applyViewPosition(view,intent)`;`switchView` 改為 `switchView(view,intent)`
- [ ] Step 4: GREEN

### Task 2:入口意圖覆蓋還原

**Files:** `index.html`、`tests/browser/view-context.spec.js`

- [ ] Step 1: 先寫失敗測試
  - `openTripItem()` 定位 item 而非還原舊位置;`openShopPlace()`、`gotoDay()` 同理。
  - Today 的「查看完整行程」以意圖進入。
  - 意圖只消耗一次:同一入口進去後再用底部分頁切走切回,走的是位置還原。
- [ ] Step 2: RED
- [ ] Step 3: 實作一次性 `pendingViewIntent`;`openTripItem()` 改為走 `switchView('trip',{...})` 而不是自己複製一份 body
- [ ] Step 4: GREEN

### Task 3:行程面板展開狀態

**Files:** `index.html`、`tests/browser/view-context.spec.js`

- [ ] Step 1: 先寫失敗測試
  - 展開交通／停車／更多後打卡,面板仍展開。
  - 切走再回行程頁,面板仍展開。
  - item 被「隱藏已完成」篩除後,其展開狀態被刪除(不殘留)。
- [ ] Step 2: RED(實測:打一次卡,所有展開面板全部收合)
- [ ] Step 3: `togglePanel()` 寫入 `viewUiState.trip.openPanels`;`renderItem()` 讀取它決定 `open` class;渲染時 GC 掉已不存在的 item
- [ ] Step 4: GREEN

### Task 4:打卡控制無障礙與焦點還原

**Files:** `index.html`、`tests/trip-checkin-a11y.test.js`(新增)、`tests/browser/view-context.spec.js`

沿用 v81 為 `.store-row` 建立的樣板:`role="checkbox"` + `aria-checked` + `activateKeyboardButton` + `:focus-visible` 外框。

- [ ] Step 1: 先寫失敗測試
  - `role="checkbox"`、`tabindex="0"`、`aria-checked` 隨狀態變化、`onkeydown` 走 `activateKeyboardButton`、✓ 為 `aria-hidden`。
  - Space／Enter 皆可打卡。
  - 鍵盤打卡後焦點回到同一列;**滑鼠點擊不搶焦點**。
  - 開著「隱藏已完成」時鍵盤打卡:該列消失 → 焦點移至下一筆可見行程;沒有下一筆 → 移至篩選按鈕。
- [ ] Step 2: RED
- [ ] Step 3: 實作;`onCheck(id,fromKeyboard)`
- [ ] Step 4: GREEN

### Task 5:「回到現在」

**Files:** `index.html`、`tests/browser/view-context.spec.js`

- [ ] Step 1: 先寫失敗測試
  - 今天在行程範圍內時,行程頁出現「回到現在」;不在範圍內時不出現。
  - 按下後切到今天對應的 day 並定位目前站(`selectCurrentTripItem()`)。
  - 觸控區 ≥44px、有可及名稱。
- [ ] Step 2: RED
- [ ] Step 3: 實作,走 `switchView('trip',{type:'trip-now'})`
- [ ] Step 4: GREEN

### Task 6:升版 v82 與完整驗證

- [ ] `app-version.js`、`sw.js` 同步升 v82(**只改版本字串**)
- [ ] `APP_RELEASE_NOTES` 前置一筆,維持五筆;`tests/theme-system.test.js` 滾動視窗更新
- [ ] `07_CHANGELOG.md` 新增 v82 段落
- [ ] `tasks/current.md` 現況表更新為 v82

## Commit 邊界

```text
feat(nav): preserve scroll position per tab
feat(nav): let explicit entries override scroll restore
fix(trip): keep detail panels open across re-renders
fix(trip): make check-in a keyboard operable checkbox
feat(trip): add a back-to-now control
chore: release v82
```

不得混入 v83 之後的範圍(下一站待買、降雨、Today 收斂、分帳、設定摘要、SW 提示)。

## 回滾

全部為呈現／導航層改動,`git revert` 即可;`viewUiState` 是 session-only,不影響任何持久化資料或備份格式。

## 完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```
