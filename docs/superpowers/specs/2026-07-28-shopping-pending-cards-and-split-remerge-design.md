# 採買待買卡片精簡與拆分安全回併設計

## 目標

1. 移除待買卡片內與站點群組標題重複的行程資訊，降低卡片高度。
2. 補齊部分購買的反向流程：當所有已買部分都取消且資料仍可安全重建時，自動合併回原本的一筆待買項目。

本批沿用 Shopping Item `allocations[]`、`splitGroupId`、append-only `ledgerLinks[]` 與個人狀態備份 v7，不新增欄位、不修改 Ledger 21 欄、Apps Script、Google Sheet、同步或結算。

## 現況與根因

### 待買卡片重複顯示站點

待買頁已依站點分組，群組標題顯示 `DAY N · 站點名稱`，特殊群組另有「行程站點待確認」、「原行程站點已失效」與「隨時可買」。每張卡片仍重複輸出地點列，資訊重複且增加高度。

已買頁則只在單一「已買」群組內平鋪，沒有站點群組脈絡，因此仍需要卡片地點列。

### 拆分後無反向合併

部分購買會把一筆項目拆為：

- 原 item ID：已買部分。
- 新 item ID：剩餘待買部分。
- 兩者共用 `splitGroupId`。

目前所有「移回待買」路徑只把 `done` 改為 `false`、清除 `completedAt`，並刻意保留 `splitGroupId`。Store 沒有反向合併操作，因此已買部分取消後會和原本的剩餘部分同時顯示為兩張待買卡。

## 核准方案

### 1. 待買與已買卡片資訊層級

待買頁卡片：

```text
品名
代購對象／記帳狀態／分類／數量
```

不輸出卡片地點列。位置由所在群組表達：

- 一般站點：`DAY N · 站點名稱`。
- 權威資料尚未完成：行程站點待確認＋既有提示。
- 原站點不存在：原行程站點已失效＋既有提示。
- 無綁定：隨時可買。

已買頁卡片維持：

```text
品名
代購對象／記帳狀態／分類／數量
行程站點
```

採買明細無論待買或已買都保留完整站點。Today 提醒本身已按站點分組，維持現況。一般模式與多選模式使用所在分頁的同一顯示規則。

卡片 renderer 必須依明確的頁面 context 決定是否顯示地點，不以 CSS 隱藏已經輸出的內容，避免無障礙樹仍讀出重複資訊。

### 2. 統一移回待買操作

以下路徑必須共用同一個 store/domain 操作，不得各自只 patch `done`：

- 已買卡片取消完成 checkbox。
- 已買頁批次「移回待買」。
- 完成項目後 Toast 的「復原」。

統一操作一次讀取目前 store、一次建立轉換計畫、一次 normalize 並原子寫入。單筆與批次不得產生不同的回併結果。

### 3. 安全自動合併條件

項目移回待買後，對每個受影響且非空的 `splitGroupId` 檢查。只有全部條件成立才自動合併：

1. 該 split group 的所有現存項目都為待買；只要仍有一筆已買，就代表部分購買事實仍存在，不合併。
2. group 中仍存在 `id === splitGroupId` 的原 item ID；找不到原項目時不猜測新的主項目。
3. 所有項目的品名、分類、單位、行程站點與 legacy 狀態一致。
4. 所有 allocation 都使用安全正整數數量，且逐對象與總數加總後仍為安全整數。
5. 所有 allocation 的 `ledgerLinks[]` 都是空陣列；包含已釋放的歷史 link 也視為有稽核歷史，不自動合併。
6. 對象名稱經既有 canonical 規則後可唯一對應；不得同時混用「自己」與代購對象，也不得產生重複對象。

這組條件刻意採保守策略：正常的「買 2、剩 3，接著取消已買」會回到 5；曾編輯、改站點、記帳或資料缺損的 group 不會被自動吞併。

### 4. 合併結果

符合安全條件時：

- 保留 `id === splitGroupId` 的原項目。
- 依 canonical 對象加總各筆 allocation 數量。
- 同一對象優先保留原項目上的 `allocationId`；原項目沒有該對象時，保留 store order 最前方 sibling 的既有 `allocationId`，不另造 ID。
- 保留原項目的 `createdAt`、品名、分類、單位與行程站點。
- 設為 `done:false`、`completedAt:''`。
- 清除 `splitGroupId`，表示目前已不再處於拆分狀態；再次部分購買時仍會以原 item ID 建立同值的新 group。
- 從同一次原子寫入中移除其餘 sibling items。

不符合條件時：

- 移回待買仍然成功。
- 不修改數量、allocation、ledgerLinks、splitGroupId 或 sibling items。
- 不部分合併、不猜測欄位、不把多張卡靜默變成一張。

### 5. 操作回饋

單筆成功回併：

```text
已移回待買並合併為 1 項
```

單筆無法安全回併：

```text
已移回待買；因內容或記帳狀態不同，未自動合併
```

批次操作應回報總移回數與合併組數，例如：

```text
已將 4 項移回待買，並合併 2 組
```

若批次中只有部分 group 無法合併，操作仍成功，Toast 另補「部分項目因內容或記帳狀態不同而保留分開」。不得為每個 group 連續跳出多個 Toast。

## 資料與元件邊界

預計新增以下純邏輯與 store 邊界：

- 回併資格 helper：輸入完整 items 與 split group，回傳是否可合併及不可合併原因代碼。
- 回併建構 helper：輸入已驗證安全的 group，回傳單一合併 item。
- 移回待買計畫 helper：輸入目前 items 與欲移回 IDs，回傳完整 next items、移回數、合併組數與未合併原因摘要。
- Shopping store 的原子 `moveBackToPending(ids)` 操作：normalize 與 write 各一次。
- UI 單筆、批次及 Toast 復原只負責呼叫 store 操作並格式化結果，不自行實作合併規則。

不得把合併邏輯放進 `renderShoppingItem()`，也不得用顯示層掃 DOM 決定 sibling。

## 錯誤與退化

- 任一目標 ID 不存在時，整次原子操作失敗，不寫入部分結果。
- normalize、數量加總或 allocation 驗證失敗時，整次操作不寫入。
- 有記帳或歷史 link 時只阻止合併，不阻止既有的移回待買；link 與 Ledger 紀錄維持原狀。
- 部分 group 仍有已買項目時不合併，也不顯示錯誤；這是仍存在部分購買事實的正常狀態。
- 不同站點、品名、分類或單位代表使用者已建立有意義的差異，不自動覆蓋。
- legacy 文字數量不嘗試解析或相加。
- 回併不得改變不在受影響 group 內的 store order。

## 測試

### 自動測試

- 待買正常站點、待確認、已失效與隨時可買卡都不輸出地點列。
- 待買群組標題與提示維持。
- 已買卡與待買／已買明細仍輸出站點。
- Today 提醒維持站點群組摘要。
- 5 拆成已買 2＋待買 3，取消已買後合併回待買 5。
- 多對象逐人拆分後依 canonical 對象正確加總。
- 原 item 不含某位對象時，保留 sibling 的既有 allocation ID。
- group 仍有任一已買項目時不合併。
- 品名、分類、單位或站點不同時不合併。
- 任一 allocation 有 active、unverified、released 或其他歷史 ledger link 時不合併。
- legacy、數量溢位、重複 canonical 對象或缺原 item 時不合併。
- 安全合併後清除 `splitGroupId`／`completedAt`，保留原 ID／`createdAt`。
- checkbox、批次移回與 Toast 復原走同一個 store 操作。
- 批次多 group 只 normalize／write 一次，且回報正確計數。
- 任一目標 ID 不存在或 write 失敗時資料完全不變。

### Browser QA

以 320×700、375×812、390×844 驗證：

- 待買卡片高度縮短且站點群組仍容易辨識。
- 已買卡片與明細的站點資訊仍完整。
- 單人與多人部分購買後，取消全部已買可安全回到單一卡片。
- 仍有已買 sibling、改站點、改單位及已記帳時維持多張並顯示正確 Toast。
- 批次移回跨多個 split group 的計數與畫面結果。
- 多選工具列、卡片點擊與明細入口不退化。
- 文件、採買 panel、卡片與 Toast 無水平溢出。
- console error／warning 為 0。

## 版本與文件

- 實作與 Browser QA 通過後升一次 Service Worker cache；若與同批新增消費 UI 一起交付，不得重複升版。
- 更新 `CONTEXT.md` 的待買／已買卡片位置規則與 split remerge 契約。
- 在 `07_CHANGELOG.md` 記錄根因、安全條件、未合併保護與測試證據。
- `splitGroupId` 與 `allocations[]` schema 未變，個人狀態備份維持 v7。

## 不在本批範圍

- 不改部分購買的正向拆分數學。
- 不合併仍有已買 sibling 的 group。
- 不合併任何有記帳歷史或欄位差異的 group。
- 不解析 legacy 數量。
- 不改 Ledger link resolver、Ledger 紀錄或解除關聯語意。
- 不改待買站點群組排序或必買置頂。
- 不部署正式站或合併 `main`。
