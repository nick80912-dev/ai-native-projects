# Today Live Info V84 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Today 回答「現在要幹嘛」而不只是「行程有什麼」——下一站要買什麼、等一下會不會下雨、次要資訊不擋路。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準與版本

| 項目 | 值 |
|---|---|
| 起始 SHA | `d7975ff` |
| 分支 | `dev` |
| 目標版本 | **v84** |

依既有裁定:整批完成、測試全綠後才升版;`sw.js` 只改版本字串,不動生命週期與快取策略;不改 schema、`PERSONAL_STATE_VERSION` 維持 9。

## 現況(已查證)

| 項目 | 現況 |
|---|---|
| 下一站待買 | 完全沒有。採買項目的 `stopRef` **就是站點 id**,與下一站卡片的 `it.id` 是 1:1 直接 join,無歧義 |
| 採買清單群組 | `renderShoppingGroups()` 已依站點分組,但**沒有 id 錨點**,無法捲到特定站 |
| 降雨 | 已經在抓 `hourly=precipitation_probability`,但取的是**整天**最大值(含已過去的時段);快取存的是**算完的數字**,TTL 3 小時 |
| 次要資訊 | 交通／停車／營業／付款／提醒五條全部常駐平鋪 |
| 購物搜尋 | 無結果摘要 |

## 範圍聲明(需要你知道的一個縮減)

原始需求含「交通、停車、營業、付款、提醒**依當下情境調整優先順序**」。「當下情境」沒有定義判準(依時間?依距離?依是否已抵達?),不同讀法會做出完全不同的東西,因此本批**只做可明確驗收的收合**:

- **常駐**:交通、停車、營業 —— 回答「到得了嗎、開著嗎」,抵達前就要看。
- **收合**:付款、提醒 —— 抵達後才需要的細節,收進可展開區塊,預設收合。

「依時間／位置動態重排優先序」**不在本批**,待你給出判準後另批處理。

---

### Task 1:下一站待買

**Files:** `index.html`、`tests/browser/today-live-info.spec.js`(新增)

- 下一站卡片顯示該站待買數量與前幾項摘要;點擊開啟採買清單並捲到該站群組。
- `renderShoppingGroups()` 的站點群組加 `id="shopgroup_<cssId(stopRef)>"` 錨點。
- `openShoppingList(focusStopRef)` 接受選填站點,render 後捲到該群組。
- 沒有待買項目時**完全不渲染**該區塊,不留空殼。
- 同時套用到一般下一站卡與同區串點卡。

- [ ] Step 1: 先寫失敗測試 → Step 2: RED → Step 3: 實作 → Step 4: GREEN

### Task 2:現在之後的最高降雨機率

**Files:** `index.html`、`tests/weather-rain-window.test.js`(新增)、`tests/browser/today-live-info.spec.js`

**關鍵設計**:快取目前存的是**算完的 rain 數字**,TTL 3 小時 —— 若沿用,早上算的「現在之後」到中午就是錯的。改為快取**原始 hourly 序列**,在**渲染時**依當下小時重算。舊格式的快取要能安全降級(沒有序列就用舊的 rain 值)。

- 只取 `hourly.time >= 現在` 的時段;全部已過去時退回當日最大值,不顯示空白。
- 文案需表達「之後」的語意,不能只是一個數字。

- [ ] Step 1: 先寫失敗測試 → Step 2: RED → Step 3: 實作 → Step 4: GREEN

### Task 3:次要資訊收合

**Files:** `index.html`、`tests/browser/today-live-info.spec.js`

- 付款與提醒收進 `<details>`(或等效可展開控制),預設收合;交通／停車／營業維持常駐。
- 兩者皆無時不渲染該控制。
- 展開狀態屬暫態 UI,沿用 v82 的 `viewUiState` 慣例,不進 localStorage。

- [ ] Step 1: 先寫失敗測試 → Step 2: RED → Step 3: 實作 → Step 4: GREEN

### Task 4:購物搜尋結果摘要

**Files:** `index.html`、`tests/shop-search.test.js`、`tests/browser/shop-search.spec.js`

- 搜尋時顯示「找到 N 家店 · M 個購物地點」;無結果時不顯示(已有空狀態)。
- 非搜尋狀態不顯示。

- [ ] Step 1: 先寫失敗測試 → Step 2: RED → Step 3: 實作 → Step 4: GREEN

### Task 5:升版 v84 與完整驗證

- [ ] `app-version.js`、`sw.js` 同步升 v84(只改版本字串)
- [ ] `APP_RELEASE_NOTES` 前置一筆並維持五筆;`tests/theme-system.test.js` 滾動視窗更新
- [ ] `07_CHANGELOG.md`、`tasks/current.md` 更新

## Commit 邊界

```text
feat(today): show what to buy at the next stop
feat(today): report rain probability from now on
feat(today): collapse secondary stop details
feat(shop): summarise search results
chore: release v84
```

## 完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```
