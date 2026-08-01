# 採買分配、卡片摘要與詳情設計

日期：2026-07-27

基準版本：`dev` / `okayama-trip-v63` / `1647d58`

## 1. 背景

v63 已完成採買清單的結構化數量、待買／已買分頁、部分購買拆分、Shopping-to-Ledger 關聯、三態記帳推導及三層卡片資訊。真機使用仍有六個主要缺口：

1. 已買卡片的記帳狀態不在品名視線範圍內。
2. 代購對象混在屬性文字中，不容易快速辨識。
3. 分類缺少獨立視覺。
4. 連續新增採買項目時，每筆都要重新開啟表單。
5. 一張採買卡只能保存一位代購對象。
6. 卡片沒有可核對完整資料與帳本關聯的詳情面板。

本設計把採買卡片改成「一項商品、多筆採買分配」模型。第一版表單仍讓所有對象使用相同的每人數量，但資料層直接支援不同數量，避免未來再次升級資料模型。

## 2. 目標

- 在卡片第一視線範圍內辨識品名、代購對象與記帳狀態。
- 以一張卡管理同一商品的多位代購對象。
- 顯示每人數量與總採買量，例如 `2 盒／人 · 共 6 盒`。
- 部分購買時按原代購對象分配實際買到數量。
- 依代購對象展開帳本明細，每位對象各自擁有記帳狀態與帳本關聯。
- 提供採買詳情面板，並可直接開啟關聯的消費明細。
- 提供「儲存並新增」，減少連續建立採買項目的操作成本。
- 保留 v63 的記帳安全契約、部分拆分契約與行程站點三態契約。

## 3. 非目標

- 第一版不提供「建立時替不同對象輸入不同需求量」的 UI；資料格式必須支援日後加入。
- 不自動分攤商品總價或折扣；每位對象的金額仍在分帳表單中輸入。
- 不修改 Ledger 21 欄 Schema、Apps Script、Google Sheet、結算演算法或團體權限。
- 不讓刪除採買卡片連帶刪除帳本紀錄。
- 不改變行程站點排序、權威性與孤兒引用三態。
- 不新增第二份代購對象名單。

## 4. 採用方案

採用「單一卡片＋採買分配陣列」：

- 品名、分類、單位與行程站點由整張卡共用。
- 每位代購對象各有一筆分配，保存自己的數量及帳本關聯。
- 非代購商品也使用一筆無對象分配，讓數量、部分購買與記帳共用同一套流程。
- 卡片總數、對象人數及記帳進度全部由分配動態推導，不持久化摘要字串。

未採用的方案：

- **每位對象建立一張卡**：能沿用單一 `buyFor`，但清單會出現大量重複商品，且無法呈現 `2 盒／人 · 共 6 盒`。
- **主卡片加獨立子項目實體**：擴充性最高，但會增加展開、收合、排序與同步複雜度；目前沒有足夠需求支持這個成本。

## 5. 詞彙

- **採買項目（Shopping Item）**：共用商品與行程資訊的卡片。
- **採買分配（Allocation）**：某位對象或自己需要購買的數量，以及該份需求的帳本關聯。
- **代購分配**：`target` 非空白的分配。
- **自己的分配**：`target` 為空字串的分配，代表不是代購。
- **每人數量**：新增多對象採買時套用到每筆代購分配的相同數量。
- **總採買量**：所有分配數量的安全整數加總。

## 6. 資料模型

v7 Shopping Item 的概念結構：

```js
{
  id: "shopping-...",
  name: "白桃果凍禮盒",
  category: "伴手禮",
  unit: "盒",
  legacyQtyText: "",
  allocations: [
    {
      allocationId: "allocation-...",
      target: "阿寶",
      quantity: 2,
      ledgerLinks: []
    },
    {
      allocationId: "allocation-...",
      target: "媽媽",
      quantity: 2,
      ledgerLinks: []
    }
  ],
  stopRef: "...",
  done: false,
  createdAt: "...",
  completedAt: "",
  splitGroupId: ""
}
```

資料不變性：

- `allocations` 必須是非空陣列。
- 每筆 `allocationId` 在同一項目內唯一且建立後不變。
- `target` 經既有 `normalizeLedgerProxyTarget()` 規則正規化。
- 同一項目不可有重複的 canonical target。
- 只有非代購項目可以有 `target === ''`，且此時只能有一筆分配。
- `quantity` 必須為 1 以上安全整數。
- v1–v6 的舊式文字數量可暫時以單一 `quantity: null` 分配搭配 `legacyQtyText` 還原；編輯儲存前必須轉為結構化數量。
- 所有分配數量的加總必須仍是安全整數。
- `unit` 為商品共用欄位，沿用最多 6 字與自訂單位規則。
- `ledgerLinks` 移到分配層；每筆 link 仍沿用 v63 的 append-only、最後一筆代表目前關聯及 `releasedAt` 契約。
- 卡片不保存 `totalQuantity`、`buyerCount`、`linkState` 或任何摘要字串。
- 部分拆分後的原始需求量不新增持久化欄位；需要顯示時，以 `splitGroupId`（未拆分則用 item ID）找出仍存在的同組卡片，按 canonical target 加總分配數量。

## 7. 分類與代購的責任分離

採買分類回答「買了什麼」，代購分配回答「替誰買」。

- 新增表單分類改為 `必買`、`伴手禮`、`生活用品`、`其他`。
- 從新項目選項移除 `代購`。
- 是否為代購只由分配的 `target` 判斷，與商品分類無關。
- 測試階段沒有需要保留的正式舊資料；v6 restore 若遇到 `category === '代購'`，轉為未分類，原 `buyFor` 則轉成代購分配。
- 轉入個人帳時，有對象的分配設為 `isProxy: true` 並帶入 `proxyTarget`；無對象分配設為 `isProxy: false`。
- Ledger 預設類別維持 `購物`，使用者可在送出前調整。Ledger 的代購彙總與實際個人花費仍只依 `isProxy` 判斷。

## 8. 卡片設計

卡片維持三層，但重新分配資訊：

1. **標題區**：品名、代購對象標籤、記帳狀態。
2. **屬性區**：分類標籤及數量摘要。
3. **地點區**：`DAY N · 站名` 或既有 pending／orphan 文字。

### 8.1 代購摘要

- 1 位：`幫阿寶買`
- 2 位：`幫阿寶、媽媽買`
- 3 位以上：只顯示前兩位及剩餘人數，例如 `幫阿寶、媽媽 +2 買`
- 完整名單只在詳情面板顯示。

代購標籤直接沿用行程卡 `.time` 的視覺 token：

- 文字 `var(--coral)`
- 背景 `var(--coral-bg)`
- 6px 圓角
- 無邊框
- 與品名位於同一個可換行的標題 flex 區塊

窄螢幕可自然換行，但不可把文字強制截斷成無法辨識的內容。

### 8.2 分類標籤

分類使用低於代購標籤的 sea／mint 系視覺，避免與風險、刪除或 orphan 狀態混淆。分類與數量位於第二層。

### 8.3 數量摘要

- 無代購對象：沿用 `2 盒`。
- 所有代購分配數量相同：`2 盒／人 · 共 6 盒`。
- 部分購買後分配數量不同：`共 4 盒 · 3 位`。
- 單位空白時省略單位，但保留數值與人數語意。
- 所有摘要必須走單一 helper，Today、卡片、詳情、Ledger note 與部分購買預覽不得各自拼接。

### 8.4 記帳狀態彙總

每筆分配先沿用 v63 resolver 推導 `linked`、`unlinked` 或 `unverified`，卡片再彙總：

- 全部 `unlinked`：`未記帳`
- 全部 `linked`：`已記帳`
- 一部分 linked、一部分 unlinked：`記帳 2／3`
- 任一分配為 `unverified`：優先顯示 `狀態待確認`

`unverified` 不得被計入可再次記帳的分配。

已買卡一律顯示上述狀態。待買卡只有在存在 linked 或 unverified 分配時才顯示狀態；全部 unlinked 的一般待買卡不顯示 `未記帳`，避免清單噪音。

### 8.5 點擊行為

- 點擊 `.shopping-item-body` 開啟採買詳情。
- checkbox、列上記帳按鈕與 `⋯` 選單必須阻止事件冒泡。
- selection mode 下點擊卡片仍只處理選取，不開詳情。
- 所有可點區域維持至少 40px，輸入欄維持 16px 以避免 iOS 自動縮放。

## 9. 新增與編輯表單

### 9.1 多選代購對象

- `幫誰買` chips 改為多選。
- 選取第一位後，數量標籤由 `數量` 改為 `每人數量`。
- 每次變更對象或數量，即時顯示 `已選 3 位` 及 `2 盒／人 · 共 6 盒`。
- 未選對象時不顯示每人與總量摘要。
- 保留既有「新增代購對象」輸入列。
- 新增對象沿用 Ledger 共用名單、正規化、去重與字數規則；成功後立即加入 chips 並自動選取。

表單送出時：

- 有 N 位對象：建立 N 筆相同數量的代購分配。
- 沒有對象：建立一筆 `target === ''` 的自己的分配。
- 第一版 UI 不提供逐人修改需求量，但資料已各自保存數量。

### 9.2 儲存並新增

新增模式顯示：

- 第一列：`取消`、`儲存`
- 第二列：全寬 `儲存並新增`

編輯模式只顯示 `取消`、`儲存`。

`儲存並新增` 必須先完整儲存目前項目；成功後：

- 保留分類。
- 保留行程站點。
- 數量重設為 1。
- 清空品名、單位、所有代購對象及新增對象輸入。
- 建立新的空白表單狀態並聚焦品名。

儲存失敗時不得清除或重設任何欄位。

### 9.3 編輯安全

- 待買且所有分配為 `unlinked`：可自由增刪對象與修改數量。
- 已買但尚未記帳：調整對象或數量須經明確確認，因為這是在修正已發生的購買事實。
- `linked` 或 `unverified` 分配：不可移除、改名或改數量；必須先完成「改回未記帳」或讓 resolver 確認已解除。
- 不受限制的商品共用欄位仍可修改，但不得藉此改寫帳本紀錄。

## 10. 部分購買

### 10.1 表單

- 無代購對象時沿用 v63 的單一「本次買到」數量。
- 有代購對象時自動列出原本每位對象。
- 每列顯示對象、剩餘需求及「本次買到」輸入。
- 每列允許 0 到該分配剩餘需求量。
- 至少一列必須大於 0。
- 畫面即時顯示本次買到總量與剩餘總量。

### 10.2 拆分

部分購買維持 v63 契約：

- 原 Shopping Item ID 成為已買部分。
- 剩餘部分使用新 Shopping Item ID，插入原項目正後方。
- 兩者沿用原 `createdAt` 與相同 `splitGroupId`。
- 已買部分寫入 `completedAt`；剩餘部分為空。
- 每筆分配各自拆成 purchased 與 remainder。
- purchased quantity 為 0 的對象不放入已買卡。
- remainder quantity 為 0 的對象不放入待買卡。
- 全部買齊時只更新原項目為已買，不建立空的剩餘卡。
- 已買與剩餘兩筆必須一次原子寫入。

部分購買仍禁止用於 `linked` 或 `unverified` 分配，避免拆開已存在或待確認的帳本關聯。

## 11. 採買詳情面板

詳情沿用現有 Ledger `ledger-sheet-overlay`、`ledger-detail-sheet` 及左右資訊列語言，內容包括：

- 品名
- 完整代購名單
- 分類
- 數量摘要
- 待買／已買狀態
- 完成時間
- 行程站點
- 記帳進度
- 每位對象的需求量、目前卡片數量與帳本狀態

每位對象的帳本列：

- `linked`：顯示目前有效帳本紀錄金額及 chevron，點擊後開啟該筆 `消費明細`。
- `unlinked`：顯示 `未記帳`。
- `unverified`：顯示 `狀態待確認`，不提供再次記帳。

若項目屬於 split group，詳情中的「原需求」由目前仍存在的同組卡片按對象加總；「此卡數量」則只讀目前卡片的 allocation。不得為了詳情另存 `originalQuantity` 或完整拆分樹。

關閉消費明細後必須返回原採買詳情，而不是關閉整個採買流程。

底部動作：

- `編輯`
- 若存在確定 `unlinked` 分配，顯示 `記帳未完成對象`
- 只把確定未記帳的分配帶入 Ledger，不包含 linked 或 unverified 分配

## 12. Shopping-to-Ledger

### 12.1 預填

- 一筆可記帳分配：開啟單筆消費表單。
- 多筆可記帳分配：開啟多品項消費表單。
- 每筆 Ledger draft item 對應一筆 allocation。
- 品名使用 Shopping Item 品名。
- 數量進 note，使用共用 quantity helper。
- Ledger 類別預設 `購物`。
- `target` 非空白時，該列 `isProxy: true` 並帶入 `proxyTarget`。
- `target` 空白時，該列 `isProxy: false`。
- Shopping 分類不得再決定 Ledger 的 proxy 狀態。

來源 `shoppingItemId` 與 `allocationId` 只存在 Ledger draft 的 ephemeral state，不加入 21 欄 Schema。

### 12.2 儲存交握

- 只在 Ledger 儲存成功後回寫 allocation links。
- 送出用 Ledger items 必須與來源 allocations 一對一對齊。
- 每筆 allocation 只保存自己的 `recordId`。
- 同批多品項可共用 `batchId`。
- record 數量、來源 ID、順序或唯一性不一致時，整批不回寫任何 link。
- Ledger 已成功但 link 回寫失敗時，保留 Ledger 事實並明確警告避免再次記帳。
- allocation link 回寫必須是單次原子 Shopping store write。

### 12.3 刪除、replacement 與解除

- 維持 v63 resolver，讀 `mergedLedgerRecords()`、durable queue、delivery bridge、replacement 與 tombstone。
- 找不到 record 不等於已刪除。
- 只有個人帳權威讀不到，或團體帳有有效 tombstone 且無 replacement，才可自動變回 unlinked。
- 手動「改回未記帳」只更新目標 allocation 最後一筆 active link 的 `releasedAt`，不刪除或修改 Ledger。

## 13. 刪除行為

刪除採買卡片永遠不操作 Ledger。

確認視窗依分配計數：

- linked allocations：說明採買項目會刪除，但原消費紀錄仍保留。
- unverified allocations：說明系統不會嘗試修改或刪除帳本紀錄。
- unlinked allocations：不需額外帳本警告。

批次刪除沿用相同計數與文案契約。

## 14. 備份與還原

- `PERSONAL_STATE_VERSION` 由 6 升為 7。
- v7 Shopping Item 輸出 `allocations[]`，不再輸出單一 `buyFor`、item-level `quantity` 或 item-level `ledgerLinks`。
- v1–v6 仍可還原：
  - `buyFor` 轉為 allocation target。
  - `quantity` 轉為 allocation quantity。
  - item-level `ledgerLinks` 移入該 allocation。
  - 無 `buyFor` 時建立一筆自己的分配。
  - `category === '代購'` 轉為未分類。
- 未知未來版本及錯誤型別必須明確拒絕。
- localStorage 日常讀取仍經 normalizer；下次寫回自然升格，不需另做整批啟動 migration。

## 15. 錯誤與邊界處理

- allocation 數量、總數、ID、target、ledgerLinks 任一不合法時，拒絕整個 item。
- 表單驗證失敗保留所有使用者輸入並聚焦第一個錯誤欄位。
- 部分購買輸入超過個別需求、全部為 0 或總量溢位時，不得寫入。
- 新增對象失敗不影響已選對象。
- `儲存並新增` 只有在第一筆儲存成功後才重設表單。
- linked record 無法讀取時顯示 unverified，不清 link、不自動寫 `releasedAt`。
- 點擊不存在的 Ledger record 時提示紀錄目前不可用，返回採買詳情並保留其上下文。
- nested sheet 的關閉、返回及 body scroll lock 必須成對恢復。

## 16. 測試與驗收

### 16.1 純函式與 store 測試

- allocations 正規化、唯一 allocation ID、target 去重與安全總數。
- v1–v6 到 v7 的備份還原及 v7 round trip。
- 未知未來備份版本拒絕。
- 無對象、單一對象、兩位、三位以上的摘要。
- 相同每人數量與部分拆分後不同數量的摘要。
- unlinked、partial linked、all linked、任一 unverified 的卡片狀態。
- 無對象與多對象的部分購買 split plan。
- 0、超量、全部買齊、安全整數上限及原子失敗。
- Ledger prefill 一 allocation 一列，proxy 狀態只由 target 決定。
- 只預填確定 unlinked allocations。
- Ledger link 交握成功、數量不一致、重複來源與原子回寫失敗。
- linked allocation 編輯限制與 release 行為。
- `儲存並新增` 只保留分類、站點並把數量重設為 1。

### 16.2 DOM 與 Browser QA

視窗寬度至少覆蓋 320、375、390px：

- 標題列在長品名與長代購名稱下可換行、無水平溢出。
- 代購標籤與行程 `.time` 的顏色、背景及圓角一致。
- 3 位以上顯示前兩位與 `+N`。
- 分類標籤、數量與地點維持正確資訊層級。
- checkbox、記帳、`⋯` 不誤開詳情。
- 詳情可開啟 Ledger 消費明細並正確返回。
- 多選 chips、新增對象、即時總數與儲存並新增重設正確。
- 部分購買逐人輸入、即時預覽與拆分結果正確。
- 最小 tap target 40px、輸入字級 16px、console error 0。
- 採買 overlay、nested sheet、popover、safe-area 與 scroll-only 行為不退化。

### 16.3 完整回歸

- 現有 Node 測試全部通過。
- `tools/check-doc-titles.js` 通過。
- Today 採買提醒、行程站點排序、孤兒三態、批次選取、刪除與記帳三態無回歸。
- Service Worker cache 於實作交付時升版；規格 commit 本身不升版。

## 17. 成功標準

- 使用者能在卡片第一眼辨識商品、代購對象及記帳狀態。
- 一張商品卡能管理多位對象並準確計算總數。
- 部分購買不會把數量分配給錯誤對象。
- 每位對象只會建立自己的 Ledger 消費紀錄。
- 任一不確定帳本狀態都不會造成重複記帳。
- 連續新增時不會誤帶上一筆的品名、單位或代購對象。
- 詳情面板能完成採買與帳本之間的核對閉環。
- 未來開放不同對象數量時不需再次修改持久化資料格式。
