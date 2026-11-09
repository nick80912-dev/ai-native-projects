# Buy-to-Ledger Vertical Slice Design

> 狀態：Approved。Bar 於 2026-08-08 核准以 Buy-to-Ledger Loop 作為第一個垂直切片，依 P0～P4 逐步建立 characterization、最小 seam、純資料 module、workflow coordinator 與正式 runtime interface。

## 目標

在不改變可見 UI、Ledger 21 欄格式、Shopping 備份格式、同步語意或帳務計算的前提下，把目前散落於 `index.html` 的 Shopping → Ledger → commit → link 回寫 → 返回流程收斂成一個深 module。

成功判準不是單純減少 `index.html` 行數，而是：

- 呼叫端只需理解少量 interface，不需知道 source ID、queue acknowledgement、link plan 或回寫降級細節。
- production adapter 與 test adapter 穿過同一 seam。
- 純資料行為可直接測試，不再依賴從 `index.html` 擷取大段原始碼。
- workflow tests 觀察輸入、持久化、原子回寫、回饋與返回結果，不鎖 implementation 排列。
- 任何階段都能單獨回歸；P1～P4 不順便改 UI 或資料規則。

## 非目標

- 不重寫整份 Ledger、Shopping List 或 `index.html`。
- 不引入框架、bundler、TypeScript 或 npm runtime dependency。
- 不改 Ledger Schema、Apps Script、localStorage key、`PERSONAL_STATE_VERSION` 或備份 payload。
- 不修正 characterization 過程中發現的既有 UX 差異；先記錄，再另批決策。
- 不一開始建立全 App 的 repository／event bus／state-management 抽象。

## P0 現況基準

### 完整 call graph

```text
入口
├─ openShoppingLedgerEntry(id)
├─ openShoppingIncompleteLedgerEntry(id)
├─ completeSelectedShopping(true)
│  └─ openShoppingMultiLedgerEntry(items)
└─ openShoppingMultiLedgerEntry(items)
   │
   ├─ shoppingListStore.all()
   ├─ shoppingLedgerContext()
   │  ├─ personal localStorage records
   │  └─ mergedLedgerRecords() = remote + queue + delivery bridge
   ├─ shoppingLedgerSources(items, context)
   │  └─ resolveShoppingLedgerLinkState(allocation, context)
   └─ openShoppingLedgerSourcesEntry(sources, keepShoppingList)
      ├─ shoppingLedgerPrefillForAllocation() / shoppingLedgerMultiPrefill()
      ├─ closeShoppingList()（一般入口）或保留 Shopping overlay（補記入口）
      ├─ openLedgerEntrySheet(false)
      └─ 把 sourceShoppingItemId/sourceShoppingAllocationId 寫入 ephemeral draft

使用者編輯 Ledger form
└─ saveLedgerEntry(addAnother)
   ├─ validateLedgerEntryDraft()
   ├─ buildLedgerExpenseRecords()
   ├─ ledgerPotentialDuplicate() / confirmSharedLedgerDuplicate()
   └─ commitLedgerEntrySave()
      ├─ persistLedgerExpenseRecords()
      │  ├─ personalLedgerRepository.add()
      │  └─ ledgerRepository.enqueueBatch()
      ├─ writeShoppingLedgerLinks()
      │  ├─ shoppingLinkSourceRefs(submissionDraft)
      │  ├─ planShoppingLedgerLinks(sourceRefs, savedRecords, context, now)
      │  └─ shoppingListStore.applyLedgerLinks(plan.links)（單次原子 write）
      ├─ renderSplit()
      ├─ resetLedgerDraftAfterSave() 或 closeLedgerEntrySheet()
      └─ personal undo / shared queued / failure toast
```

### 資料流

1. Shopping Item 的每個 `allocation` 是最小來源；`shoppingItemId + allocationId` 是 composite identity。
2. 來源 identity 只存在 Ledger draft／draft item，不進 Ledger 21 欄、不送 Apps Script。
3. `validateLedgerEntryDraft()` 會移除空白多品項列；source-to-record 對應必須使用同一份 `submissionItems` 順序。
4. 個人帳以 `personalLedgerRepository.add()` 完成本機持久化；團體帳以 `enqueueBatch()` 寫入 durable queue 即完成 UI commit。
5. Ledger commit 成功後才建立 Shopping link plan。數量、空 identity 或重複 composite key 不一致時，整批 link fail closed。
6. `shoppingListStore.applyLedgerLinks()` clone 全清單後只做一次 localStorage write；任一來源失效時不得留下半批 link。
7. Ledger 已成功而 Shopping link 回寫失敗時不回滾、不自動重送 Ledger，只記錄診斷並提示避免再次記帳。

### 狀態盤點

| 類別 | 狀態 | 權威來源／生命週期 |
|---|---|---|
| 持久 Shopping | `allocations[].ledgerLinks[]`、`releasedAt` | `trip_shopping_list`；append-only link history |
| 持久個人 Ledger | expense records | `trip_personal_ledger` |
| 持久團體 Ledger | remote + queue + bridge | Sheet、`trip_ledger_queue`、delivery bridge |
| Ephemeral workflow | `sourceShoppingItemId`、`sourceShoppingAllocationId` | Ledger draft 或 draft item；不輸出到 record |
| Ephemeral UI | `shoppingUiState`、`ledgerUiState`、overlay／scroll／focus | 單次 App session |
| Derived | `linked`／`partial`／`unverified`／`unlinked` | link history + current universe + effective Ledger records |

### Commit state table

| 狀態 | Ledger | Shopping link | UI 結果 |
|---|---|---|---|
| validation failed | 不寫入 | 不寫入 | 保留表單並聚焦錯誤 |
| duplicate cancelled | 不寫入 | 不寫入 | 保留表單 |
| persistence rejected／throw | 不寫入或未取得 durable ack | 不寫入 | 保留表單並顯示失敗 |
| persistence success + link plan valid | 已持久化／入列 | 原子 append | 關閉或 reset 表單，顯示成功 |
| persistence success + source mismatch | 已持久化／入列 | 完全不寫 | 顯示核准降級文案，不重送 Ledger |
| persistence success + Shopping write throws | 已持久化／入列 | 完全不寫 | 同上 |
| save-and-add-another | 第一筆已完成 | 第一筆 link 已完成 | 新 draft 不保留 source identity |
| edit existing Ledger | 走既有 edit 語意 | 不回寫 | Buy-to-Ledger 不介入 |

## 現有測試與缺口

| 測試 | 已覆蓋 | 缺口 |
|---|---|---|
| `shopping-ledger-links.test.js` | link history、三態、source plan、store 原子性、原始碼接線 | 大量 substring assertion；沒有實際 DOM + repository 的完整 loop |
| `shopping-list.test.js` | prefill、allocation 展開、入口與 renderer | 不提交 Ledger |
| `ledger-draft-track-switch.test.js` | 切個人／團體後 source identity 保留 | 不驗證 commit／回寫 |
| `ledger-quick-entry.test.js` | generic Ledger commit、duplicate、沒有 Shopping source 時不回寫 | Buy-to-Ledger path 刻意未測 |
| `browser/shopping-select-all.spec.js` | 多選後成功開啟多品項 Ledger form | 停在 form；不驗證持久化、link、返回與失敗降級 |

P1 必須先補 production runtime 的 characterization，之後才允許改 seam。

## 選定 module 與 seam

### 外部 interface

最終 module 由 `buy-to-ledger.js` 提供 UMD／CommonJS 相容的 `TripBuyToLedger`：

```js
var domain = TripBuyToLedger.createDomain({
  effectiveRecords: effectiveLedgerRecordsAdapter
});

var workflow = TripBuyToLedger.createWorkflow({
  domain: domain,
  adapter: buyToLedgerRuntimeAdapter
});

workflow.start({ itemIds: ['shopping-1'], keepShoppingList: false });
workflow.commit({ draft: draft, submissionDraft: submissionDraft, records: records });
```

呼叫端只需要 `start(intent)` 與 `commit(command)`。link history、derived state、draft plan 與 commit plan 是同一 module 的 domain interface，供 Shopping renderer／store 與 direct tests 使用，不建立全 App God interface。

### Internal adapter seam

production adapter 與 recording test adapter 都滿足同一份依賴：

- `readItems(itemIds)`
- `readLinkContext()`
- `openLedgerDraft(plan, options)`
- `persistLedger(command)`
- `applyLinks(links)`
- `finishLedger(command, result)`
- `failLedger(command, error)`
- `notify(message)`
- `log(message)`
- `nowIso()`

這是 module implementation 的 internal seam，不讓一般呼叫端直接操作。其方法數由完整 loop 的真實副作用決定；P1 先在 `index.html` 建立 production／test 兩個 adapter，P3 才讓 coordinator 接手順序。

## 分階段設計

### P1：Characterization + 最小 seam

- 新增 Node workflow characterization 與真實 Browser loop。
- 在 `index.html` 建立 Buy-to-Ledger 專用 dependency factory；現有函式仍持有流程，不移動 implementation。
- production 行為必須與 P0 state table 一致。

### P2：純資料 module

- 新增 `buy-to-ledger.js`。
- 抽出 draft plan、source identity、link history、derived state、source-to-record commit plan。
- module 不讀 DOM、global state、localStorage、clock 或 repository。
- `effectiveLedgerRecords()` 透過建立 domain 時注入，避免把整個 Ledger 投影搬入本 module。

### P3：Workflow coordinator

- `createWorkflow()` 擁有 start → persist → link → finish／fail 的順序與 fail-closed 規則。
- DOM render、overlay、toast、AppLog、repositories 都只由 adapter 提供。
- generic Ledger 新增／編輯若沒有 Shopping session，仍走原本路徑。

### P4：正式 runtime interface

- 移除只為過渡存在的 wrapper／substring contract。
- Shopping renderer、edit guard、delete warning、split guard 改讀 module 的同一份 inspection projection。
- direct module tests 成為主要 test surface；Browser tests保留使用者可觀察 loop。
- interface 只擴展已被至少兩個 caller 或 production + test adapter 證明需要的能力。

## 檔案與載入策略

- `buy-to-ledger.js`：ES5-compatible UMD；純 domain + workflow factory。
- `index.html`：production adapter、UI entry wiring、generic Ledger fallback。
- `sw.js`：P4 交付時把新 runtime asset 加入 SHELL，除此之外不改 cache strategy。
- `tests/buy-to-ledger-module.test.js`：CommonJS direct interface tests。
- `tests/buy-to-ledger-characterization.test.js`：P1 production flow baseline。
- `tests/browser/buy-to-ledger.spec.js`：真實單筆／多筆／團體／失敗／返回 loop。

## 版本與相容性

P0 僅文件，不升版。P1～P4 合併為一個無可見行為變更的 v93 runtime batch；因新增 App Shell asset，`app-version.js` 與 `sw.js` 必須同步升 v93，`sw.js` 除版本字串與 SHELL asset 外不得改生命週期或 fetch 策略。原排定 SW 更新提示雙版本驗收順延為 v94／v95。

`PERSONAL_STATE_VERSION` 維持 9，Ledger Schema、Shopping backup payload、Apps Script 與 `netlify.toml` 均不變。

## P0 未追蹤文件處理

`docs/superpowers/plans/2026-08-02-ui-ux-hardening.md` 是以 `5ef44a5`／v77 為基準的未追蹤草稿；對應行為已於 v78 交付，暗色部分又在 v80 明確撤回，且檔案含編碼損壞。它不是現行規格，也從未進入 Git 歷史。P0 直接移除，不把過時、互相矛盾的草稿補進 repository。
