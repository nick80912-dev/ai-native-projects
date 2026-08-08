# ADR 0011 — Ledger Entry Session Workflow／State Seam

> 狀態：Accepted（2026-08-08，由 Bar 核准執行）

## Decision

深化既有 `ledger-ui-state.js`，讓同一 module 同時管理 Ledger dashboard／history 與 create／edit entry session 的 UI workflow state。公開入口維持 `createState(seed)`、`transition(state, action)` 與 `createWorkflow(adapter)`；entry lifecycle、draft／editing ownership、`savePending`、calendar 與 return context 以語意型 actions 和 ordered effects 表達。

draft 與 return context 對 module 都是不透明資料。production DOM、帳務驗證、repository、record 建立、同步與 render 仍由 `index.html` adapter 及既有 domain helpers 負責。

## Context

ADR 0010 已證明純 transition 與 injected effect adapter 能約束 Ledger 歷史瀏覽流程，但 create／edit entry 仍由多個 handler 直接改寫 `sheet`、`draft`、`editing`、`savePending` 與 calendar 欄位。非同步儲存、返回 Ledger／Shopping、再記一筆與關閉 calculator 之間的順序分散，容易讓舊 Promise 改寫新 session，或讓 UI pending 與實際 state 分歧。

本切片已有 create、edit、save、save-and-add-another、Buy-to-Ledger、calendar、calculator cleanup 與 correction 的 characterization tests，可在不改使用者行為與資料格式的前提下深化現有 seam。

## Alternatives Considered

- 建立第二個 entry state module：會讓 dashboard/history 與 entry 產生兩份 Ledger UI state 與同步責任。
- 為每個欄位增加 setter：caller 仍需自行維護跨欄位 invariants 與 effect ordering。
- 一次納入 correction、settlement、calculator 與 Shopping：超出第一批已實證邊界，增加回歸面。
- 把 repository、record 建立或帳務驗證搬進 state module：會混合 UI workflow 與 domain／I/O 責任。

## Why This Decision

同一份 state 可在 create／edit session 建立時一次安裝 draft、editing、return context、session ID 與 calendar；儲存時以 request ID 防止重複提交，並以 session／request 雙重比對忽略 stale completion。transition 先 commit state，再由 adapter 依序執行 mount、render、pending、focus、restore 與通知 effects，使 production 和 Node recording adapter 共用同一契約。

save-and-add-another 保留原 session 與 return context，但替換乾淨 draft、清除 editing／source links／validation errors；其 effects 保留既有 `renderSplit()` dashboard 更新，再 render entry、回頂與聚焦金額。save-and-close 則清除 session、卸載 entry、更新 dashboard、恢復 caller context 後通知結果。

correction 仍走明確的 legacy compatibility branch；entry unmount adapter 保留 calculator 父層清理。這兩者不假裝已被本 module 接管。

## Expected Benefits

- create／edit session boundary fields 只有一個權威 transition 來源。
- `savePending`、重複 submit 與 stale async completion 可用純 Node 測試重現。
- Ledger 與 Shopping return context 不需讓 module 理解 DOM 或 Shopping state。
- 現有 `ledger-ui-state.js` 介面得到第二個實證垂直切片，沒有引入全域 store。

## Trade-offs

- `index.html` 仍負責 draft 內容更新、驗證、commit、render 與通知文案，adapter surface 比只處理歷史瀏覽時更大。
- correction、settlement 與 calculator 仍有相容分支，Ledger UI 尚未完全模組化。
- module 使用 ES5-compatible UMD 與同步 effects，無法直接等待 repository Promise；非同步結果必須由 runtime dispatch success／failure action。

## Future Impact

後續可依相同準則分別評估 correction workflow/state 與 Shopping list／form／detail workflow，但需先建立 characterization tests，且只在已實證需求下擴展正式 interface。不得把資料 schema、repository、sync、record 建立或 DOM rendering 納入本 module；也不得建立與 `ledgerUiState` 競爭的第二份 entry state。
