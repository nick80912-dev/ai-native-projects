# ADR 0014 — Trip Progression Reconciliation Module

> 狀態：Accepted（2026-08-09，由 Bar 核准 1→2→3→4 架構模組化順序）

## Decision

新增純 ES5 UMD module `trip-progression.js`，以 `reconcile(input)` 同時計算下一站、cluster blocker、stale items 與 next day progress。Production wrapper 最多保存一次 progress、顯示一次通知。

## Context

舊 `pickNextStop()` 是 render query，卻逐項呼叫 `autoSkipStaleItem()`，每個 stale item 造成多次 localStorage write 並混入 Toast；Trip、Today 與 cluster consumer 無法分開決策與副作用。

## Alternatives Considered

- 只抽 `reconcileDayProgress` helper：時間選擇與 cluster policy 仍散在 caller，deletion test 失敗。
- 讓 module 直接讀 storage/clock：會把可替代的 runtime boundary藏進純決策。
- 各 renderer 各自選下一站：會產生多套不一致 policy。

## Why This Decision

「選擇＋stale classification＋one-commit reconciliation」是一個完整政策；module 接收明確時間與 state，回傳 data/effect signal，足以被所有 consumer 重用。

## Expected Benefits

- 同輪多項 auto-skip 只寫一次 progress、只通知一次。
- Cluster controller 阻擋規則與時間解析只有一個權威。
- 純介面測試不再需要從 `index.html` 組裝完整 render sandbox。

## Trade-offs

`pickNextStop()` 名稱保留為 compatibility adapter；手動完成/取消、undo、checks 與 storage keys 仍由既有 runtime helpers 管理。

## Future Impact

任何新的 Today/Trip/cluster 下一站 consumer 必須使用 `TripProgression.reconcile()`，不得重新拼接 cutoff 規則。本 ADR 不改資料格式、UI、版本或部署。
