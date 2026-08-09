# Trip Progression Reconciliation Module Design

> 日期：2026-08-09
> 狀態：Bar 已確認，可直接進入實作計畫
> Runtime 版本：不占用新版本；維持 v98

## Purpose

新增 ES5 UMD module `trip-progression.js`，把「下一站選擇＋超時分類＋一次性進度調和」收斂成單一深介面。現況 `pickNextStop()` 名義上是 query，卻在 render path 逐項呼叫 `autoSkipStaleItem()`、重複寫 localStorage 並 Toast；Trip、Today 與 cluster caller 因而無法分辨計算與持久化。

## Public Interface

```js
TripProgression.reconcile(input)
// => {
//   pick: {item, remaining, source},
//   progress: nextProgress,
//   changed: Boolean,
//   skipped: [{id, label}],
//   notification: String
// }
```

`input` 包含當日可打卡 items、既有 progress／checks、`nowMinutes`、today flag 與必要的 cluster metadata。module 不讀 `Date`、DOM、localStorage 或 Toast；caller 明確傳入時間與狀態。

## Decision Rules

- 先依既有 checked／skipped／autoSkipped state 產生 remaining。
- 未開始、無時間或沒有截止候選時，保留既有 `checked`、`time`、`order` source 行為。
- 依 `parseStartMinutes` 等價規則找最後一個已到開始時間的 remaining item。
- 若 cutoff 前含 cluster controller，cutoff 固定在第一個 blocking controller，避免略過整個尚未處理的 cluster。
- stale 為 cutoff 之前且尚未處理的項目；只有 today reconciliation 可新增 auto-skip。
- 一次計算全部 newly skipped，回傳單一 next progress、單一 changed flag 與單一 notification；adapter 最多執行一次 progress persistence，再顯示一次 Toast。
- 自動略過不寫 checks；已 checked 項本來就不在 remaining。
- pick 的使用者可見結果與既有邏輯一致：stale 調和後仍回傳 cutoff item，source 為 `time-stale`。

## Production Boundary

`index.html` 保留 storage key、讀寫 helper、undo、renderer 與 Toast。production wrapper 只負責：組 input → 呼叫 `reconcile()` → changed 時一次儲存 progress → notification 非空時一次 toast → 回傳 pick。Trip render、Today render 與 cluster selection 都共用此 wrapper。

## Tests

先以目前 `pickNextStop()` 行為 characterization 鎖定順序、cluster cutoff、today/non-today、checked/skipped 與 toast 文案。再從 module public interface 逐一 TDD：純 pick、一次多項 auto-skip、無變更零 persistence signal、cluster blocker、immutability。正式 wiring 後移除以 VM 擷取 20 個 inline functions 才能測 query 的部分，保留 DOM/browser 行程與 Today consumer 測試。

## Invariants and Error Behavior

- input arrays／objects 不可被 mutation。
- 缺少或無效 input 時回傳穩定空結果，不 throw、不產生 persistence signal。
- module 不產生時間、ID 或副作用。
- 每次 reconciliation 最多一個 progress commit 與一個 notification。
- 既有進度資料格式、storage keys、undo 與 checks 語意不變。

## Explicit Non-goals

不改 Trip/Today DOM renderer、父子行程卡資料模型、localStorage 格式、check-in UI、Shopping join、時間模擬、資料 schema、copy、layout、版本或部署。

## Deletion Test

若刪除此 module，時間解析、下一站選擇、cluster blocker、stale classification 與 one-commit 調和會再次散回 Trip／Today／cluster render callers；module 因此承載可重用政策，而不是搬移幾行 helper。
