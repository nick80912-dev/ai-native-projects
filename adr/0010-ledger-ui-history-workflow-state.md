# ADR 0010 — Ledger UI 歷史瀏覽 Workflow／State Seam

> 狀態：Accepted（2026-08-08，由 Bar 核准執行）

## Decision

將 Ledger 的帳本軌、dashboard／完整紀錄、歷史搜尋／篩選／分組與多選狀態，收斂到 ES5-compatible UMD module `ledger-ui-state.js` 的單一不可變 transition 介面：

- `createState(seed)`：建立 session-only UI state。
- `transition(state, action)`：回傳 `{ state, effects, changed }`。
- `activeHistoryFilterCount(state)`：計算目前有效篩選數。
- `createWorkflow(adapter)`：以 `dispatch(action)` 依序 commit state，再執行 render、popover、scroll effects。

`index.html` 保留 production DOM adapter、renderers、Ledger repositories、entry draft、calculator、settlement 與 Buy-to-Ledger；module 不直接讀 DOM、storage 或 repository。

## Context

原本 Ledger UI 狀態散落在 dashboard、history、selection、entry draft、calendar、correction 與 save guard 的 handlers。`selectionMode`、`selectedRecordIds`、filters 與 page 由多個 caller 直接 mutation，切軌、返回 dashboard、關閉完整紀錄等路徑各自記住應清除的欄位，容易隨功能增加而分歧。

本批只處理已由 characterization tests 鎖定的歷史瀏覽垂直切片，不搬動 entry draft、repository 或資料 schema。

## Alternatives Considered

- 一次抽出全部 `ledgerUiState`，包含 entry draft、correction、calendar 與所有 DOM rerender：改動面過大，難以證明 UI／資料語意不變。
- 只新增 setter helpers：仍由 caller 決定欄位組合與 effect ordering，無法封裝跨欄位不變量。
- 導入 event bus 或全 App store：介面超過本次已實證需求，形成 speculative abstraction。
- 只在測試建立 reducer：會產生 production 不使用的 hypothetical seam，無法約束真實 handlers。

## Why This Decision

不可變 transition 把「哪些欄位一起改」與「哪些 effects 依何順序執行」集中在一處；production 與 recording test adapter 共用同一 workflow interface，因此測試直接約束正式執行路徑，而不是複製一套測試專用邏輯。

此邊界維持下列不變量：

- state、陣列與 selection map 不做就地 mutation。
- track 僅為 `personal`／`shared`；page 僅為 `dashboard`／`all`。
- 切換 track 回到 dashboard，清除 display currency、selection 與 batch expansion；切至 shared 時 proxy filter 回到 `all`。
- 離開完整紀錄清除 selection；關閉完整紀錄清除搜尋、篩選、分組與 selection。
- selection map 只保留 truthy string ID；toggle batch／select all 由 caller 傳入當下可見 ID。
- 未知 action fail closed，不 commit、也不 render。
- UI state 只存在 session，不進 localStorage、個人備份、schema 或同步 payload。

## Expected Benefits

- 帳本切換、歷史瀏覽與多選的 reset 規則只有一個權威來源。
- `transition` 可用純 Node 測試完整驗證，`createWorkflow(adapter)` 可驗證 production effect ordering。
- filter panel 可走 partial sync，保留搜尋 input DOM、內容與焦點，不必整頁重建。
- module interface 足夠小，後續能以實證逐步擴展，不迫使其他 Ledger 流程同時重構。

允許的 ordered effects 為 `close-actions`、`render-split`、`render-history-results`、`sync-history-filter-panel` 與 `scroll-top`（`auto`／`smooth`）。Workflow 一律先 commit 新 state，再執行 effects。

## Trade-offs

- `index.html` 仍保留 entry draft、editing、correction、calendar、calculator、settlement 與 DOM render，短期內不是完整獨立 Ledger module。
- production adapter 仍需把既有 public handlers 轉成 action，並維持 legacy `ledgerUiState` 相容欄位。
- UMD／ES5 相容寫法比現代 module 語法冗長，但可維持目前無 build step、離線 App Shell 與 Node direct-require 測試。

## Future Impact

Ledger create／edit entry session 已依 ADR 0011 沿用「純 transition + ordered effects + injected adapter」模式，並深化同一份 `ledger-ui-state.js`，沒有建立第二份 entry state。correction、settlement 與 Shopping UI workflow 仍須先補 characterization tests 並證明介面需求；不得僅為追求單一大 store 而移動 draft schema、repository、sync 或 settlement。
