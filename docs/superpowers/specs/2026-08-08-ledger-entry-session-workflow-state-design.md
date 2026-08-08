# Ledger Entry Session Workflow State Design

日期：2026-08-08
狀態：已實作並納入 v97，完整 gate 通過
基準：`dev` `cb373814dd2fd6520e72810cbc3beea02c82816d`（v96）

## 1. 背景

v95 已建立 `ledger-ui-state.js`，以 `createState(seed)`、`transition(state, action)`、`createWorkflow(adapter)` 管理 Ledger dashboard 與完整歷史的 UI workflow state。現有 module 也已包含 `sheet`、`draft`、`editing`、`savePending` 與 calendar 欄位，但 entry create/edit 流程仍直接在 `index.html` 修改這些欄位並操作 DOM。

本批深化既有 module，讓同一 Module 接管 dashboard/history 與 create/edit entry session 的生命週期。這是第二個 Ledger UI 垂直切片，不建立第二份 entry state，也不設計全域 store。

## 2. 決策摘要

採用深化既有 `ledger-ui-state.js` 的方案。

公開 Interface 維持：

```js
createState(seed)
transition(state, action)
createWorkflow(adapter)
```

新增語意型 entry actions 與 ordered effects。module 管理 entry session 邊界上的 draft 安裝、替換、保留與清除；draft 內容仍是不透明資料，帳務規則留在既有純函式與 runtime adapter。

## 3. 目標

- 以同一份 `ledgerUiState` 管理 Ledger dashboard/history 與 create/edit entry session。
- 讓 entry open、close、track switch、validation result、save lifecycle 與 calendar 經過純 transition。
- 讓 `savePending` 成為 state invariant，避免重複提交。
- 以 session/request ID 阻止過期非同步結果污染後開啟的表單。
- 以純資料 return context 恢復 Ledger 或 Shopping 來源畫面。
- 保持現有 create、edit、save、save-and-add-another、Buy-to-Ledger、calculator cleanup 與 correction 行為。
- 以 injected Adapter 隔離 DOM、scroll、focus、toast 與 render。

## 4. 非目標

本批不處理：

- correction workflow 的模組化。
- settlement workflow。
- calculator 的 expression、target、result 或按鍵 state。
- Ledger draft 的帳務驗證、record 建立、金額／稅率／分攤計算。
- repository、同步佇列、Buy-to-Ledger domain 或 link commit 規則。
- DOM rendering 的抽離。
- Shopping UI workflow/state 的模組化。
- schema、備份格式、`PERSONAL_STATE_VERSION` 或資料遷移。
- 以大量 setter 或通用 store 取代語意型 actions。

## 5. Module 邊界

### 5.1 Module 責任

`ledger-ui-state.js` 負責：

- 正規化 Ledger UI state。
- 執行純 state transition。
- 維護 entry session invariants。
- 決定 ordered effects。
- 透過 injected adapter 執行 effects。

### 5.2 Adapter 責任

runtime adapter 負責：

- mount/unmount entry overlay。
- render entry sheet。
- 保留或重設 sheet scroll。
- focus amount、validation error 或返回目標。
- 同步 pending button UI。
- 恢復 Ledger／Shopping return context。
- 顯示既有成功、queued、失敗等通知。
- 呼叫既有 `renderSplit()` 與關閉 actions popover。
- entry unmount 時維持現有 calculator cleanup。

### 5.3 留在 module 外的 implementation

- `createLedgerEntryDraft()` 與 `ledgerDraftFromRecords()`。
- `switchLedgerDraftTrackPlan()`。
- `validateLedgerEntryDraft()`。
- record preparation 與 duplicate detection。
- personal/shared persistence 與 Buy-to-Ledger commit。
- correction、settlement 與 calculator implementation。

## 6. State model

延續既有 flat state，避免同時搬動所有 renderer。entry slice 使用：

```js
{
  sheet: null | 'entry',
  draft: null | Object,
  editing: null | Object,
  savePending: Boolean,
  calendarOpen: Boolean,
  calendarYear: Number,
  calendarMonth: Number,
  entryReturnContext: null | Object,
  entrySessionId: '',
  entrySaveRequestId: ''
}
```

`draft`、`editing` 與 `entryReturnContext` 都是純資料；不得保存 DOM node、function 或事件物件。

### 6.1 Invariants

- create/edit entry 關閉時，`draft`、`editing`、`savePending`、calendar、session/request ID 與 return context 都重設。
- create/edit entry 開啟時必須存在 `draft` 與非空 `entrySessionId`。
- create session 的 `editing` 為 `null`；edit session 的 `editing` 保存既有 edit descriptor。
- `savePending === true` 時必須存在 `entrySaveRequestId`。
- pending 中的第二次 save request 回傳 `changed:false`。
- save failure 只解除 pending 並清除 request ID，不清除 draft、editing、session ID 或 return context。
- save-and-close 清除 entry session；save-and-add-another 保持相同 session 與 return context，但安裝乾淨 draft、清除 editing、pending、request ID、calendar、來源連結與 validation errors。
- 關閉 entry 或換成下一筆 draft 時 calendar 必須關閉。
- 過期 session/request 的 success 或 failure 回傳 `changed:false`。

### 6.2 Correction 相容例外

correction 目前共用 `ledgerEntrySheet` 與部分 flat state，但本批不新增 correction actions。runtime 必須保留一條明確標記、受 characterization tests 保護的 legacy compatibility branch。這是下一個 correction workflow slice 才消除的暫時例外，不得藉本批改變 correction 語意。

## 7. Entry actions

### 7.1 Session lifecycle

```text
open-entry-create
open-entry-edit
close-entry
entry-track-switched
```

- `open-entry-create` 接收 caller 建立的 draft、session ID、return context 與 initial focus intent。
- `open-entry-edit` 另外接收 edit descriptor。
- 兩個 open actions 都關閉 calendar、清除 pending/request ID，並安裝新的 session state。
- `close-entry` 攜帶是否恢復背景的 intent，清除 session state，並把關閉前的 return context放進 effect payload。
- `entry-track-switched` 接收 `switchLedgerDraftTrackPlan()` 已產生的完整 next draft；module 不理解參與者、代購或來源連結規則。

### 7.2 Validation and save

```text
entry-validation-failed
entry-save-requested
entry-save-succeeded
entry-save-failed
```

- validation 在 module 外執行。
- `entry-validation-failed` 接收包含 errors 的完整 next draft 與 first error target。
- `entry-save-requested` 接收 session ID 與新的 request ID；只有目前 session 且非 pending 時接受。
- persistence 在 action 之外執行。
- success/failure 必須攜帶相同 session/request ID。
- success 接收既有提交 outcome；若為 add-another，另接收外部 helper 建立的 next draft。
- module 不判讀 queued、personal/shared、同步狀態或 toast 文案。

### 7.3 Calendar

```text
toggle-entry-calendar
shift-entry-calendar
select-entry-calendar-date
close-entry-calendar
```

- 開啟 calendar 時 caller 提供從目前 draft 日期解析出的 year/month。
- 月份切換只在 module 做純數字正規化與跨年計算。
- 選取日期時，外部 helper 建立完整 next draft；transition 安裝 draft 並關閉 calendar。
- entry 未開啟時 calendar actions 不產生變更。

## 8. Ordered effects

新增 effect capabilities：

```text
mount-entry
unmount-entry
render-entry
sync-entry-pending
focus-entry
restore-entry-context
notify-entry-result
```

沿用：

```text
close-actions
render-split
```

### 8.1 Effect order

| Transition | Ordered effects |
| --- | --- |
| open create/edit | `close-actions → mount-entry → render-entry → focus-entry`（初始焦點維持同一使用者事件鏈，避免 iPhone 鍵盤不彈出） |
| track switched | `render-entry`（保留位置） |
| validation failed | `render-entry`（保留位置）`→ focus-entry(error)` |
| save requested | `sync-entry-pending` |
| save failed | `sync-entry-pending → notify-entry-result` |
| save succeeded, close | `sync-entry-pending → unmount-entry → render-split → restore-entry-context → notify-entry-result` |
| save succeeded, add another | `sync-entry-pending → render-split → render-entry`（回頂）`→ focus-entry(amount) → notify-entry-result` |
| close | `unmount-entry → restore-entry-context` |
| calendar action | `render-entry`（保留位置與合理焦點） |

`createWorkflow(adapter).dispatch(action)` 保持同步：先 `writeState(outcome.state)`，再依序 invoke effects。module 不等待 Promise。

## 9. Async save sequence

```text
UI save
  → validateLedgerEntryDraft(draft)
    → invalid
      → dispatch(entry-validation-failed)
    → valid
      → dispatch(entry-save-requested)
      → prepare records / duplicate handling / commit
        → dispatch(entry-save-succeeded)
        → dispatch(entry-save-failed)
```

如果 `entry-save-requested` 回傳 `changed:false`，呼叫端不得執行 commit。

## 10. Return context

`entryReturnContext` 是 module 不解讀的純資料 envelope。預期 kind：

```js
{kind:'ledger', scrollY:0, focusId:''}
{kind:'shopping', keepMounted:true, detailItemId:''}
```

- caller 在 open action 前捕捉 context。
- save-and-add-another 保留 context，不執行 restore。
- close 或 save-and-close 的 effect 攜帶 transition 前的 context。
- state 在關閉後不保留過期 context。
- Shopping adapter 只維持既有 Buy-to-Ledger mounted overlay／detail return 行為；本批不重新設計 Shopping state。

## 11. Calculator interaction

calculator 不加入本批 state/actions。`unmount-entry` adapter 暫時保留目前的父層清理：若 calculator 開啟，先以既有 API 關閉，再移除 entry overlay。module 不讀寫 `ledgerCalculatorState`，calculator 的算式、target、result、focus 細節保持原樣。

## 12. Runtime migration

建議依序遷移：

1. 先加入 failing Node transition/workflow tests。
2. 擴充 `ledger-ui-state.js` state 正規化、actions、invariants 與 effect adapter mapping。
3. 將 create/edit open 與一般 close 改為 dispatch wrapper。
4. 將 draft track switch 與 calendar 改走 actions。
5. 將 create/edit validation、pending、success、failure 與 add-another 改走 actions。
6. Buy-to-Ledger finish/fail adapter 改為提交 entry result actions，但不改其 domain/coordinator。
7. 保留並標記 correction compatibility branch。
8. 移除 create/edit 路徑已無用途的直接 state mutations；不得留下第二份 entry state。

## 13. Testing strategy

### 13.1 Node transition tests

- createState defaults 與 seed normalization。
- open create/edit 安裝正確 state。
- close 清除 session 並保留 effect 中的 return context。
- track switch 安裝完整 next draft 並清除 validation errors 的既有語意。
- validation failure 保留 session、顯示 errors 並 focus first invalid field。
- pending guard 阻止第二次 save。
- save failure 保留 draft/editing/context。
- save success close 與 add-another 的不同 state/effect sequence。
- stale session/request success/failure 不改 state、不執行 effects。
- calendar open/close、選日、月份前後移與跨年。

### 13.2 Workflow adapter tests

- state 一律先於 effect 寫入。
- 每條 transition 的 effect 順序與 payload 精確符合表格。
- 缺少必要 adapter capability 時維持明確錯誤。

### 13.3 Characterization and browser tests

- 個人／團體 create。
- 個人／團體 edit。
- 一般 save 與 save-and-add-another。
- validation failure 與持久化 failure 保留完整草稿。
- 快速連點或重複 submit 只 commit 一次。
- 關閉後 scroll/focus return。
- calendar 鍵盤、outside click 與選日。
- Buy-to-Ledger keep-mounted Shopping return。
- Shopping source links 在 add-another 後清除。
- calculator 在 entry 關閉時正確清理。
- correction 既有 open、preview、save、failure、close 行為不變。
- 舊 save Promise 在新 session 開啟後完成，不得改寫新 session。

### 13.4 Full verification

執行 repo 既有完整 Node、Playwright、文件／版本檢查與 `git diff --check`，不得只跑新增測試。

## 14. Acceptance criteria

- create/edit entry lifecycle 不再直接修改 module 已接管的 session boundary fields。
- 所有新增 entry actions 都有純 transition tests。
- savePending 與 stale completion guard 可由 Node 及 browser tests 重現。
- create/edit、Buy-to-Ledger、calendar、calculator cleanup 與 correction 使用者行為不變。
- `ledger-ui-state.js` 未新增 entry 專用 export；既有 `createState`／`transition`／`activeHistoryFilterCount`／`createWorkflow` 維持，且沒有新增第二份 entry state。
- module 不依賴 DOM、repository、Ledger schema、sync 或 Shopping implementation。
- runtime adapter 是唯一 DOM/effect 邊界。
- 無 schema、備份格式、`PERSONAL_STATE_VERSION` 或部署設定變更。

## 15. 後續切片

完成本批並驗證 interface 後，再分別規劃：

1. Ledger correction workflow/state。
2. Shopping list tab／selection workflow state。
3. Shopping form session。
4. Shopping detail/photo/split coordinators。

不得在本批預先建立涵蓋上述流程的大型抽象。
