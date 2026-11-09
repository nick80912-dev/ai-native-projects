# 採買清單 C＋E＋G 第三批設計

## 任務定位

本批完成採買清單尚未實作的 C、E、G 三項：

1. Ledger 個人帳與團體帳切軌時，完整保留逐項草稿與採買來源身分。
2. 「必買」在各自站點群組內置頂，但不跨日、跨站或改寫 store order。
3. 採買新增／編輯改用獨立 Sheet，避免編輯深處項目時表單跳到清單頂端，並改善連續新增的輸入焦點。

本批採用「薄領域邊界＋共用 Sheet」方案：C 與 E 由純邏輯 helper 建立可測試契約，G 由單一暫存 UI controller 管理新增、編輯、返回位置與焦點。不得把資料規則散落到 renderer 或用 DOM 掃描推導 domain 狀態。

## 目標

- 採買來源開啟的 Ledger 草稿可安全切換個人／團體帳，不遺失代購、分攤或來源關聯。
- 從個人多品項草稿刪除某列後，該採買項目保持未記帳，可回到採買清單重新以團體帳建立消費。
- 各待買站點群組與 Today 提醒都先顯示「必買」，同層項目保持原順序。
- 從長清單深處編輯項目時，表單立即可見；儲存或取消後返回原項目脈絡。
- 「儲存並新增」成功後自動聚焦品名，手機鍵盤可直接接續輸入。

## 不在本批範圍

- 不修改 Ledger 21 欄、Apps Script、Google Sheet、Repository、Queue、Bridge、Retry、同步或結算。
- 不修改 Shopping Item `allocations[]`、`splitGroupId`、append-only `ledgerLinks[]` 或個人狀態備份 v7。
- 不把個人代購對象自動轉成團體分攤成員。
- 不新增採買卡片上的個人／團體帳選擇器；從採買進入 Ledger 時仍預設個人帳，再由表單切軌。
- 不改已買頁排序。
- 不把「部分購買」或「記帳」收進 `⋯`；兩者維持卡片高頻入口。
- 不部署正式站、不合併 `main`。

## 現況與根因

### C：切軌會重建不完整的草稿

`setLedgerDraftTrack(track)` 目前會呼叫 `createLedgerEntryDraft(track)` 建立新 draft，再手動複製部分共用欄位。多品項只以有限 seed 重建 item，因此會遺失：

- 個人帳逐項 `isProxy`／`proxyTarget`。
- 團體帳逐項 `participantMode`／`participants`。
- `sourceShoppingItemId`／`sourceShoppingAllocationId`。
- draft item 的既有身分 key。

Shopping-to-Ledger 單品項來源 ID 位於 draft root，多品項來源 ID 位於各 draft item。兩者都會經過同一切軌入口，因此本批以一致契約涵蓋單品項與多品項，不留下只修多品項的分歧。

### E：現有排序只到站點

待買頁與 Today 提醒已共用實際行程排序：

```text
dayIndex → 當日 items index
```

同一站點內仍完全沿用 store order，因此後建立的「必買」可能排在一般項目之後。renderer 尚無站內優先層。

### G：表單固定在清單頂端

Shopping list overlay 目前先輸出新增／編輯表單，再輸出工具列與群組。編輯清單深處卡片時，表單仍建立於清單最上方，造成：

- 使用者看不到剛開啟的表單，或被迫跳到頂端。
- 原站點、原卡片與捲動位置脈絡消失。
- 儲存或取消後必須重新尋找項目。

## 核准方案

## C｜個人／團體切軌的草稿保留

### 草稿資料分類

草稿包含三類資料：

1. 共用資料：品名、金額、分類、分類是否手動調整、備註、免稅狀態、來源 ID 與 draft item key。
2. 個人帳專屬資料：整單與逐項代購狀態，包括 `isProxy`／`proxyTarget`。
3. 團體帳專屬資料：整單與逐項分攤狀態，包括 `participantMode`／`participants`。

個人與團體專屬資料都是暫存草稿，不進另一帳本的 Ledger record，也不形成新的持久資料 schema。

### 切軌契約

- 切軌 helper 輸入完整 draft 與目標 track，回傳完整 next draft。
- 個人切到團體時，個人專屬資料只隱藏，不清除。
- 團體切回個人時，團體專屬資料只隱藏，不清除。
- 第一次進入尚未初始化的帳本模式時，才套用該模式既有預設值。
- 後續反覆切換必須恢復使用者先前在該模式輸入的值。
- 不把 `proxyTarget` 映射成 `participants`，也不反向映射。
- 切軌只改暫存 UI state，不寫 Ledger、不寫 Shopping。
- helper 驗證失敗時保留原 draft，不得留下半轉換狀態。

### 來源身分契約

- `sourceShoppingItemId` 與 `sourceShoppingAllocationId` 是 track-neutral 資料。
- 來源 ID 永遠跟著原 draft root 或原 draft item key，不依畫面 index 配對。
- 切軌、重新渲染、修改內容或切回原帳本後，來源 ID 不變。
- 刪除 draft item 時一併移除該列來源 ID，不得移到相鄰列。
- 手動新增 draft item 的來源 ID 為空。
- 空白列或被刪除列不進 `submissionItems`，也不回寫 Shopping link。
- 實際送出的每個 `submissionItem` 攜帶自身來源 ID，Ledger 持久化成功後才依其身分回寫對應 allocation。

### 送出契約

送出流程維持：

```text
驗證目前 track
→ 建立 submissionItems
→ 持久化 Ledger
→ 依 submissionItem 的來源 ID 原子回寫 Shopping links
```

- 個人帳送出只讀個人專屬欄位。
- 團體帳送出只讀團體專屬欄位。
- 隱藏帳本模式的資料不得進入 record，也不得阻擋目前模式儲存。
- 若使用者在個人多品項草稿刪除應改記團體帳的列，個人帳只儲存剩餘列；被刪除來源維持未記帳，之後可從採買清單重新開啟並切成團體帳。
- Shopping 來源切成團體帳後成功送出，仍須回寫正確 item／allocation link。

## E｜「必買」在站點群組內置頂

### 排序契約

完整顯示排序為：

```text
日期 → 站點 → 站內必買優先 → 原 store order
```

每個群組只做穩定分區：

```text
必買項目（原順序）
其他項目（原順序）
```

### 適用範圍

- 一般 `DAY N · 站點`。
- 行程站點待確認。
- 原行程站點已失效。
- 隨時可買。
- Today 提醒內的同站項目。

### 保護條件

- 日期、站點及特殊群組的整體順序維持既有契約。
- 不跨日、跨站或跨群組搬動項目。
- 必買彼此與非必買彼此都保持原 store order。
- 未知或非「必買」分類一律視為一般項目並保持原位置關係。
- helper 回傳新的顯示陣列，不修改輸入陣列、`createdAt` 或 localStorage。
- 已買頁維持平鋪與 store order。
- 待買頁與 Today 必須共用同一站內 helper，避免同一批項目出現兩種順序。

## G｜新增／編輯採買項目的獨立 Sheet

### 單一 Sheet controller

新增與編輯共用同一個 Shopping Item Sheet。暫存 UI state 至少包含：

```text
mode: add | edit
itemId
returnContext
returnScrollTop
savePending
```

此 state 只存在 UI session，不進 Shopping schema 或個人備份。

### 開啟入口

- 清單 `＋`：新增模式。
- 卡片 `⋯ → 編輯`：編輯模式。
- 採買明細「編輯」：暫停明細層後開啟編輯模式。

同一時間只允許一個可互動 Shopping form。背景清單必須 inert／不可捲動，不形成使用者無法返回的多層 overlay。表單離開使用明確的關閉或取消操作。

### 編輯返回規則

開啟編輯時記錄 item ID、來源入口、清單捲動位置與觸發控制項。

- 從清單卡片進入：儲存或取消後返回相同 item ID。
- 從採買明細進入：儲存或取消後返回更新後的明細。
- 項目位置未變時，恢復原捲動位置與焦點。
- 分類改成「必買」或站點變更時，依 item ID 找到重新排序後的新位置，將卡片捲入可視範圍並聚焦。
- 不以舊 DOM 節點或舊 array index 定位。
- 返回目標不存在時，退化聚焦至相應群組標題或清單標題，不拋錯、不跳到頁面頂端。

### 新增規則

一般「儲存」成功：

- 關閉 Sheet。
- 重新渲染清單。
- 將新 item ID 的卡片捲入可視範圍。

「儲存並新增」成功：

- Sheet 保持開啟。
- 保留分類與行程站點。
- 數量回到 `1`，單位回到 `個`。
- 品名、代購對象及其他單筆輸入依既有契約清空。
- DOM 更新完成後自動聚焦空白品名欄。
- 手機鍵盤保持開啟或立即喚回，使用者可直接輸入下一項。
- Toast 或成功提示不得搶走品名焦點。

此處的「品名自動聚焦」屬採買清單的「新增採買項目 → 儲存並新增」，不是 Ledger 單品項新增消費的「明細」欄。

### 卡片動作邊界

- 「部分購買」與「記帳」維持卡片高頻入口。
- 編輯、刪除等低頻操作維持在 `⋯`。
- 多選模式仍隱藏單卡操作，不新增編輯入口。
- G 只改新增／編輯表單位置與返回體驗，不回頭修改既有卡片動作決策。

## 元件與資料邊界

### Ledger draft transformer

預計新增或抽出純轉換 helper：

- 輸入完整 draft、目標 track 與該 track 的預設值。
- 回傳保留共用資料、雙軌暫存資料與來源身分的完整 next draft。
- 不直接存取 DOM、store、Ledger repository 或 Shopping store。

`setLedgerDraftTrack()` 只負責呼叫 helper、替換 draft 與重新渲染。

### Shopping group prioritizer

預計新增純排序 helper：

- 輸入單一群組 items。
- 以穩定分區回傳必買優先的顯示陣列。
- 由待買群組 renderer 與 Today reminder builder 共用。
- 不修改 group order 或 store。

### Shopping form controller

預計新增 UI 邊界：

- `open`：建立 add／edit session 並保存返回 context。
- `save`：依 mode 呼叫既有 store add／update。
- `saveAndAdd`：只在 add mode 使用，成功後重設並聚焦。
- `close`：依 return context 返回清單卡片或明細。

renderer 只依 controller state 輸出 Sheet，不掃描 DOM 判斷 sibling、item 身分或返回位置。

## 錯誤與退化

- 任一 draft 轉換驗證失敗時，切軌失敗且原 draft 完整保留。
- 隱藏 track 的欄位錯誤只在切回該 track 並儲存時顯示。
- Ledger 持久化成功、Shopping link 原子回寫失敗時，不回滾 Ledger、不再次建立消費；沿用既有降級警告並保持 Shopping 零部分寫入。
- 編輯送出前若 item ID 已不存在，整次更新失敗，不把草稿新增成另一筆。
- Shopping store write 失敗時，Sheet 保持開啟並保留完整草稿。
- `savePending` 期間停用儲存、儲存並新增及關閉，避免重複提交或半途關閉。
- 驗證失敗時不清空、不返回，聚焦第一個錯誤欄位。
- 自動聚焦若被特定瀏覽器阻擋，不影響已完成的 store write；Sheet 保持可操作。
- 排序 helper 收到空群組或未知分類時仍回傳完整穩定結果，不遺失資料。

## 測試

### 自動測試：C

- 單品項 Shopping 來源在個人／團體反覆切換後保留兩個來源 ID。
- 多品項各列使用不同代購狀態與來源 ID，反覆切軌後仍與原 draft item key 對應。
- 個人逐項 `isProxy`／`proxyTarget` 切到團體時隱藏、切回後還原。
- 團體逐項 `participantMode`／`participants` 切到個人時隱藏、切回後還原。
- 送出只寫目前 track 的專屬欄位。
- 刪除來源列後，其來源 ID 不轉移。
- 手動新增列的來源 ID 為空。
- 空白列過濾後，剩餘 submission item 仍回寫正確 allocation。
- Shopping 來源切成團體帳並儲存後，正確 allocation 顯示已記帳。
- link 回寫失敗時 Ledger 保留、Shopping 不部分寫入。

### 自動測試：E

- 同站交錯的普通／必買項目穩定分區。
- 必買彼此及非必買彼此保持 store order。
- 不跨日期、站點或特殊群組。
- 待確認、已失效與隨時可買套用相同規則。
- Today 與待買頁使用相同站內順序。
- 已買頁順序不變。
- 排序前後 `shoppingListStore.all()` 完全一致。

### 自動測試：G

- 新增與編輯共用獨立 Sheet。
- 編輯深處項目時，清單頂端不再建立表單。
- 取消或儲存後返回原 item ID。
- 修改成必買或更換站點後返回移動後的位置。
- 從明細編輯後返回更新後的明細。
- 「儲存並新增」保留分類／站點、重設其他欄位並聚焦品名。
- 一般儲存關閉 Sheet並定位新卡片。
- 驗證或 store write 失敗時保留草稿。
- `savePending` 阻止重複提交。
- 同時不得存在兩個可互動 Shopping form。
- 部分購買、記帳、`⋯`與卡片點擊的事件邊界不退化。

### Browser QA

以 320×700、375×812、390×844 驗證：

- Sheet、表單、卡片與 Toast 無水平溢出。
- 長清單深處的編輯、取消、儲存與跨站移動返回位置。
- 多筆連續新增後品名欄焦點正確。
- 個人／團體反覆切軌後畫面資料與送出結果一致。
- Today、待買與已買排序符合各自契約。
- console error／warning 為 0。

另由 Bar 以 iPhone Safari／PWA 真機確認「儲存並新增」後鍵盤保持或重新喚起，不需再次點擊品名。

## 版本與文件

- 實作與 Browser QA 完成後，Service Worker cache 只升一次；依目前版本預計 `okayama-trip-v67` → `okayama-trip-v68`。
- 更新 `CONTEXT.md` 的 Ledger 切軌、Shopping 排序與 form Sheet 契約。
- 更新 `07_CHANGELOG.md`，記錄三項根因、資料保護、錯誤退化與測試證據。
- 完成後更新 `tasks/backlog.md` 與 `tasks/current.md`。
- 本設計文件提交不升 Service Worker、不修改產品程式、不部署。

## 核准決策摘要

- C 採雙軌暫存、目前 track 單向送出，來源 ID 永遠 track-neutral。
- 採買來源仍預設開個人帳；要記團體帳時在 Ledger 表單切軌。
- 混合個人／團體的採買來源可先從個人多品項草稿刪除團體列，儲存個人列，再回採買清單重開該列並切團體帳。
- E 適用所有待買群組與 Today，已買頁不動。
- G 採獨立編輯 Sheet；新增與編輯共用 controller。
- 「儲存並新增」成功後自動聚焦採買品名並維持手機連續輸入。
