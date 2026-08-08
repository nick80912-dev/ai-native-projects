# ADR 0010 — Ledger UI 歷史瀏覽 Workflow／State Seam

> 狀態：Accepted（2026-08-08，依 Bar 核准直接執行）

## Decision

以 Ledger 的「帳本軌切換 → 完整紀錄 → 篩選／分組 → 多選」作為 `ledgerUiState` 的第一個垂直切片。新增 ES5-compatible UMD module `ledger-ui-state.js`，外部 interface 僅提供：

- `createState(seed)`：建立並正規化 session-only UI state。
- `transition(state, action)`：以不可變方式回傳 `{ state, effects, changed }`。
- `activeHistoryFilterCount(state)`：回傳目前有效的歷史篩選群組數。
- `createWorkflow(adapter)`：以 `dispatch(action)` 協調 state commit 與 render／popover／scroll effects。

`index.html` 保留 `ledgerUiState` 相容讀取面，既有 renderer、Ledger repositories、entry draft、calculator、settlement 與 Buy-to-Ledger 不移入本 module。production adapter 與 recording test adapter 共同落在同一 seam。

## Context

目前 `ledgerUiState` 有 23 個欄位，混合 dashboard、history、selection、entry draft、calendar、correction 與 save guard。多個 handler 會各自重複清除 `selectionMode`、`selectedRecordIds`、filters 與 page；新增狀態時容易漏掉其中一條返回或切軌路徑。另一方面，entry draft 有 70 次以上讀寫且連動大量表單 rendering，本批若一起搬移會形成高風險大爆炸重構。

歷史瀏覽群組的依賴只有 in-process state 與可注入 UI effects，適合先形成深 module：狀態不變量集中在 transition，caller 不再知道各 action 要清哪些欄位；workflow 只需一個 production adapter，測試以 recording adapter 觀察 effect ordering。

## Invariants

- state 永遠是新物件；輸入 state、array、map 不可被 mutation。
- track 只允許 `personal`／`shared`；page 只允許 `dashboard`／`all`。
- 切換 track 必須回 dashboard、清 display currency、舊 selection 與 batch expansion；切到 shared 時 proxy filter 強制 `all`。
- 開啟完整紀錄保留既有搜尋／篩選，但退出 selection。
- 關閉完整紀錄重設搜尋、篩選、分組與 selection。
- selection map 只保留 truthy string ID；toggle batch／select all 只接受 caller 提供的目前可見 ID。
- 無效 action 或無效值 fail closed，不 commit、不 render。
- 這些 UI state 只存在於記憶體，不進 localStorage、備份、schema 或同步 payload。

## Effects

transition 只描述 effect，不碰 DOM：

- `close-actions`
- `render-split`
- `render-history-results`
- `sync-history-filter-panel`
- `scroll-top`（`auto` 或 `smooth`）

workflow 先 commit 新 state，再依序執行 effects，確保 renderer 讀到的都是新狀態。

## Alternatives Considered

- 一次抽走全部 `ledgerUiState`：拒絕；entry draft／correction／calendar 與 DOM rerender 高度耦合，回歸面過大。
- 只新增一組 setter helper：拒絕；刪除 module 後複雜度不會回到 caller，屬於淺 pass-through。
- 導入 event bus 或全 App store：拒絕；interface 過大且目前沒有第二個需要共享的 bounded workflow。
- 只抽純 reducer、不接 production：拒絕；會形成 hypothetical seam，既有 handler 仍可繼續繞過不變量。

## Consequences

第一批只降低歷史瀏覽與多選的狀態耦合；entry draft 仍留在 `index.html`。後續若 characterization 證明 interface 足夠穩定，可用相同「transition + effects + adapter」模式接續 entry session lifecycle，但不得把 draft schema 或 repository 接口塞進目前 module。
