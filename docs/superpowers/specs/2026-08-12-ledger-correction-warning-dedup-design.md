# Ledger 更正警告去重設計

> 狀態：2026-08-12 經 Bar 核准方向，待書面規格確認。

## 問題

Ledger 更正投影會在摘要、餘額與畫面重繪等路徑中重複執行。當輸入含無效更正事件時，投影每次都把相同診斷寫入 AppLog。2026-08-11 的除錯報告因此由四則唯一警告各重複 25 次，填滿 100 筆 session buffer，擠掉其他可能更重要的診斷。

無效事件目前會 fail-closed，不會進入有效收據或帳務。這個行為正確，不能為了減少日誌而放寬。

## 核准目標

- 同一頁面 session 內，Ledger 更正投影的完全相同預設警告只寫入 AppLog 一次。
- 不同訊息仍各自保留一筆。
- 清除 AppLog 不重設去重狀態；重新載入 App 後才重新開始記錄。
- 無效更正仍 fail-closed，帳務投影與餘額完全不變。
- 顯式傳入投影的 `warnFn` 每次仍收到完整警告，供測試或一次性診斷使用。

## 不採方案

### AppLog 全域去重

不採。Repository、Sync、Parser 等分類中的重複錯誤可能代表持續故障；全域去重會改變其他診斷契約並隱藏頻率資訊。

### 快取 Ledger 更正投影

不採。Queue、delivery bridge、CSV 與 fast pull 都會改變事件集合；新增快取失效邏輯的風險遠高於本次單純的日誌問題。

## 設計

在 `ledgerCorrectionDataWarning(message)` 的預設輸出邊界維護一個只存在記憶體中的 exact-message 集合：

1. 第一次看到某訊息時，記入集合並送往 `AppLog.data()`；沒有 AppLog 時沿用 `console.warn()` fallback。
2. 同一 session 再次看到完全相同訊息時直接返回。
3. `deriveLedgerCorrectionProjection(records, warnFn)` 若收到顯式 `warnFn`，維持現況，每次投影都完整呼叫 callback；不經過 session 去重。
4. `AppLog.clear()` 只清除可見 buffer，不清除此 Ledger 專用集合。

去重鍵使用完整訊息，因此不同 record ID、root ID 或原因不會互相覆蓋。

## 測試

在既有 `tests/ledger-settlement-correction.test.js` 加入附件事件形狀的回歸情境：三筆 commit 找不到 root，一筆 correction item 找不到完整 commit。

- 對同一事件集合連續執行兩次預設投影。
- 修正前確認四種訊息各出現兩次，測試因預期一次而失敗。
- 修正後確認四種不同訊息各只進 AppLog 一次。
- 另外以顯式 `warnFn` 連續投影，確認 callback 仍收到兩輪完整警告。
- 既有投影測試繼續確認無效事件不進有效 expense。

## 影響與回滾

預計只修改 `index.html` 的 Ledger 診斷 helper、相關 Node 測試，以及必要版本與交付文件。不修改 Schema、Apps Script、Google Sheet、通用 AppLog 或 Ledger 資料。

若需回滾，撤回 Ledger 專用 warn-once helper 與對應測試即可；若已發布 PWA，依既有規範使用下一個版本號 forward bump，不倒退版本或刪除 Service Worker。
