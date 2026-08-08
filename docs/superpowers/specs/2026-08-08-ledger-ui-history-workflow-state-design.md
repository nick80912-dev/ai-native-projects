# Ledger UI 歷史瀏覽 Workflow／State 設計

> 狀態：Approved。Bar 已核准在 v94 計算機推送後直接執行 Ledger UI workflow/state；本文件把範圍收斂為第一個可驗證垂直切片。

## 目標

把分散在 `index.html` 的帳本軌切換、完整紀錄、歷史篩選與多選狀態轉移，收斂到一個 session-only 深 module。UI、資料、同步及帳務結果必須與 v94 完全相同。

## 範圍

本批涵蓋：

- `ledgerUiState` 的 canonical defaults 與 seed 正規化。
- personal／shared 軌切換。
- dashboard ↔ full history。
- search、category、pay method、proxy、tax exempt、grouping、filter panel。
- selection mode、record／batch toggle、select all、batch expansion。
- transition 所需 render、popover close 與 scroll effects。

本批不涵蓋：

- entry draft、editing、correction、calendar、save pending。
- calculator state。
- settlement／sync workflow。
- Ledger／Shopping schema、repository、queue、備份、同步、Apps Script。
- UI 文案、版面或資料格式變更。

## Module interface

```js
TripLedgerUiState.createState(seed)
TripLedgerUiState.transition(state, action)
TripLedgerUiState.activeHistoryFilterCount(state)
TripLedgerUiState.createWorkflow(adapter)
```

production 與 tests 都只跨這個 seam。`transition()` 回傳：

```js
{
  state: nextState,
  effects: [
    { type: 'close-actions' },
    { type: 'render-split' },
    { type: 'scroll-top', behavior: 'auto' }
  ],
  changed: true
}
```

workflow adapter interface：

```js
{
  readState: function(){},
  writeState: function(next){},
  closeActions: function(){},
  renderSplit: function(){},
  renderHistoryResults: function(){},
  syncHistoryFilterPanel: function(state){},
  scrollTop: function(behavior){}
}
```

只有確實需要的 production／recording adapters，沒有 repository port 或全 App dependency container。

## Actions 與不變量

| Action | State 結果 | Effects |
|---|---|---|
| `switch-track` | 合法 track、dashboard、filter all、display currency 空、selection／batch expansion 清空；shared proxy=all | close actions、render split |
| `toggle-currency` | JPY ↔ TWD；空值以 caller 提供 default currency 判斷 | render split |
| `open-history` | page=all、selectedRecordId 空、selection 清空；保留 search／filters | close actions、render split、scroll auto |
| `close-history` | dashboard、filter all；search／filters／grouping／selection 重設 | close actions、render split、scroll auto |
| `return-dashboard` | 同 close-history，但 scroll smooth | close actions、render split、scroll smooth |
| `set-history-search` | 保存文字 | render history results |
| `toggle-history-choice` | category／pay method 的不可變增刪 | render history results |
| `set-history-proxy` | 僅允許三種值 | render history results |
| `set-history-tax` | 僅允許三種值 | render history results |
| `set-history-grouping` | date／category | render history results |
| `toggle-history-panel` | boolean toggle | sync filter panel，不重建 input DOM |
| `clear-history-filters` | 保留 query／grouping，只清 filter 與 selection | close actions、render split |
| `enter-selection` | selectionMode=true、IDs／expanded batches 清空 | close actions、render split |
| `cancel-selection` | selectionMode=false、IDs 清空 | render split |
| `toggle-record-selection` | 指定 ID truthy toggle | render split |
| `toggle-batch-selection` | 依 `allSelected` 整批增刪可見 IDs | render split |
| `toggle-select-all` | 依 action 提供的 visible IDs 全選／取消 | render split |
| `toggle-batch-expanded` | 指定 batch ID toggle | render split |
| `reset-selection` | selection 與 IDs 清空，可選擇清 batch expansion | 無 render；供既有跨 view/test-mode caller 組合 |

## 相容策略

- `index.html` 仍宣告一個 `ledgerUiState`，renderer 與未遷移功能可繼續讀取。
- production workflow 的 `writeState` 只替換該 object reference；不寫 localStorage。
- 既有 public handler 名稱保留，inline `onclick` 不變；handler 內部改為 dispatch。
- history filter panel 採 partial DOM sync，避免搜尋框失焦。
- `ledgerHistoryFilteredRecords()` 等資料投影不搬入 state module。
- 新 module 加入 `<script>` 與 SW SHELL；SW 僅正常版本遞增，不改生命週期或快取策略。

## 測試

Node module tests：

- defaults／seed 正規化／輸入 immutability。
- 每個 action 的 state table、無效 action fail closed。
- track、history、filters、selection 的交叉不變量。
- active filter count personal／shared 差異。
- workflow 先 write state，再按序執行 effects。
- 缺 production adapter 方法時只在真正觸發對應 effect 時明確失敗。

Characterization／runtime wiring：

- 既有 handler 名稱仍存在並 dispatch 正確 action。
- 不再在已遷移 handler 直接 mutation 同一組欄位。
- module 由 index 載入且位於 SW SHELL。
- UI state 不進 localStorage／備份。

Browser：

- personal ↔ shared 回 dashboard。
- 完整紀錄搜尋、篩選、分組與清除。
- 進入／取消多選、record／batch／select-all。
- 關閉完整紀錄後狀態重設與回頂。
- 320／375／390px 既有呈現無水平 overflow。

## 版本

本批使用 v95。原本預留的 SW 更新提示雙版本順延至 v96／v97。`PERSONAL_STATE_VERSION` 維持 9；`netlify.toml` 不修改。
