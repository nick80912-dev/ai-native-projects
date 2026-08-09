# Shopping UI List Tab＋Selection Workflow／State Seam Design

> 日期：2026-08-09
> 狀態：Bar 已核准執行
> 優先級：Shopping UI P0／P1
> Runtime 版本：本批不決定、不修改版本字串

## Purpose

Shopping UI 的 session state 目前集中在 `shoppingUiState`，但 list tab、selection、form、split 與 photo error 仍由多個 runtime handler 直接 mutation。第一個垂直切片只收斂「採買清單 tab＋selection」：先以 characterization tests 鎖住既有使用者行為，再建立一個 production 真正使用、可由 Node 直接測試的最小 workflow／state seam。

本批的目標不是把 Shopping 全部模組化，而是讓下列規則只有一個權威來源：

- 採買清單每次開啟都從待買 tab 開始，selection 為空且不在多選模式。
- 切換待買／已買 tab 時退出多選並清空 selection。
- 全選只作用於目前 tab 的可見 item IDs，不保留另一 tab 或已消失的 stale IDs。
- 取消全選保留多選模式；取消多選同時清空 selection。
- 批次操作只有成功跨過既有 store／domain 邊界後才清空 selection；取消、preflight 阻擋或執行失敗時保留 selection。
- state 先 commit，再依序執行 render、focus 等 UI effects。

## Read-Only Inventory

### Shopping page filters

購物主頁的 `_shopQ`、`shopPlaceFilter`、`shopOpenFloors`、`shopWantListOpen` 與想逛資料是購物地點瀏覽狀態，不是採買清單狀態。它們在本批只作為進入 Shopping list 前的背景 context；不得搬入新 module，也不得改變搜尋、地點 chip、樓層或想逛行為。

### Shopping list tab and selection

目前 `shoppingUiState.tab` 為 `pending | done`，`selectionMode` 為 boolean，`selected` 為 item ID truth map。list renderer 依 tab 從 Shopping store 取得目前項目；renderer、group ordering、card markup 與 toolbar markup 都是狀態投影，不是本批要搬動的責任。

### Bulk operations

待買 tab 的批次動作是已買、記帳、刪除；已買 tab 的批次動作是移回待買、記帳、刪除。Store mutation、Shopping-to-Ledger preflight、Ledger draft 建立、刪除警告及使用者通知維持在既有 runtime／domain 路徑。新 module 只決定操作結果何時重設 selection，以及後續 effects 的順序。

### Form, detail, photo and return context

- Form 仍由 `form`、`formSession` 與 `photoError` 管理，包含 scrollTop、item ID、來源 context、temporary photo IDs 與 `savePending`。
- Partial purchase 仍由 `split` 管理；切 tab 時沿用既有關閉 split 行為，但 module 不擁有 split payload。
- Detail、photo viewer、photo repair、photo audit 與 `shoppingDetailReturnItemId` 維持原狀。
- Shopping list 仍是疊在目前 view 上的 overlay，不修改 `curView`；關閉後自然回到底層 Today／Shopping／Settings context。
- Form → list/detail 與 Shopping detail ↔ Ledger detail／entry 的返回規則不納入第一切片。

## Selected Architecture

### One deep module, one small interface

新增 ES5-compatible UMD module `shopping-ui-state.js`，公開 interface 維持：

```js
createState(seed)
transition(state, action) // {state, effects, changed}
createWorkflow(adapter)  // {dispatch(action)}
```

Module 只擁有下列 state projection：

```js
{
  tab: 'pending' | 'done',
  selectionMode: false,
  selected: {}
}
```

這是一個 workflow seam，不是第二份 App store。Production adapter 的 `readState()` 從既有 `shoppingUiState` 投影這三個欄位；`writeState(next)` 只回寫同三個欄位。`form`、`formSession`、`split` 與 `photoError` 留在相同 compatibility object，renderer 也繼續讀既有 `shoppingUiState`，因此不需修改 DOM renderer。

### Actions

第一切片允許的 actions：

| Action | Input | State result |
|---|---|---|
| `open-list` | 無 | `pending`、退出 selection、清空 selected |
| `set-tab` | `tab` | 合法化為 `pending | done`、退出 selection、清空 selected |
| `toggle-selection-mode` | 無 | 反轉 mode，且每次都清空 selected |
| `set-item-selection` | `id`, `selected` | 在 selection mode 中加入或移除一個 truthy ID |
| `toggle-visible-selection` | `ids` | 若可見 IDs 已全選則清空；否則只選取該組 IDs |
| `reset-selection` | 無 | 退出 selection、清空 selected |
| `prune-selection` | `ids` | 從 selected 移除已刪除 IDs，不改 mode |

未知 action、空 item ID 或不合法 input fail closed：回傳原 state、`changed:false`、零 effects。

### Effects

允許的 ordered effects：

- `clear-split`：由 compatibility adapter 清除既有 split session。
- `render-list`：呼叫既有 `renderShoppingListOverlay()`。
- `render-today`：只在既有成功操作本來就更新 Today 時呼叫。
- `focus-selection-control`：在 list render 後以既有 frame timing 將焦點放回全選／取消全選按鈕。

Workflow 必須先 `writeState`，再依 outcome 順序執行 effects。Module 不直接讀 DOM、Shopping store、photo repository、Ledger repository、localStorage 或 clock。

## Production Wiring

保留現有 public handlers 與 inline `onclick`／`onchange` 名稱，讓 DOM markup 無需重寫。Handlers 改為組合 action 與既有 runtime input：

- `openShoppingList()` 在既有 overlay 建立與 legacy form reset 後 dispatch `open-list`。
- `setShoppingTab(tab)` dispatch `set-tab`；`clear-split` 由 effect adapter 執行。
- `toggleShoppingSelectionMode()` dispatch `toggle-selection-mode`。
- `toggleShoppingSelection(id, selected)` dispatch `set-item-selection`。
- `toggleShoppingPageSelection()` 將 `shoppingCurrentTabItems()` 的 IDs 傳給 `toggle-visible-selection`。
- 單筆刪除成功以 `prune-selection` 移除該 ID。
- 批次完成、移回待買、刪除或成功開啟 Ledger draft 後 dispatch `reset-selection`；錯誤、取消與 preflight 阻擋不 dispatch。

現有 Shopping-to-Ledger domain interface、Shopping store calls、renderer HTML、文案與通知維持不變。Production wiring 不在新 module 複製 store 或 domain 決策。

## Characterization and TDD Strategy

### Characterization before migration

先對目前 production handlers 建立可重跑的 characterization tests，測試必須在尚未新增 module wiring 時通過：

- 開啟清單重設 tab、selection mode 與 selected。
- 切 tab 清除 split／selection 並 render 一次。
- 進入與取消多選都從空 selection 開始。
- 單項選取、取消選取與目前 tab 全選／取消全選。
- 全選後 focus 回到對應控制。
- selection mode 中點卡片 body 只改 selection，不開 detail、不改 `done`。
- 批次成功清 selection。
- 批次 store failure、Buy-to-Ledger preflight 阻擋與刪除取消保留 selection。

### Module tests

依 red-green-refactor 建立 `tests/shopping-ui-state.test.js`：

- `createState()` defaults、seed normalization、immutability 與 truth-map cleanup。
- 每個 action 的 literal next state、effects 與 `changed`。
- 可見 IDs 去重、stale ID 清除、空 IDs 行為與 tab isolation。
- recording adapter 證明 state 先 commit，再執行 ordered effects。
- invalid actions 不寫 state、不 render。

### Wiring and browser tests

- `tests/shopping-ui-state-wiring.test.js` 驗證 runtime 載入 module、production 建立 workflow、已遷移 handlers 不再直接 mutation owned fields，且 adapter 不接觸 store、photo repository、Buy-to-Ledger domain 或 renderer implementation。
- `tests/pwa-shell.test.js` 驗證新 module 被 index 載入並加入離線 App Shell。
- 延伸既有 Shopping Playwright 覆蓋失敗／取消 selection preservation；既有 list entry、select-all、photo 與 Buy-to-Ledger suites 全數回歸。

## Alternatives Considered

### Reducer only

只新增純 `transition()`，render、focus 與 split cleanup 仍由每個 handler 自行排序。修改量較少，但跨欄位 reset 與 effect ordering 仍散落，不能完整建立 workflow seam。

### Setter helpers

以 `setShoppingTabState()`、`clearShoppingSelection()` 等 helpers 包裝直接 mutation。Caller 仍需知道何時組合哪些 setters，也無法以一個 interface 驗證完整流程，屬於 shallow module。

### Full Shopping state extraction

一次移入 form、split、detail、photo、Shopping store 與 Buy-to-Ledger。這會跨越多個已各自驗證的 lifecycle 與 repository seam，回歸面過大，也違反本批明文範圍。

## Invariants and Error Behavior

- State、selected map 與 caller 提供的 ID array 不做就地 mutation。
- selected 只保存非空字串的 truthy ID。
- `set-item-selection` 只有 selection mode 開啟時有效。
- `toggle-visible-selection` 以 caller 提供的目前 tab IDs 重建整份 selection，不保留 hidden／stale IDs。
- State-only actions不得修改 Shopping item、photoId、ledgerLinks、localStorage 或 DOM。
- Store／domain 成功是 reset selection 的前置條件；失敗或使用者取消時 state 維持可重試。
- Adapter effect 缺失時明確拋錯，不靜默略過 production effect。
- UI state 保持 session-only，不進個人備份、schema、sync payload 或 CMS。

## Files and Scope

### Add

- `shopping-ui-state.js`
- `tests/shopping-ui-state-characterization.test.js`
- `tests/shopping-ui-state.test.js`
- `tests/shopping-ui-state-wiring.test.js`

### Modify

- `index.html`：只改 module script、state projection adapter 與既有 public handlers；不改 DOM renderer output。
- `sw.js`：只把新 module 加入 `SHELL`；不改 lifecycle、cache strategy 或版本字串。
- `tests/browser/shopping-select-all.spec.js`：補失敗／取消 preservation 與 row-body selection behavior。
- `tests/pwa-shell.test.js`、`tests/README.md`：登記新 runtime module 與測試。
- `CONTEXT.md`、`adr/README.md`、新增 ADR、`07_CHANGELOG.md`、`tasks/current.md`：同步 architecture 與交付證據。

### Explicit non-goals

- 不修改 `app-version.js` 或 `sw.js` 的 `SW_VERSION`。
- 不修改 Shopping store、Shopping Item schema、localStorage key、個人備份格式或資料 migration。
- 不修改 `shopping-photo-store.js`、photo audit／repair／viewer lifecycle。
- 不修改 `buy-to-ledger.js` domain／workflow interface、Ledger repository 或資料格式。
- 不修改 Shopping page search／filter／wants／floor state。
- 不修改 Shopping form、detail、split payload 或 DOM renderer markup。
- 不 merge `main`、不 deploy Netlify。

## Delivery and Rollback

本批直接交付 `dev`。先提交 spec，再提交 implementation plan；runtime code 僅在 characterization tests 與 module tests完成 red-green 後修改。完成後執行全部 Node tests、完整 Playwright、文件標題、App version consistency 與 `git diff --check`，再 push `origin/dev`。

回滾以 `git revert` 本批 implementation／docs commits 完成。因沒有 schema、storage 或資料 migration，回滾不需資料修復；若新 module 載入造成 runtime 問題，revert index script／adapter 與 SW `SHELL` entry 即恢復原 inline state handling。
