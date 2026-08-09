# ADR 0015 — Ledger Correction Workflow／State Deepening

> 狀態：Accepted（2026-08-09，由 Bar 核准 1→2→3→4 架構模組化順序）

## Decision

深化既有 `ledger-ui-state.js`，讓 correction 與 create/edit 共用 entry session ID、request ID、calendar、mount/render/pending/return effects；新增 semantic correction actions，刪除 compatibility pending helper與 direct correction branches。

## Context

Correction domain tests完整，但 UI open/close/reason/calendar/preview/pending/enqueue completion 各自直接修改 state，stale completion 也沒有與 create/edit 相同的 session boundary。

## Alternatives Considered

- 新增 `ledger-correction-state.js`：同一 Sheet 將有兩個 workflow state 權威。
- 把 preview/domain/repository 移入 UI module：會混淆帳務 finality 與畫面 lifecycle。
- 保留 compatibility branch：無法用正式介面鎖定 effect ordering與 stale request。

## Why This Decision

Correction 使用同一 Ledger Sheet 與 calendar；深化原 seam 可共享 session/request invariant，同時把 eligibility、preview builder、commit-last batch、repository與 settlement 留在 domain boundary。

## Expected Benefits

- Open/close/calendar/reason/preview/save 都走不可變 transition。
- Pending 阻擋 close/duplicate submit，舊 completion 不會關閉新 session。
- Compatibility helper與 correction-only DOM state branch 消失。

## Trade-offs

Draft、correction preview 與通知仍是 opaque payload；`index.html` 仍負責 validation、receipt freshness、domain builders與 enqueue。

## Future Impact

不得把 canonical correction、append-only events、settlement、repository、Apps Script、schema 或 record building 移入 UI state module。本 ADR 不配置新版本、不授權 deploy/main merge。
