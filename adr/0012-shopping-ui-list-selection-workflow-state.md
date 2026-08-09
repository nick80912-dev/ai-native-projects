# ADR 0012 — Shopping UI List Tab／Selection Workflow／State Seam

> 狀態：Accepted（2026-08-09，由 Bar 核准 spec 後直接執行並 push `dev`）

## Decision

新增 ES5-compatible UMD module `shopping-ui-state.js`，以 `createState(seed)`、`transition(state, action)` 與 `createWorkflow(adapter)` 管理 Shopping list 的 `tab`、`selectionMode` 與 `selected`。Production 保留既有 `shoppingUiState` 作 compatibility projection，但只有 workflow adapter 可直接回寫這三個欄位。

Module 只接受 serializable actions，產生不可變 next state 與 ordered effects。DOM、Shopping store、photo repository、Buy-to-Ledger domain、Ledger repository、資料格式與 renderer markup 留在既有邊界。

## Context

Shopping list 的 tab、單項選取、目前分頁全選、批次成功 reset 與單筆刪除 prune 原本分散在多個 runtime handlers 直接 mutation。這讓「切頁必須退出多選」「失敗或取消必須保留選取」「state 要在 render／focus 前 commit」等規則沒有單一權威來源。

本批先完成 Shopping UI 的只讀盤點，確認購物頁 filters、form、detail、photo、split 與返回脈絡可留在原位；再以 legacy characterization tests 鎖定 list tab＋selection 的既有行為，作為第一個最小垂直切片。

## Alternatives Considered

- 只新增純 reducer：handler 仍需各自安排 split cleanup、render 與 focus，effect ordering 依然分散。
- 增加多個 setter helpers：caller 仍需知道每個流程應組合哪些欄位 reset，module 太淺。
- 一次抽出完整 Shopping UI：會同時跨 form、detail、photo、split、store 與 Buy-to-Ledger，超出已 characterization 的範圍。
- 建立全域 Shopping store：會與既有 Shopping data store 及 `shoppingUiState` compatibility object 形成重疊權威。

## Why This Decision

`transition()` 集中 `open-list`、`set-tab`、selection toggle、visible select-all、reset 與 prune invariants；`createWorkflow(adapter)` 先寫入 state，再按順序執行 split cleanup、list render 與 selection-control focus。Production 與 Node recording adapter 因而共用同一個正式 seam，而不是測試另一份替身邏輯。

Store／domain 成功仍由既有 runtime 判斷；只有成功路徑 dispatch `reset-selection`。Store failure、Buy-to-Ledger preflight 阻擋與使用者取消不 dispatch，因此保留原 selection 供重試。

## Expected Benefits

- tab／selection 的跨欄位 reset 只有一個權威來源。
- visible select-all 不保留另一 tab 或已消失的 stale IDs。
- state commit、render 與 focus 的順序可由純 Node recording adapter 驗證。
- 既有 public handlers、renderer、資料與 domain 邊界不需改寫。
- 後續 Shopping UI 垂直切片有明確可深化的 seam，不需建立 mega-store。

## Trade-offs

- `shoppingUiState` 仍是 renderer 讀取的 compatibility object，form、formSession、split 與 photoError 仍由 legacy handlers 直接管理。
- Production adapter 仍需呼叫既有 renderer 與 DOM focus helper；module 本身不理解畫面是否 mounted。
- 新 module 是 App Shell asset，但本批依 Bar 裁定不配置新 runtime 版本；真實換版與 SW 更新提示驗收仍須等待後續版本與 Netlify 額度。

## Future Impact

下一個 Shopping UI slice 必須先各自 characterization，再評估 form session 或 detail／return context；不得因已有 seam 就把 photo repository、Shopping store、Buy-to-Ledger domain、資料 schema、backup 或 DOM renderer 移入 module。

Runtime 版本在本批完整驗證後另行決定。v99／v100 保留給 SW 更新提示雙版本驗收；本 ADR 不授權 merge `main`、Netlify deploy 或 production tag。
