# ADR 0013 — Shopping Form Session Workflow／State Deepening

> 狀態：Accepted（2026-08-09，由 Bar 核准 1→2→3→4 架構模組化順序）

## Decision

深化既有 `shopping-ui-state.js`，使同一 `createState`／`transition`／`createWorkflow` seam 追加擁有 `form`、`formSession` 與 `photoError` lifecycle。Production adapter 是 owned fields 唯一寫入點；Shopping store、photo repository、Buy-to-Ledger 與 renderer 維持外部 effects。

## Context

Form open/cancel/save/save-another/failure/photo completion 原本分散直接 mutation，pending、return context、同步 focus 與 stale Promise guard 由各 caller 自行排列。

## Alternatives Considered

- 新增 `shopping-form-state.js`：會形成兩個互相協調的 Shopping session state 權威。
- 只抽 setter helpers：caller 仍需知道跨欄位 reset 與 effect ordering。
- 把 store/photo repository 移入 module：越過已核准的 local-substitutable effect boundary。

## Why This Decision

既有 Shopping seam 已有 production adapter 與 recording tests；沿同一介面深化可讓 session/request ID、save-another 與返回順序集中，且不擴張資料層。

## Expected Benefits

- Save 與 photo async completion 同時核對 session/request ID。
- Validation/store/photo failure 保留 Sheet；pending 阻擋 close 與重複提交。
- Save-another 的 render/focus/Toast ordering 可由正式介面測試。

## Trade-offs

Form payload 對 module 仍是 opaque object，欄位 validation 與 DOM input handlers留在 `index.html`；`split` 也只由 effect 清除，不成為 module state。

## Future Impact

Shopping detail/photo viewer/跨 Ledger detail return context 仍需獨立 deletion test；不得因此把 Shopping store、photo repository、schema、backup、Buy-to-Ledger 或 renderer 移入 module。本 ADR 不配置新 runtime 版本、不授權 deploy/main merge。
