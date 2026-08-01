# 結算一致性與引導式更正設計

> 狀態：2026-07-29 經 Bar 核准。本文定義領域與互動契約；尚未實作。

## 任務定位

本批修正一個已知的一致性風險：團體消費目前可在還款確認後繼續編輯或刪除，但 `settlement_confirm` 不指向個別消費，舊還款仍會套用在被改寫的新餘額上。刪除或替換原消費可能因此重新產生欠款，甚至產生反方向應收／應付。

本批採「歷史不可改寫＋引導式更正」：

- 已確認還款是不可撤回重算的歷史事實。
- 受保護的原收據不再直接編輯或刪除。
- 更正以 append-only 事件追加完整的新收據版本。
- 目前帳務投影採最新 canonical 版本；舊版本、舊還款與結算週期永久保留。
- 更正造成的新差額進入新的待結算餘額，不重開舊結算。

## 現況與根因

### 現有還款是淨額事件，不是逐筆銷帳

團體帳先以所有有效 `expense` 建立成員淨額，再由 `buildTransferSuggestions()` 產生 pairwise 還款建議。`settlement_claim` 記錄一筆建議還款，`settlement_confirm` 只指向 claim，不保存它依賴哪些消費。

因此現有系統只能準確表達：

- 某人向某人付款。
- 收款人確認已收到。
- 套用所有已確認還款後的目前淨額。

它不能準確回答：

- 某筆還款清掉了哪些消費。
- 某一筆消費是否被某一個 confirm 單獨結清。
- 修改一筆多人分攤消費時，只需撤銷哪一個 pair。

### 目前直接編輯／刪除會破壞已確認還款的計算基礎

團體編輯目前建立原紀錄墓碑，再追加 replacement；團體刪除則追加墓碑。`buildMemberBalances()` 使用墓碑與 replacement 後的目前費用，而 `applyConfirmedSettlements()` 仍套用既有還款確認。

例如：

1. A 代付 ¥900，A／B／C 三人均分。
2. B 與 C 各還 A ¥300，A 均已確認。
3. 全團淨額歸零。
4. 若直接把原消費改成 ¥600，舊的兩筆 ¥300 還款仍存在。
5. 新正確費用只應讓 B、C 各負擔 ¥200，因此 A 需各退回 ¥100。

正確結果不是撤銷舊還款，而是形成新的反向餘額。這要求保留歷史並追加更正事實。

## 核准詞彙與領域規則

### 還款確認與團體結算完成

- **還款確認**：收款方確認兩人間的一筆實際還款已收到。它是局部事實，不表示全團已無欠款。
- **團體結算完成**：套用全部有效還款確認後，每位成員在結算幣別的應收與應付均為零。
- 現有 `settlement_confirm` 的 canonical 使用者語意固定為「還款確認」，不得再把單一 confirm 稱為「全團已結清」。

### 歷史最終性

- canonical 還款確認一旦有效，就不因後續費用更正而撤銷、重開或重算。
- 全團歸零只關閉當前結算週期，不解除任何舊收據的保護。
- 更正造成非零餘額時，建立新的待結算餘額；舊週期仍保持完成。
- 現有 10 秒 confirm 復原仍沿用 ADR 0007：有效復原後該 confirm 不再是 canonical confirmed fact。若收據已存在有效更正版本鏈，仍永久維持更正保護。

### 更正保護切點

- 保護只作用於團體帳；個人帳維持目前直接編輯／刪除模型。
- 正式帳與 TEST 帳分開推導，不得互相鎖定。
- 每筆有效 canonical 還款確認以其 claim 的「建立位置」作為保護切點。建立位置由既有 `ledgerClientCreatedAt(record)` 解析 ID 內的 client-created timestamp，再以 `id` 破同毫秒平手。
- 不得使用 `record.time` 判斷收據是否位於切點前；expense 的 `time` 是可由使用者調整的消費發生時間，不是事件建立時間。
- 同 universe 內，只要收據任一原始品項的建立位置小於或等於任一有效切點，整張收據永久受保護。
- claim 後才建立的新收據仍可直接編輯／刪除，直到後續還款確認把它納入保護。
- 有效更正版本鏈本身也是永久保護證據；即使原 confirm 在既有 10 秒復原流程中失效，已更正收據也不得退回直接改寫模型。
- 若 canonical confirm、其 claim 或原始 expense 的 ID 無法解析建立時間，在該 universe 已有還款確認的前提下採 fail-closed：相關收據視為受保護，絕不因舊資料格式而誤開放直接改寫。

### 收據級更正

- 沒有 `batchId` 的消費以單筆為收據。
- 具有相同非空 `batchId` 的有效消費以整批為一張收據。
- 受保護收據只能整張更正；可修改、新增或移除品項。
- 付款人不可在更正中改變。
- 若付款人記錯，原付款人先作廢舊收據，再由實際付款人新增正確收據。
- 更正只允許原付款人建立，沿用 Ledger Ownership；此限制仍是防誤操作，不是伺服器授權邊界。

### 作廢與連續更正

- 「整張收據作廢」是更正，不是墓碑刪除。
- 作廢追加一個空的新版本，使目前帳務投影不再計入該收據，但保留原始收據、還款與稽核歷史。
- 每次更正以前一個最新 canonical 版本為基準。
- 更正後可再次更正；版本鏈依序保留原始版本、第一次更正、第二次更正等。
- 不允許回頭修改、刪除或從舊版本分叉後自動覆蓋目前版本。

## 核准資料模型

### 不新增欄位

所有更正事件沿用既有 Ledger 21 欄、Apps Script POST、Google Sheet、durable queue、delivery bridge、fast pull 與 CSV 正規化管線。本批不新增 Google Sheet 欄位、不修改 Apps Script API 或設定白名單。

新增三個 `recordType`：

| `recordType` | 用途 |
|---|---|
| `expense_correction_item` | 一般更正的新版本品項完整快照 |
| `expense_correction_commit` | 一般更正的完整提交標記 |
| `expense_void_commit` | 整張收據作廢的完整提交標記 |

### 一般更正版本

一個一般更正版本由一到多筆 item 加一筆 commit 組成。

`expense_correction_item`：

- `id`：每個品項的新事件 ID。
- `time`：新版本中該品項的消費發生時間，可由更正表單修正；不參與 correction commit 的事件先後判定。
- `member`：原收據付款人，所有 item 完全一致。
- `category`／`detail`／金額／`note`／`participants`／`payMethod`／`storeName`，以及 `inputCurrency`、`isTaxFree`、`priceMode`、`taxRate`、`couponAmount`：新版本的完整正確值；團體帳本不新增或借用代購欄位。
- `targetRecordId`：本版本 commit 的 `id`，允許向後引用。
- `batchId`：本版本 commit 的 `id`，作為 correction version ID。
- `replacesRecordId`：版本鏈最初受保護收據的 root anchor。

`expense_correction_commit`：

- `id`：本版本唯一 anchor，亦為同組 item 的 `batchId`。
- `time`：本次更正提交時間，供版本事件全序使用；在 durable queue 中最後入列，但不要求晚於 item 的消費發生時間。
- `member`：原收據付款人。
- `detail`：固定 `[更正收據]`。
- `note`：必填更正原因，trim 後 1–50 字。
- `participants`：JSON 字串陣列，依新版本顯示順序列出全部 correction item `id`；至少一筆、不可重複。
- `targetRecordId`：上一個 canonical 版本的 anchor。
- `replacesRecordId`：最初受保護收據的 root anchor。
- 金額為 0，`payMethod` 為空。

### 作廢版本

`expense_void_commit` 是單一 commit，不帶 item：

- `id`：本版本 anchor。
- `time`：建立時間。
- `member`：原收據付款人。
- `detail`：固定 `[作廢收據]`。
- `note`：必填作廢原因，trim 後 1–50 字。
- `targetRecordId`：上一個 canonical 版本的 anchor。
- `replacesRecordId`：最初受保護收據的 root anchor。
- `batchId`：等於自身 `id`。
- 金額為 0，`participants` 固定為 `[]`，`payMethod` 為空。

### 原始版本 anchor

- 單筆收據的 anchor 是該筆有效 expense `id`。
- 多品項收據的 anchor 是同一 `batchId` 中按 client-created timestamp ASC → `id` ASC 排序的第一筆有效 expense；不得依可編輯的消費發生時間排序。
- 更正版本的 anchor 一律是 commit `id`。
- 原始收據若曾在受保護前走過既有墓碑＋replacement 編輯，保護與更正從當時最新有效收據版本開始；更早的可變編輯歷史不會被重寫成 correction chain。

## Commit-last 原子可見性

`enqueueBatch()` 會先把整批持久化到 durable queue，再逐筆送出遠端。為避免其他裝置看到半張更正收據：

1. 先建立並入列全部 `expense_correction_item`；其 ID 記錄本次提交建立位置，`time` 仍保存品項的消費發生時間。
2. 最後入列 `expense_correction_commit`。
3. 本機只有 commit 的 `participants` 所列 item 全部存在且驗證通過時才投影新版本。
4. 遠端裝置只有讀到 commit 後，才依 `participants` 的 ID 清單與順序驗證同組 item。
5. 只有 item、沒有 commit 時完全忽略，不影響餘額。
6. commit 已存在，但所列 item 缺失、重複、格式錯誤，或另有未列入清單卻指向同一 commit 的 item 時 fail-closed，整組忽略並輸出診斷警告。
7. 作廢 commit 明確表示空版本，不得與「一般更正缺 item」混為一談。

由於 queue 依序送出且 commit 最後送出，正常遠端讀回不會在 commit 之前缺少已排在前方的 item；驗證仍保留 fail-closed 防線處理人工或異常資料。

## 更正推導與帳務投影

新增一個純推導邊界，輸入 `mergedLedgerRecords()` 的完整事件集，輸出：

- 每張收據的 root identity。
- 原始版本與所有有效更正版本。
- 最新 canonical 版本。
- 衝突／失效版本與診斷原因。
- 供帳務與 UI 使用的目前 expense-like snapshot。

推導順序：

1. 先沿用既有墓碑與 unprotected replacement 規則，取得原始有效 expense 收據。
2. 依 universe 分離正式／TEST 事件。
3. 驗證 correction item、commit、owner、root、previous anchor、reason 與完整性。
4. 從原始 anchor 建立 correction version graph。
5. 每個上一版本只允許一個 canonical child。
6. canonical child 以 commit `time ASC → id ASC` 選定。
7. losing child 與其 items 永遠 inert，不影響餘額、不自動升格。
8. 從 root 沿 canonical child 走到最新版本。
9. 一般更正以其 item 完整快照作為目前收據；作廢版本輸出空 snapshot。

所有帳務摘要、清單、搜尋、成員淨額與轉帳建議必須讀同一份目前 snapshot，不得各自重建更正規則。

`settlement_claim`／`settlement_confirm`／`settlement_reject` 與墓碑仍由 ADR 0007 的既有推導處理。計算目前餘額時：

1. 先由最新收據版本建立消費淨額。
2. 再套用全部有效 canonical 還款確認。

這會自然把「新版本 − 舊版本」表達成新的待結算差額，同時保留舊還款歷史。

## Canonical 更正與衝突

跨裝置可同時基於同一上一版本提交不同更正。規則固定為：

- 同一 previous anchor 的有效 commit，以 `time ASC → id ASC` 最小者為 canonical。
- 其他 commit 為 losing correction。
- losing correction 的 item、內容與原因保留供稽核，但不影響目前收據、餘額或版本計數。
- losing correction 永遠不因 canonical 後續作廢或再次更正而自動升格。
- 使用者若要採用 losing correction 的內容，必須從目前最新 canonical 版本重新開啟並建立新的 child。
- commit 指向非最新 canonical anchor 時視為 stale branch，保持 inert 並顯示衝突。

這與 ADR 0007 的 canonical claim／losing response 原則一致，所有裝置在輸入順序不同時仍收斂到相同結果；不宣稱 server-arrival ordering。

## 權限與驗證

### 建立權限

- 更正 actor 必須等於 root receipt 的原付款人，使用 `canonicalMemberName()` 比對。
- correction item 的 `member` 必須保留原付款人字串，不接受草稿覆寫。
- 多品項更正的所有 item 必須同付款人。
- 非原付款人的 commit 與 item fail-closed。

### 格式驗證

- 一般更正至少一個有效 item。
- 作廢 commit 不得帶 correction item。
- 原因必填且最多 50 字。
- 金額沿用非負安全整數規則。
- correction item 的 `participants` 沿用消費分攤的有效 JSON Array、非空、字串成員與 canonical 去重規則。
- 一般 commit 的 `participants` 是 item ID manifest：必須非空、ID 不重複，且所列順序就是新收據品項順序；不得套用成員名稱 canonicalization。
- 作廢 commit 的 `participants` 必須是 `[]`，且不得有 item 指向該 commit。
- item 與 commit 必須同 universe、同 version ID、同 root、同付款人。
- correction event 僅允許存在於團體帳本，不得寫入或投影為個人帳本紀錄。
- item 不可被當作一般 expense、刪除目標、編輯目標或 settlement record。
- commit 不可被直接編輯、刪除或作為一般消費顯示。

### Handler 守門

保護不能只靠隱藏按鈕：

- `canEditLedgerRecord()`／`canDeleteLedgerRecord()` 的團體路徑須納入 correction protection。
- `assertCanEditLedgerRecord()`／`assertCanDeleteLedgerRecord()` 再次守門。
- 批次 selection 若包含任一受保護收據，整批禁止走直接編輯／刪除。
- `buildSharedLedgerEditBatch()` 與 `createLedgerDeletion()` 的直接呼叫也必須拒絕受保護收據。
- 更正 builder 只接受最新 canonical 版本；舊 detail sheet 或 stale draft 儲存時拒絕並要求重新開啟。

## 使用者流程

### 未受保護收據

維持現況：

- 原付款人看到「編輯」與「刪除」。
- 編輯沿用墓碑＋replacement。
- 刪除沿用墓碑。

### 已受保護收據

- 移除直接「編輯」與「刪除」入口。
- 顯示「更正收據」。
- 更正 Sheet 載入最新 canonical 完整版本。
- 多品項一次開啟整張收據。
- 可修改、新增、移除品項。
- 付款人欄位唯讀且不可變。
- 提供「整張收據作廢」。
- 每次一般更正與作廢都要求原因。

### 儲存確認

送出前顯示：

- 舊總額 → 新總額。
- 被新增、移除或修改的品項。
- 受影響成員。
- 結算幣別的餘額變化。
- 固定提示「既有還款確認不會撤銷；本次差額將形成新的待結算餘額」。

若只有分類、店家、備註或其他非帳務欄位改變，差額可為 0；仍允許保存更正版本與原因。

### 歷史顯示

- 主清單只顯示最新 canonical 版本。
- 一般更正顯示「已更正 N 次」。
- 作廢版本不進一般消費合計，但保留一個可搜尋／查看的「已作廢」歷史入口。
- 明細顯示原始版本與各 canonical 更正的時間、操作者、原因及內容差異。
- losing correction 顯示「更正衝突・未套用」，不計入「已更正 N 次」。
- 更正使全團從 0 變成非 0 時，顯示「更正已產生新的待結算餘額」；不得把舊週期改成未完成。

## 離線、失敗與重新載入

- 全組事件必須先一次寫入 durable queue；queue write 失敗時 Sheet 保持開啟，不建立任何成功狀態。
- queue 成功即視為本機安全保存，UI 可從 merged queue 投影新版本並顯示「等待同步」。
- item 與 commit 重試沿用同一 `record.id`。
- delivery bridge 只有遠端讀回各自相同 ID 才清除。
- 重新載入後 queue／bridge 中的完整更正仍可投影。
- 部分遠端資料、非 JSON fast pull、CSV 延遲與 offline 均不得讓舊版本與新版本交替閃動或重複計入。
- 發現 losing correction 後顯示衝突，不靜默丟棄使用者輸入。

## 驗收標準

### 純邏輯與 Node 測試

至少覆蓋：

1. 無還款確認時仍可直接編輯／刪除。
2. canonical 還款確認後，claim 前建立的單筆收據受保護；補登舊日期與預先記錄未來日期都以 ID 建立位置判定，不讀 expense `time`。
3. 多品項任一 item 命中切點時整張受保護。
4. claim 後新收據仍可直接修改。
5. 正式／TEST universe 完全隔離。
6. confirm 10 秒有效復原後的保護推導，以及已有 correction chain 時永久保護。
7. 一般更正完整版本取代目前帳務投影但保留歷史。
8. 原始 → 更正一 → 更正二的版本鏈。
9. 作廢版本輸出空目前 snapshot。
10. 多人分攤與最大餘數在更正前後的差額正確。
11. JPY／TWD 兩欄與單一結算幣別的餘額正確。
12. item 無 commit 不套用。
13. commit 缺 item、原因、owner、root 或 previous anchor 時 fail-closed。
14. 兩個並行 child 以 `time,id` 穩定選 canonical。
15. 輸入順序任意排列仍得到相同 canonical 與餘額。
16. losing／stale correction 永不自動升格。
17. 非原付款人不可更正。
18. 更正不可改付款人。
19. UI 與 handler 雙重阻擋直接編輯／刪除。
20. 批次混入受保護收據時整批拒絕。
21. 零帳務差額更正仍保留正確版本與原因。
22. queue／bridge／remote 同 ID 去重，不重複套用版本。
23. 舊 settlement confirm、claim、history 不被更正流程修改或墓碑化。
24. 全團歸零後更正產生新餘額，但舊週期仍保持完成歷史。
25. claim／expense ID 無法解析 client-created timestamp 時 fail-closed，不得誤開放直接編輯／刪除。

### Browser QA

在 320×700、375×812、390×844 驗證：

- 未受保護與受保護收據的動作選單。
- 單筆及多品項更正 Sheet。
- 原因、差額摘要與付款人唯讀。
- 新增／移除品項。
- 整張作廢確認。
- 版本歷史與 losing conflict 顯示。
- 線上、離線 queue、重新載入與同步完成。
- 受保護 handler 無法從 stale DOM 繞過。
- 水平溢位 0、pageerror 0、console error 0。

## 不在本批範圍

- 不建立逐筆消費銷帳或 expense ID repayment mapping。
- 不重開、撤銷或重算既有還款確認。
- 不新增 Google Sheet 欄位、Apps Script API、設定鍵或後端唯一約束。
- 不修改個人帳編輯模型。
- 不允許更正改變付款人。
- 不新增參與者更正提案／付款人核准狀態機。
- 不提供伺服器身分授權或推播。
- 不自動合併或升格 losing correction。
- 不合併 `main` 或正式部署。

## 替代方案與不採原因

### 普通 expense＋`replacesRecordId`

雖可減少 `recordType`，但會與現有墓碑＋replacement 編輯混用；作廢需依賴零金額 sentinel，語意不明且容易被未來程式誤算。

### 自動產生反向普通消費

可少改餘額引擎，但會在帳本中暴露多筆技術性消費，難以還原完整正確收據、作廢與多次更正歷史。

### Reopen settlement

由於還款不指向消費，一筆多人分攤更動可能改變多個 pair 與轉帳路由，無法可靠只重開單一 confirm；撤銷已收到款項也違反歷史最終性。

## 文件影響

- `CONTEXT.md`：固定還款確認、團體結算完成、歷史最終性、引導式更正、收據級更正、作廢、更正版本鏈、保護切點與 canonical 更正。
- `adr/0007-settlement-handshake.md`：追加歷史最終性與更正事件決策，並移除單一 confirm 等於全團「已結清」的用詞混淆。
- `03_DATABASE.md`：實作時補三種更正事件的 21 欄映射。
- `09_SCHEMA_MAPPING.md`／`schema.js`／內嵌 schema：實作時擴充 `recordType` 契約，不新增欄位。
- `tests/README.md`：實作時登記新的結算一致性測試。
- `tasks/current.md`／`tasks/backlog.md`：本設計核准後改為待實作，不再標示核心方案待裁定。
